/**
 * OAuth callback route.
 *
 * Failure modes are handled explicitly at each stage so the browser gets a
 * meaningful error instead of a generic 500:
 *
 *   400 — missing code/state params, or openId absent from user info
 *   502 — upstream OAuth server failed (token exchange or user info fetch)
 *   500 — DB write or session signing failed
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code  = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({
        error: "invalid_request",
        message: "Both 'code' and 'state' query parameters are required",
      });
      return;
    }

    // ── Stage 1: Exchange authorization code for access token ────────────────
    let tokenResponse;
    try {
      tokenResponse = await sdk.exchangeCodeForToken(code, state);
    } catch (error) {
      console.error("[OAuth] Token exchange failed:", error);
      res.status(502).json({
        error: "token_exchange_failed",
        message: "Failed to exchange authorization code for access token",
      });
      return;
    }

    // ── Stage 2: Fetch user info ─────────────────────────────────────────────
    let userInfo;
    try {
      userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
    } catch (error) {
      console.error("[OAuth] User info fetch failed:", error);
      res.status(502).json({
        error: "user_info_failed",
        message: "Failed to retrieve user information from OAuth provider",
      });
      return;
    }

    if (!userInfo.openId) {
      console.error("[OAuth] openId missing from user info response:", userInfo);
      res.status(400).json({
        error: "missing_open_id",
        message: "OAuth provider did not return a user identifier (openId)",
      });
      return;
    }

    // ── Stage 3: Persist user and create session ─────────────────────────────
    try {
      await db.upsertUser({
        openId:      userInfo.openId,
        name:        userInfo.name || null,
        email:       userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name:        userInfo.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Session creation or DB write failed:", error);
      res.status(500).json({
        error: "session_creation_failed",
        message: "Authentication succeeded but session could not be established",
      });
    }
  });
}
