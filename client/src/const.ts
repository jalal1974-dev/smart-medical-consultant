export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Canonical public site URL used for SEO tags, share links, and printed
// report footers. Override per deployment with VITE_APP_URL; falls back to
// the current origin in the browser so the site works on any domain.
export const SITE_URL: string =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://smartmedcon-jsnymp6w.manus.space");

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
