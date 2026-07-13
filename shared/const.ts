export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;

/**
 * Human-readable messages used in tRPC error responses.
 * Do NOT use these strings for programmatic checks — use AUTH_CODES from
 * shared/_core/errors instead.
 */
export const UNAUTHED_ERR_MSG = "Please log in to continue";
export const NOT_ADMIN_ERR_MSG = "You do not have the required permission";
