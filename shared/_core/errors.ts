/**
 * Shared HTTP error helpers.
 *
 * Every error carries a numeric `statusCode` for HTTP responses AND a
 * stable string `code` that callers can switch on without parsing message text.
 *
 * Auth-specific codes (AUTH_* prefix) are used by sdk.ts / trpc.ts so that
 * the frontend can distinguish "not logged in" from "wrong role" without
 * relying on human-readable message strings.
 */

// ── Structured error codes ──────────────────────────────────────────────────

export const AUTH_CODES = {
  /** No session cookie present */
  NO_SESSION:        "AUTH_NO_SESSION",
  /** Cookie present but JWT is invalid / expired */
  INVALID_SESSION:   "AUTH_INVALID_SESSION",
  /** JWT valid but user not found in DB and OAuth sync failed */
  SYNC_FAILED:       "AUTH_SYNC_FAILED",
  /** JWT valid, user not found in DB after sync attempt */
  USER_NOT_FOUND:    "AUTH_USER_NOT_FOUND",
  /** Authenticated but insufficient role */
  FORBIDDEN:         "AUTH_FORBIDDEN",
} as const;

export type AuthCode = (typeof AUTH_CODES)[keyof typeof AUTH_CODES];

// ── Base error class ────────────────────────────────────────────────────────

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// ── Generic HTTP convenience constructors ───────────────────────────────────

export const BadRequestError  = (msg: string, code?: string) => new HttpError(400, msg, code);
export const UnauthorizedError = (msg: string, code?: string) => new HttpError(401, msg, code);
export const ForbiddenError   = (msg: string, code?: string) => new HttpError(403, msg, code);
export const NotFoundError    = (msg: string, code?: string) => new HttpError(404, msg, code);

// ── Auth-specific constructors (preferred over raw ForbiddenError in auth paths) ──

export const AuthNoSessionError  = () =>
  new HttpError(401, "No session cookie", AUTH_CODES.NO_SESSION);

export const AuthInvalidSessionError = () =>
  new HttpError(401, "Invalid or expired session", AUTH_CODES.INVALID_SESSION);

export const AuthSyncFailedError = () =>
  new HttpError(401, "Failed to sync user from OAuth provider", AUTH_CODES.SYNC_FAILED);

export const AuthUserNotFoundError = () =>
  new HttpError(401, "Authenticated user not found", AUTH_CODES.USER_NOT_FOUND);

export const AuthForbiddenError = () =>
  new HttpError(403, "Insufficient permissions", AUTH_CODES.FORBIDDEN);
