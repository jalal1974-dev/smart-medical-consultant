# Deploying Smart Medical Consultant Without Manus

This guide inventories every Manus dependency in the codebase and gives the
replacement path for running the app on independent infrastructure.

## Current Manus dependencies

| # | Feature | File(s) | Manus service used | Replacement |
|---|---------|---------|--------------------|-------------|
| 1 | LLM (AI analysis, symptom checker, content generation) | `server/_core/llm.ts` | Forge API — OpenAI-compatible `/v1/chat/completions`, model `gemini-2.5-flash` | Any OpenAI-compatible provider. Easiest: **OpenRouter** — set `BUILT_IN_FORGE_API_URL=https://openrouter.ai/api` and change the model at `llm.ts` (`gemini-2.5-flash` → `google/gemini-2.5-flash`). Or Google AI Studio's OpenAI-compatible endpoint directly. |
| 2 | Voice transcription | `server/_core/voiceTranscription.ts` | Forge `/llm/v1/audio/transcriptions`, model `whisper-1` | OpenAI (`/v1/audio/transcriptions`) or Groq (same API, cheaper). Adjust the path prefix (`llm/` segment is Manus-specific). |
| 3 | File storage (uploads, generated PDFs) | `server/storage.ts` | Forge storage proxy `/v1/storage/upload` | **AWS S3 or Cloudflare R2**. `@aws-sdk/client-s3` + presigner are already in `package.json` — rewrite `storagePut`/`storageGet` with `PutObjectCommand` + `getSignedUrl`. R2 has a free tier and S3-compatible API. |
| 4 | Email notifications (receipts, password reset, report-ready) | `server/emailNotifications.ts` → `server/_core/notification.ts` | Manus owner-notification API — **note: patient emails currently only notify the owner, patients never receive real email** | Integrate **Resend** (simplest) or SendGrid/AWS SES. Replace `notifyOwner` calls in `emailNotifications.ts` with real sends to `patientEmail`. This is required for password reset to work at all. |
| 5 | Login via Manus OAuth portal | `server/_core/oauth.ts`, `server/_core/sdk.ts`, `client/src/const.ts` (`getLoginUrl`) | `OAUTH_SERVER_URL` / `VITE_OAUTH_PORTAL_URL` | Local username/password auth (`auth.register` / `auth.loginLocal`) already works independently — sessions are self-signed JWTs using `JWT_SECRET`. Hide the OAuth login button, or later add Google OAuth (passport/arctic). `OAUTH_SERVER_URL` is required at startup by `env.ts`; either relax it there or set a placeholder value. |
| 6 | Slides generation | `server/_core/slidesGeneration.ts`, `server/_core/manusSlides.ts` | Forge `/slides/generate` (Manus-proprietary) | No drop-in replacement. Options: keep generating PPTX locally via `pptxgenjs` (already used in `server/pptxGeneration.ts`), or disable the slides feature flag until reworked. |
| 7 | Image generation (infographics) | `server/_core/imageGeneration.ts` | Forge image endpoint | OpenAI Images API, fal.ai, or Replicate — adjust endpoint + auth. |
| 8 | Maps | `client/src/components/Map.tsx` | `VITE_FRONTEND_FORGE_API_URL` proxy for Google Maps | Direct Google Maps JS API key (`VITE_GOOGLE_MAPS_KEY`) — optional, only if the map is actually used. |
| 9 | Dev runtime plugin | `vite.config.ts` | `vite-plugin-manus-runtime` + `.manus*.computer` allowed hosts | Safe to remove the plugin and host entries for independent deploys (dev-only convenience). |
| 10 | Database | `server/db.ts` (`DATABASE_URL`) | Manus-provisioned MySQL | Any managed MySQL: PlanetScale, Railway, DigitalOcean, or Aiven. Run `pnpm db:push` against the new DB, then the one-off `apply-*-migration.mjs` scripts if the schema drifted. |

## Environment variables for an independent deployment

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com            # canonical site URL (emails, links)
VITE_APP_URL=https://your-domain.com       # client-side canonical URL (SEO tags)
JWT_SECRET=<long random string>            # session signing — REQUIRED
VITE_APP_ID=smart-medical-consultant       # any stable non-empty id — session tokens embed it
DATABASE_URL=mysql://user:pass@host:3306/smc
BUILT_IN_FORGE_API_URL=https://openrouter.ai/api   # or other OpenAI-compatible base
BUILT_IN_FORGE_API_KEY=<provider api key>
OAUTH_SERVER_URL=https://placeholder.invalid       # unused once OAuth button removed
CALLMEBOT_API_KEY=<optional, WhatsApp admin pings>
# Email provider (after Resend/SES integration):
RESEND_API_KEY=<key>
```

> `VITE_APP_ID` must be non-empty: `verifySession` rejects tokens whose `appId`
> claim is empty, so a missing value breaks all logins silently.

## Recommended hosting

The app is a single Node/Express server that also serves the built client
(`pnpm build` → `dist/` + static assets; `pnpm start` runs it).

- **Railway** (easiest): GitHub repo → deploy; add a MySQL plugin; set env vars. ~$5/mo.
- **Render**: same pattern, external MySQL needed.
- **Hetzner/DigitalOcean VPS + Coolify**: cheapest long-term, more setup.

Vercel/Netlify are NOT a fit as-is (long-running Express server + 3-minute AI
request timeouts).

## Launch checklist

1. Buy domain, point DNS at the host.
2. Provision MySQL, set `DATABASE_URL`, run `pnpm db:push`.
3. Set all env vars above; generate a fresh `JWT_SECRET`.
4. Replace storage proxy with S3/R2 (item 3) — required for file uploads.
5. Integrate real email sending (item 4) — required for password reset.
6. Point LLM + transcription at OpenRouter/OpenAI (items 1–2).
7. Hide/remove the Manus OAuth login button; keep local login.
8. Update `client/public/robots.txt` and `sitemap.xml` to the new domain.
9. `pnpm build && pnpm start` locally against production env to smoke-test.
10. Deploy, then verify: register → login → create consultation → password reset email.
