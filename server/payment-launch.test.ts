/**
 * payment-launch.test.ts
 *
 * Tests for launch-critical payment and consultation flows:
 *
 * 1. Frozen payment checkout (LAUNCH_FREE_MODE = true)
 *    - createDraft throws METHOD_NOT_SUPPORTED
 *    - confirmConsultationPayment throws METHOD_NOT_SUPPORTED
 *    - subscription.purchaseConsultations throws METHOD_NOT_SUPPORTED
 *
 * 2. Payment idempotency guards
 *    - updatePayment: calling twice on the same consultation returns alreadyCompleted=true
 *    - updatePayment: calling on a consultation owned by another user throws FORBIDDEN
 *    - updatePayment: free consultation (already completed) returns alreadyCompleted=true immediately
 *
 * 3. Free-quota exhaustion
 *    - Creating a second free consultation after quota is exhausted throws BAD_REQUEST
 *    - Admin is exempt from the free-quota check
 *    - freeConsultationsUsed increments after each free consultation
 *
 * 4. Confirmation page backend contract (consultation.get)
 *    - Returns full consultation data for the owner
 *    - Returns isFree=true and paymentStatus=completed for free consultations
 *    - Throws NOT_FOUND for non-existent consultations
 *    - Throws FORBIDDEN for cross-user access
 *    - Admin can access any consultation
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// ── Context factories ──────────────────────────────────────────────────────

function createUserContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `payment-test-user-${userId}`,
      email: `paytest${userId}@example.com`,
      name: "Payment Test User",
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

function createAdminContext(userId = 99999): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `payment-test-admin-${userId}`,
      email: `payadmin${userId}@example.com`,
      name: "Payment Test Admin",
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

/** Create a real DB user and return it */
async function createDbUser(seed: number) {
  await db.upsertUser({
    openId: `payment-launch-user-${seed}`,
    name: "Payment Launch Test",
    email: `paylaunch${seed}@example.com`,
    loginMethod: "manus",
    role: "user",
  });
  const user = await db.getUserByOpenId(`payment-launch-user-${seed}`);
  if (!user) throw new Error("User not created");
  return user;
}

// ── 1. Frozen payment checkout ─────────────────────────────────────────────

describe("Frozen payment checkout (LAUNCH_FREE_MODE = true)", () => {
  it("consultation.createDraft throws METHOD_NOT_SUPPORTED", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    await expect(
      caller.consultation.createDraft({
        patientName: "Frozen Draft Patient",
        patientEmail: "frozen@example.com",
        symptoms: "Testing that paid draft creation is frozen during launch",
        preferredLanguage: "en" as const,
      })
    ).rejects.toMatchObject({
      code: "METHOD_NOT_SUPPORTED",
      message: expect.stringContaining("frozen"),
    });
  });

  it("consultation.confirmConsultationPayment throws METHOD_NOT_SUPPORTED", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    await expect(
      caller.consultation.confirmConsultationPayment({
        consultationId: 999999,
        paypalOrderId: `ORDER-FROZEN-${seed}`,
      })
    ).rejects.toMatchObject({
      code: "METHOD_NOT_SUPPORTED",
      message: expect.stringContaining("frozen"),
    });
  });

  it("subscription.purchaseConsultations throws METHOD_NOT_SUPPORTED", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    await expect(
      caller.subscription.purchaseConsultations({
        paypalOrderId: `ORDER-PURCHASE-${seed}`,
        plan: "basic",
      })
    ).rejects.toMatchObject({
      code: "METHOD_NOT_SUPPORTED",
      message: expect.stringContaining("frozen"),
    });
  });

  it("free consultation flow (consultation.create with isFree=true) is NOT frozen", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    // The free path must remain open during LAUNCH_FREE_MODE
    const result = await caller.consultation.create({
      patientName: "Free Launch Patient",
      patientEmail: "freelaunch@example.com",
      symptoms: "Testing that free consultation is not frozen during launch",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    expect(result.success).toBe(true);
    expect(result.consultationId).toBeGreaterThan(0);
  });
});

// ── 2. Payment idempotency guards ──────────────────────────────────────────

describe("Payment idempotency guards", () => {
  it("updatePayment: second call on same consultation returns alreadyCompleted=true", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    // Create a non-free consultation (paymentStatus=pending)
    const { consultationId } = await caller.consultation.create({
      patientName: "Idempotency Patient",
      patientEmail: "idem@example.com",
      symptoms: "Testing updatePayment idempotency guard",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: false,
    });

    const orderId = `PAYPAL-IDEM2-${seed}`;

    // First call — completes the payment
    const first = await caller.consultation.updatePayment({
      consultationId,
      paymentId: orderId,
      status: "completed",
    });
    expect(first.success).toBe(true);
    expect(first.alreadyCompleted).toBe(false);

    // Second call — idempotency guard fires
    const second = await caller.consultation.updatePayment({
      consultationId,
      paymentId: orderId,
      status: "completed",
    });
    expect(second.success).toBe(true);
    expect(second.alreadyCompleted).toBe(true);

    // DB state must not be corrupted
    const consultation = await db.getConsultationById(consultationId);
    expect(consultation?.paymentStatus).toBe("completed");
    expect(consultation?.paymentId).toBe(orderId);
  });

  it("updatePayment: free consultation (already completed) returns alreadyCompleted=true", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    // Free consultations are created with paymentStatus=completed immediately
    const { consultationId } = await caller.consultation.create({
      patientName: "Free Idem Patient",
      patientEmail: "freeidem@example.com",
      symptoms: "Testing that free consultations block updatePayment",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    // Verify it was created as completed
    const fresh = await db.getConsultationById(consultationId);
    expect(fresh?.paymentStatus).toBe("completed");
    expect(fresh?.isFree).toBe(true);

    // Attempting to update payment on an already-completed consultation
    const result = await caller.consultation.updatePayment({
      consultationId,
      paymentId: `PAYPAL-FREE-${seed}`,
      status: "completed",
    });
    expect(result.success).toBe(true);
    expect(result.alreadyCompleted).toBe(true);

    // paymentId must remain null — the guard prevented the update
    const after = await db.getConsultationById(consultationId);
    expect(after?.paymentId).toBeNull();
  });

  it("updatePayment: throws FORBIDDEN when called for another user's consultation", async () => {
    const seedA = Math.floor(Math.random() * 1_000_000);
    const seedB = Math.floor(Math.random() * 1_000_000);
    const userA = await createDbUser(seedA);
    const userB = await createDbUser(seedB);

    const callerA = appRouter.createCaller(createUserContext(userA.id));
    const callerB = appRouter.createCaller(createUserContext(userB.id));

    // User A creates a non-free consultation
    const { consultationId } = await callerA.consultation.create({
      patientName: "Cross User Patient",
      patientEmail: "crossuser@example.com",
      symptoms: "Testing cross-user updatePayment is forbidden",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: false,
    });

    // User B tries to update User A's payment — must be FORBIDDEN
    await expect(
      callerB.consultation.updatePayment({
        consultationId,
        paymentId: `PAYPAL-CROSS-${seedB}`,
        status: "completed",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("updatePayment: non-existent consultationId throws FORBIDDEN (not NOT_FOUND, for security)", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    // The procedure returns FORBIDDEN for both "not found" and "wrong owner"
    // to avoid leaking consultation existence to unauthorized callers
    await expect(
      caller.consultation.updatePayment({
        consultationId: 9_999_999,
        paymentId: `PAYPAL-GHOST-${seed}`,
        status: "completed",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── 3. Free-quota exhaustion ───────────────────────────────────────────────

describe("Free-quota exhaustion", () => {
  it("rejects a second free consultation after the quota is exhausted", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    // First consultation — should succeed
    const first = await caller.consultation.create({
      patientName: "Quota Test Patient",
      patientEmail: "quota@example.com",
      symptoms: "Testing free quota exhaustion",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });
    expect(first.success).toBe(true);

    // Exhaust the quota by incrementing the counter
    await db.incrementFreeConsultationsUsed(user.id);

    // Second consultation — quota is now exhausted
    await expect(
      caller.consultation.create({
        patientName: "Quota Test Patient 2",
        patientEmail: "quota2@example.com",
        symptoms: "Testing that second free consultation is rejected",
        medicalHistory: "",
        preferredLanguage: "en" as const,
        isFree: true,
      })
    ).rejects.toThrow();
  });

  it("freeConsultationsUsed increments after creating a free consultation", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    const before = await db.getUserById(user.id);
    const usedBefore = before?.freeConsultationsUsed ?? 0;

    await caller.consultation.create({
      patientName: "Counter Test Patient",
      patientEmail: "counter@example.com",
      symptoms: "Testing that free consultation counter increments",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    const after = await db.getUserById(user.id);
    expect((after?.freeConsultationsUsed ?? 0)).toBe(usedBefore + 1);
  });

  it("admin is exempt from the free-quota check", async () => {
    // Admins can create consultations regardless of free quota
    // (they use the same create procedure but the admin exemption skips the quota check)
    const seed = Math.floor(Math.random() * 1_000_000);
    await db.upsertUser({
      openId: `quota-admin-${seed}`,
      name: "Quota Admin",
      email: `quotaadmin${seed}@example.com`,
      loginMethod: "manus",
      role: "admin",
    });
    const adminUser = await db.getUserByOpenId(`quota-admin-${seed}`);
    if (!adminUser) throw new Error("Admin user not created");

    // Exhaust the free quota for this admin user
    await db.incrementFreeConsultationsUsed(adminUser.id);
    await db.incrementFreeConsultationsUsed(adminUser.id);

    const adminCaller = appRouter.createCaller(createAdminContext(adminUser.id));

    // Admin should still be able to create a consultation
    const result = await adminCaller.consultation.create({
      patientName: "Admin Quota Exempt",
      patientEmail: "adminquota@example.com",
      symptoms: "Testing that admin is exempt from free quota check",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    expect(result.success).toBe(true);
    expect(result.consultationId).toBeGreaterThan(0);
  });
});

// ── 4. Confirmation page backend contract ─────────────────────────────────

describe("Confirmation page backend contract (consultation.get)", () => {
  it("returns full consultation data with isFree=true and paymentStatus=completed for free consultations", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    const { consultationId } = await caller.consultation.create({
      patientName: "Confirmation Test Patient",
      patientEmail: "confirm@example.com",
      symptoms: "Testing confirmation page data contract",
      medicalHistory: "No history",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    const consultation = await caller.consultation.get({ id: consultationId });

    // Core fields for the confirmation page
    expect(consultation.id).toBe(consultationId);
    expect(consultation.isFree).toBe(true);
    expect(consultation.paymentStatus).toBe("completed");
    expect(consultation.patientName).toBe("Confirmation Test Patient");
    expect(consultation.patientEmail).toBe("confirm@example.com");
    // Arrays should be parsed (not raw JSON strings)
    expect(Array.isArray(consultation.medicalReports)).toBe(true);
    expect(Array.isArray(consultation.labResults)).toBe(true);
    expect(Array.isArray(consultation.xrayImages)).toBe(true);
    expect(Array.isArray(consultation.otherDocuments)).toBe(true);
  });

  it("throws NOT_FOUND for a non-existent consultation ID", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    await expect(caller.consultation.get({ id: 9_999_999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN when a user tries to view another user's consultation", async () => {
    const seedA = Math.floor(Math.random() * 1_000_000);
    const seedB = Math.floor(Math.random() * 1_000_000);
    const userA = await createDbUser(seedA);
    const userB = await createDbUser(seedB);

    const callerA = appRouter.createCaller(createUserContext(userA.id));
    const { consultationId } = await callerA.consultation.create({
      patientName: "Owner Patient",
      patientEmail: "owner@example.com",
      symptoms: "Testing cross-user consultation.get access",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    const callerB = appRouter.createCaller(createUserContext(userB.id));
    await expect(callerB.consultation.get({ id: consultationId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admin can access any user's consultation via consultation.get", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const userCaller = appRouter.createCaller(createUserContext(user.id));

    const { consultationId } = await userCaller.consultation.create({
      patientName: "Admin View Patient",
      patientEmail: "adminview@example.com",
      symptoms: "Testing admin can view any consultation",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    const adminCaller = appRouter.createCaller(createAdminContext());
    const consultation = await adminCaller.consultation.get({ id: consultationId });
    expect(consultation.id).toBe(consultationId);
    expect(consultation.userId).toBe(user.id);
  });

  it("confirmation page shows no payment retry state: paymentStatus is never 'failed' for free consultations", async () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const user = await createDbUser(seed);
    const caller = appRouter.createCaller(createUserContext(user.id));

    const { consultationId } = await caller.consultation.create({
      patientName: "No Retry Patient",
      patientEmail: "noretry@example.com",
      symptoms: "Testing that free consultations never have failed payment status",
      medicalHistory: "",
      preferredLanguage: "en" as const,
      isFree: true,
    });

    const consultation = await caller.consultation.get({ id: consultationId });

    // Free consultations must never show a failed/pending payment state
    // (this would incorrectly prompt the user to retry payment on the confirmation page)
    expect(consultation.paymentStatus).not.toBe("failed");
    expect(consultation.paymentStatus).not.toBe("pending");
    expect(consultation.paymentStatus).toBe("completed");
  });
});
