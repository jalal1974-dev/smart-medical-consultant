/**
 * Environment variable access with startup validation.
 *
 * CRITICAL vars (marked below) cause the server to throw at module-load time
 * if they are missing or empty, so misconfigured deployments fail loudly
 * instead of silently degrading at runtime.
 *
 * NON-CRITICAL vars default to "" and are checked at call-site where needed.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    // In test environments some vars may be intentionally absent — warn only.
    if (process.env.NODE_ENV === "test") {
      console.warn(`[ENV] WARNING: required env var ${key} is not set (test mode)`);
      return "";
    }
    throw new Error(
      `[ENV] Missing required environment variable: ${key}. ` +
      `Set it in your .env file or deployment secrets before starting the server.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const ENV = {
  // ── Critical: server will not start without these ──────────────────────────
  cookieSecret:   requireEnv("JWT_SECRET"),
  oAuthServerUrl: requireEnv("OAUTH_SERVER_URL"),
  forgeApiUrl:    requireEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey:    requireEnv("BUILT_IN_FORGE_API_KEY"),

  // ── Non-critical: missing degrades specific features, not auth ──────────────
  appId:          optionalEnv("VITE_APP_ID"),
  // Canonical public site URL used in emails (password reset, report links).
  // Set APP_URL in production; falls back to the legacy Manus deployment URL.
  appUrl:         optionalEnv("APP_URL", "https://smartmedcon-jsnymp6w.manus.space"),
  databaseUrl:    optionalEnv("DATABASE_URL"),
  ownerOpenId:    optionalEnv("OWNER_OPEN_ID"),
  isProduction:   process.env.NODE_ENV === "production",
};
