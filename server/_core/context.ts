/**
 * tRPC request context factory.
 *
 * Authentication is *optional* at this layer — public procedures work without
 * a session. Protected/admin procedures enforce auth via their own middleware
 * (see trpc.ts).
 *
 * Auth failure handling:
 *   - AUTH_NO_SESSION / AUTH_INVALID_SESSION → ctx.user = null (normal for public routes)
 *   - AUTH_SYNC_FAILED / AUTH_USER_NOT_FOUND → ctx.user = null + warning logged
 *   - Any unexpected error → ctx.user = null + error logged
 */

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { AUTH_CODES } from "@shared/_core/errors";
import type { HttpError } from "@shared/_core/errors";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    const httpErr = error as HttpError;
    const code = httpErr?.code;

    if (
      code === AUTH_CODES.NO_SESSION ||
      code === AUTH_CODES.INVALID_SESSION
    ) {
      // Expected: unauthenticated request hitting a public procedure.
      // No log needed — this is the normal path for anonymous visitors.
    } else if (
      code === AUTH_CODES.SYNC_FAILED ||
      code === AUTH_CODES.USER_NOT_FOUND
    ) {
      // Unexpected: valid JWT but user is missing from DB.
      // Log a warning so ops can investigate without breaking the request.
      console.warn(`[Auth] Session valid but user unavailable (${code}):`, httpErr?.message);
    } else {
      // Truly unexpected error (network, DB down, etc.)
      console.error("[Auth] Unexpected error during authentication:", error);
    }

    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
