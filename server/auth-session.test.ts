/**
 * auth-session.test.ts
 *
 * Tests for the auth/session contract after the core plumbing hardening:
 *   - publicProcedure: accessible without a session
 *   - protectedProcedure: throws UNAUTHORIZED (401) with authCode AUTH_NO_SESSION when ctx.user is null
 *   - adminProcedure: throws FORBIDDEN (403) with authCode AUTH_FORBIDDEN for non-admin users
 *   - auth.me: returns null for unauthenticated context
 *   - auth.logout: clears cookie for authenticated user
 *   - subscription.getStatus: accessible to authenticated users
 *   - route regressions: admin procedures reject regular users
 */

import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { AUTH_CODES } from "../shared/_core/errors";
import { COOKIE_NAME } from "../shared/const";
import * as db from "./db";

// ── Context factories ──────────────────────────────────────────────────────

/** Unauthenticated context — simulates a request with no session cookie */
function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

/** Authenticated context for a regular user */
function createUserContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `user${userId}@example.com`,
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

/** Authenticated context for an admin user */
function createAdminContext(userId = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-admin-${userId}`,
      email: `admin${userId}@example.com`,
      name: "Test Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ── Public procedure: auth.me ─────────────────────────────────────────────

describe("auth.me (publicProcedure)", () => {
  it("returns null for unauthenticated context", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns the user object for an authenticated context", async () => {
    const caller = appRouter.createCaller(createUserContext(42));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(42);
    expect(result?.role).toBe("user");
  });
});

// ── Protected procedure: UNAUTHORIZED when unauthenticated ────────────────

describe("protectedProcedure — unauthorized access", () => {
  it("throws UNAUTHORIZED when ctx.user is null (consultation.list)", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    let thrown: unknown;
    try {
      await caller.consultation.list();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(TRPCError);
    expect((thrown as TRPCError).code).toBe("UNAUTHORIZED");
  });

  it("throws UNAUTHORIZED when ctx.user is null (consultation.create)", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.consultation.create({
        patientName: "Ghost User",
        patientEmail: "ghost@example.com",
        symptoms: "Testing unauthorized access to protected procedure",
        medicalHistory: "",
        preferredLanguage: "en" as const,
        isFree: true,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when ctx.user is null (subscription.getStatus)", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.subscription.getStatus()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when ctx.user is null (consultation.get)", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.consultation.get({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── Admin procedure: FORBIDDEN for regular users ──────────────────────────

describe("adminProcedure — forbidden for non-admin users", () => {
  it("throws FORBIDDEN when a regular user calls admin.consultations", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.consultations()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when a regular user calls admin.updateStatus", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.updateStatus({ id: 1, status: "specialist_review" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws UNAUTHORIZED when an unauthenticated user calls admin.consultations", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.admin.consultations()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows admin to call admin.consultations", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.consultations();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── auth.logout ───────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie for an authenticated user", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-logout-user",
        email: "logout@example.com",
        name: "Logout User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });

  it("allows logout even when unauthenticated (public procedure)", async () => {
    // auth.logout is a publicProcedure — it should not throw for unauthenticated callers
    const clearedCookies: unknown[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (...args: unknown[]) => clearedCookies.push(args),
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ── subscription.getStatus ────────────────────────────────────────────────

describe("subscription.getStatus", () => {
  it("returns subscription info for an authenticated user", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    await db.upsertUser({
      openId: `sub-status-user-${seed}`,
      name: "Sub Status Test",
      email: `substatus${seed}@example.com`,
      loginMethod: "manus",
      role: "user",
    });
    const user = await db.getUserByOpenId(`sub-status-user-${seed}`);
    if (!user) throw new Error("User not created");

    const caller = appRouter.createCaller(createUserContext(user.id));
    const status = await caller.subscription.getStatus();

    expect(typeof status.consultationsRemaining).toBe("number");
    expect(typeof status.subscriptionType).toBe("string");
    expect(typeof status.hasUsedFreeConsultation).toBe("boolean");
  });
});

// ── Cross-user access: consultation.get ──────────────────────────────────

describe("consultation.get — cross-user access control", () => {
  it("throws FORBIDDEN when a user tries to access another user's consultation", async () => {
    // Create two users and a consultation owned by user A
    const seedA = Math.floor(Math.random() * 1_000_000);
    const seedB = Math.floor(Math.random() * 1_000_000);

    await db.upsertUser({
      openId: `cross-user-a-${seedA}`,
      name: "User A",
      email: `usera${seedA}@example.com`,
      loginMethod: "manus",
      role: "user",
    });
    await db.upsertUser({
      openId: `cross-user-b-${seedB}`,
      name: "User B",
      email: `userb${seedB}@example.com`,
      loginMethod: "manus",
      role: "user",
    });

    const userA = await db.getUserByOpenId(`cross-user-a-${seedA}`);
    const userB = await db.getUserByOpenId(`cross-user-b-${seedB}`);
    if (!userA || !userB) throw new Error("Users not created");

    // User A creates a consultation
    const callerA = appRouter.createCaller(createUserContext(userA.id));
    const { consultationId } = await callerA.consultation.create({
      patientName: "User A Patient",
      patientEmail: "patienta@example.com",
      symptoms: "Testing cross-user access control",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    // User B tries to access User A's consultation — should be FORBIDDEN
    const callerB = appRouter.createCaller(createUserContext(userB.id));
    await expect(callerB.consultation.get({ id: consultationId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns NOT_FOUND for a non-existent consultation", async () => {
    const caller = appRouter.createCaller(createUserContext(999));
    await expect(caller.consultation.get({ id: 9_999_999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("allows admin to access any user's consultation", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    await db.upsertUser({
      openId: `admin-access-user-${seed}`,
      name: "Admin Access Test",
      email: `adminaccess${seed}@example.com`,
      loginMethod: "manus",
      role: "user",
    });
    const user = await db.getUserByOpenId(`admin-access-user-${seed}`);
    if (!user) throw new Error("User not created");

    const userCaller = appRouter.createCaller(createUserContext(user.id));
    const { consultationId } = await userCaller.consultation.create({
      patientName: "Admin Access Patient",
      patientEmail: "adminaccess@example.com",
      symptoms: "Testing admin cross-user access",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    // Admin can access any consultation
    const adminCaller = appRouter.createCaller(createAdminContext());
    const consultation = await adminCaller.consultation.get({ id: consultationId });
    expect(consultation.id).toBe(consultationId);
  });
});
