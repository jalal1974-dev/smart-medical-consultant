/**
 * tRPC initialization and procedure factories.
 *
 * Procedure hierarchy:
 *   publicProcedure     — no auth required
 *   protectedProcedure  — requires a valid session (ctx.user is non-null)
 *   adminProcedure      — requires a valid session AND role === "admin"
 *
 * Auth errors use tRPC's built-in codes so clients get consistent HTTP status
 * codes without parsing message strings:
 *   UNAUTHORIZED (401) — not logged in
 *   FORBIDDEN    (403) — logged in but wrong role
 */

import { AUTH_CODES } from "@shared/_core/errors";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  /**
   * Error formatting: attach the structured auth code to the tRPC error data
   * so the client can switch on `error.data.authCode` instead of message text.
   */
  errorFormatter({ shape, error }) {
    const authCode = (error.cause as any)?.code as string | undefined;
    return {
      ...shape,
      data: {
        ...shape.data,
        // Only attach authCode when it is one of our structured AUTH_CODES
        ...(authCode && Object.values(AUTH_CODES).includes(authCode as any)
          ? { authCode }
          : {}),
      },
    };
  },
});

export const router = t.router;

// ── Public: no authentication required ──────────────────────────────────────
export const publicProcedure = t.procedure;

// ── Protected: valid session required ───────────────────────────────────────
const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
      // Attach the structured code so errorFormatter can surface it
      cause: { code: AUTH_CODES.NO_SESSION },
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ── Admin: valid session + admin role required ───────────────────────────────
const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
      cause: { code: AUTH_CODES.NO_SESSION },
    });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
      cause: { code: AUTH_CODES.FORBIDDEN },
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(requireAdmin);
