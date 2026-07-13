/**
 * SDKServer — session signing, JWT verification, and request authentication.
 *
 * Auth failure taxonomy (all throw HttpError with a structured code):
 *
 *   AUTH_NO_SESSION      (401) — no cookie present
 *   AUTH_INVALID_SESSION (401) — cookie present but JWT is invalid/expired
 *   AUTH_SYNC_FAILED     (401) — JWT valid, user absent from DB, OAuth re-sync failed
 *   AUTH_USER_NOT_FOUND  (401) — JWT valid, user absent from DB, sync succeeded but still missing
 *   AUTH_FORBIDDEN       (403) — role check (used by tRPC middleware, not here)
 *
 * Callers (context.ts) catch these and set ctx.user = null for public procedures.
 * Protected procedures re-throw via tRPC's UNAUTHORIZED/FORBIDDEN codes.
 */

import {
  AuthInvalidSessionError,
  AuthNoSessionError,
  AuthSyncFailedError,
  AuthUserNotFoundError,
} from "@shared/_core/errors";
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

// ── Utilities ────────────────────────────────────────────────────────────────

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

// ── OAuth API paths ──────────────────────────────────────────────────────────

const EXCHANGE_TOKEN_PATH       = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH        = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

// ── OAuthService ─────────────────────────────────────────────────────────────

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    // ENV.oAuthServerUrl is already validated by env.ts (fails fast if missing).
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
  }

  private decodeState(state: string): string {
    return atob(state);
  }

  async getTokenByCode(code: string, state: string): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };
    const { data } = await this.client.post<ExchangeTokenResponse>(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }

  async getUserInfoByToken(token: ExchangeTokenResponse): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(GET_USER_INFO_PATH, {
      accessToken: token.accessToken,
    });
    return data;
  }
}

// ── SDKServer ─────────────────────────────────────────────────────────────────

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({ baseURL: ENV.oAuthServerUrl, timeout: AXIOS_TIMEOUT_MS });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  // ── Login method normalization ─────────────────────────────────────────────

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  // ── OAuth token exchange ───────────────────────────────────────────────────

  /**
   * Exchange OAuth authorization code for access token.
   * Throws an Axios error if the upstream call fails — callers should wrap
   * in try/catch and return a structured HTTP error to the browser.
   */
  async exchangeCodeForToken(code: string, state: string): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token.
   * Normalizes the `loginMethod` field from platform enum values.
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return { ...(data as any), platform: loginMethod, loginMethod } as GetUserInfoResponse;
  }

  // ── Session signing / verification ────────────────────────────────────────

  private parseCookies(cookieHeader: string | undefined): Map<string, string> {
    if (!cookieHeader) return new Map();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret(): Uint8Array {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  /**
   * Create a signed JWT session token for a Manus user openId.
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      { openId, appId: ENV.appId, name: options.name ?? "" },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  /**
   * Verify a session cookie value.
   *
   * Returns the decoded payload on success.
   * Throws a structured HttpError on failure:
   *   - AuthNoSessionError      if cookieValue is absent
   *   - AuthInvalidSessionError if JWT is malformed, expired, or missing fields
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string }> {
    if (!cookieValue) {
      throw AuthNoSessionError();
    }

    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      payload = result.payload as Record<string, unknown>;
    } catch (error) {
      console.warn("[Auth] JWT verification failed:", String(error));
      throw AuthInvalidSessionError();
    }

    const { openId, appId, name } = payload;
    if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
      console.warn("[Auth] Session payload missing required fields:", { openId, appId, name });
      throw AuthInvalidSessionError();
    }

    return { openId, appId, name };
  }

  async getUserInfoWithJwt(jwtToken: string): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = { jwtToken, projectId: ENV.appId };
    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return { ...(data as any), platform: loginMethod, loginMethod } as GetUserInfoWithJwtResponse;
  }

  /**
   * Authenticate an incoming Express request.
   *
   * Reads the session cookie, verifies the JWT, looks up the user in the DB,
   * and optionally re-syncs from OAuth if the user is missing.
   *
   * Throws a structured HttpError on any auth failure so callers can handle
   * each case explicitly:
   *   - AuthNoSessionError      — no cookie
   *   - AuthInvalidSessionError — bad/expired JWT
   *   - AuthSyncFailedError     — DB miss + OAuth re-sync failed
   *   - AuthUserNotFoundError   — DB miss + sync succeeded but user still absent
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);

    // verifySession throws AuthNoSessionError or AuthInvalidSessionError
    const session = await this.verifySession(sessionCookie);

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(session.openId);

    // User absent from DB — attempt OAuth re-sync once
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] OAuth re-sync failed:", error);
        throw AuthSyncFailedError();
      }
    }

    if (!user) {
      throw AuthUserNotFoundError();
    }

    // Refresh last-seen timestamp (fire-and-forget — don't block the request)
    db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt }).catch(err =>
      console.warn("[Auth] Failed to update lastSignedIn:", err)
    );

    return user;
  }
}

export const sdk = new SDKServer();
