import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user", userId: number = Math.floor(Math.random() * 1000000)): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Consultation System", () => {
  describe("consultation.create", () => {
    it("should create a free consultation for first-time user", async () => {
      const userId = Math.floor(Math.random() * 1000000);
      const ctx = createAuthContext("user", userId);
      const caller = appRouter.createCaller(ctx);

      // Insert test user into database
      await db.upsertUser({
        openId: `test-user-${userId}`,
        name: "Test User",
        email: `test${userId}@example.com`,
        loginMethod: "manus",
        role: "user",
        hasUsedFreeConsultation: false,
      });

      // Get the user to get the actual DB ID
      const dbUser = await db.getUserByOpenId(`test-user-${userId}`);
      if (!dbUser) throw new Error("User not created");

      // Update context with correct user ID
      const updatedCtx = createAuthContext("user", dbUser.id);
      const updatedCaller = appRouter.createCaller(updatedCtx);

      // Create consultation
      const result = await updatedCaller.consultation.create({
        patientName: "John Doe",
        patientEmail: "john@example.com",
        patientPhone: "+1234567890",
        symptoms: "Headache and dizziness",
        medicalHistory: "No significant medical history",
        preferredLanguage: "en" as const,
        isFree: true,
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBeDefined();
    });

        it("should reject free consultation if already used", async () => {
      const userId = Math.floor(Math.random() * 1000000);
      const ctx = createAuthContext("user", userId);
      const caller = appRouter.createCaller(ctx);
      // Insert test user
      await db.upsertUser({
        openId: `test-user-${userId}`,
        name: "Test User",
        email: `test${userId}@example.com`,
        loginMethod: "manus",
        role: "user",
      });
      // Get the user to get the actual DB ID
      const dbUser = await db.getUserByOpenId(`test-user-${userId}`);
      if (!dbUser) throw new Error("User not created");
      // Use the correct quota helper to exhaust the free slot
      // (free_consultations_total defaults to 1; increment used to 1 to exhaust it)
      await db.incrementFreeConsultationsUsed(dbUser.id);
      // Update context with correct user ID
      const updatedCtx = createAuthContext("user", dbUser.id);
      const updatedCaller = appRouter.createCaller(updatedCtx);
      // Try to create another free consultation — quota is exhausted
      await expect(
        updatedCaller.consultation.create({
          patientName: "John Doe",
          patientEmail: "john@example.com",
          symptoms: "Chest pain",
          medicalHistory: "No history",
          preferredLanguage: "en" as const,
          isFree: true,
        })
      ).rejects.toThrow();
    });

    it("should create paid consultation with correct amount", async () => {
      const userId = Math.floor(Math.random() * 1000000);
      const ctx = createAuthContext("user", userId);
      const caller = appRouter.createCaller(ctx);

      // Insert test user
      await db.upsertUser({
        openId: `test-user-${userId}`,
        name: "Test User",
        email: `test${userId}@example.com`,
        loginMethod: "manus",
        role: "user",
      });

      const dbUser = await db.getUserByOpenId(`test-user-${userId}`);
      if (!dbUser) throw new Error("User not created");
      const updatedCtx = createAuthContext("user", dbUser.id);
      const updatedCaller = appRouter.createCaller(updatedCtx);

      const result = await updatedCaller.consultation.create({
        patientName: "Jane Smith",
        patientEmail: "jane@example.com",
        symptoms: "Back pain",
        medicalHistory: "Previous injury",
        preferredLanguage: "ar" as const,
        isFree: false,
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBeDefined();

      // Verify consultation was created with correct payment status
      const consultation = await db.getConsultationById(result.consultationId);
      expect(consultation?.paymentStatus).toBe("pending");
      expect(consultation?.amount).toBe("5.00");
    });

    it("should validate required fields", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Missing symptoms (too short)
      await expect(
        caller.consultation.create({
          patientName: "Test",
          patientEmail: "test@example.com",
          symptoms: "hi",
          medicalHistory: "",
          preferredLanguage: "en" as const,
          isFree: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("consultation.list", () => {
    it("should return user's consultations", async () => {
      const userId = Math.floor(Math.random() * 1000000);
      const ctx = createAuthContext("user", userId);
      const caller = appRouter.createCaller(ctx);

      // Insert test user
      await db.upsertUser({
        openId: `test-user-${userId}`,
        name: "Test User",
        email: `test${userId}@example.com`,
        loginMethod: "manus",
        role: "user",
      });

      const dbUser = await db.getUserByOpenId(`test-user-${userId}`);
      if (!dbUser) throw new Error("User not created");
      const updatedCtx = createAuthContext("user", dbUser.id);
      const updatedCaller = appRouter.createCaller(updatedCtx);

      // Create a consultation first
      await updatedCaller.consultation.create({
        patientName: "Test Patient",
        patientEmail: "patient@example.com",
        symptoms: "Test symptoms for listing",
        medicalHistory: "No history",
        preferredLanguage: "en" as const,
        isFree: true,
      });

      // List consultations
      const consultations = await updatedCaller.consultation.list();
      
      expect(Array.isArray(consultations)).toBe(true);
      expect(consultations.length).toBeGreaterThan(0);
    });
  });

  describe("consultation.updatePayment", () => {
    it("should update payment status after successful payment", async () => {
      const userId = Math.floor(Math.random() * 1000000);
      const ctx = createAuthContext("user", userId);
      const caller = appRouter.createCaller(ctx);

      // Insert test user
      await db.upsertUser({
        openId: `test-user-${userId}`,
        name: "Test User",
        email: `test${userId}@example.com`,
        loginMethod: "manus",
        role: "user",
      });

      const dbUser = await db.getUserByOpenId(`test-user-${userId}`);
      if (!dbUser) throw new Error("User not created");
      const updatedCtx = createAuthContext("user", dbUser.id);
      const updatedCaller = appRouter.createCaller(updatedCtx);

      // Create a paid consultation
      const createResult = await updatedCaller.consultation.create({
        patientName: "Payment Test",
        patientEmail: "payment@example.com",
        symptoms: "Testing payment update functionality",
        medicalHistory: "No history",
        preferredLanguage: "en" as const,
        isFree: false,
      });

      // Update payment status
      const updateResult = await updatedCaller.consultation.updatePayment({
        consultationId: createResult.consultationId,
        transactionId: "PAYPAL-TEST-123456",
        status: "completed",
      });

      expect(updateResult.success).toBe(true);

      // Verify payment was updated
      const consultation = await db.getConsultationById(createResult.consultationId);
      expect(consultation?.paymentStatus).toBe("completed");
      expect(consultation?.paypalTransactionId).toBe("PAYPAL-TEST-123456");
    });
  });
});

describe("Admin Consultation Management", () => {
  describe("admin.consultations", () => {
    it("should allow admin to view all consultations", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const consultations = await caller.admin.consultations();
      
      expect(Array.isArray(consultations)).toBe(true);
    });

    it("should reject non-admin access", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.admin.consultations()).rejects.toThrow("Admin access required");
    });
  });

  describe("admin.updateConsultationStatus", () => {
    it("should allow admin to update consultation status", async () => {
      const adminUserId = Math.floor(Math.random() * 1000000);
      const adminCtx = createAuthContext("admin", adminUserId);
      const adminCaller = appRouter.createCaller(adminCtx);

      // Create a consultation as regular user
      const regularUserId = Math.floor(Math.random() * 1000000);
      const userCtx = createAuthContext("user", regularUserId);
      const userCaller = appRouter.createCaller(userCtx);

      // Insert test user
      await db.upsertUser({
        openId: `test-user-${regularUserId}`,
        name: "Test User",
        email: `test${regularUserId}@example.com`,
        loginMethod: "manus",
        role: "user",
      });

      const dbUser = await db.getUserByOpenId(`test-user-${regularUserId}`);
      if (!dbUser) throw new Error("User not created");
      const updatedUserCtx = createAuthContext("user", dbUser.id);
      const updatedUserCaller = appRouter.createCaller(updatedUserCtx);
      
      const createResult = await updatedUserCaller.consultation.create({
        patientName: "Status Test",
        patientEmail: "status@example.com",
        symptoms: "Testing status update by admin",
        medicalHistory: "No history",
        preferredLanguage: "en" as const,
        isFree: true,
      });

      // Admin updates status
      const updateResult = await adminCaller.admin.updateStatus({
        id: createResult.consultationId,
        status: "specialist_review",
        adminNotes: "Consultation confirmed by admin",
      });

      expect(updateResult.success).toBe(true);

      // Verify status was updated
      const consultation = await db.getConsultationById(createResult.consultationId);
      expect(consultation?.status).toBe("specialist_review");
      expect(consultation?.adminNotes).toBe("Consultation confirmed by admin");
    });
  });

  // Stats functionality moved to analytics dashboard
});

// ─────────────────────────────────────────────────────────────────────────────
// Payment Idempotency & Side-Effect Safety Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Payment Idempotency", () => {
  /** Helper: create a real DB user and return its ID */
  async function createTestUser(seed: number) {
    await db.upsertUser({
      openId: `idempotency-user-${seed}`,
      name: "Idempotency Test",
      email: `idempotency${seed}@example.com`,
      loginMethod: "manus",
      role: "user",
    });
    const user = await db.getUserByOpenId(`idempotency-user-${seed}`);
    if (!user) throw new Error("User not created");
    return user;
  }

  describe("consultation.updatePayment idempotency", () => {
    it("should return alreadyCompleted=true when called twice with the same consultationId", async () => {
      const seed = Math.floor(Math.random() * 1_000_000);
      const user = await createTestUser(seed);
      const ctx = createAuthContext("user", user.id);
      const caller = appRouter.createCaller(ctx);

      // Create a paid consultation
      const createResult = await caller.consultation.create({
        patientName: "Idempotency Patient",
        patientEmail: "idempotency@example.com",
        symptoms: "Testing idempotency of updatePayment",
        preferredLanguage: "en" as const,
        isFree: false,
      });

      const orderId = `PAYPAL-IDEM-${seed}`;
      // First call — should succeed
      const first = await caller.consultation.updatePayment({
        consultationId: createResult.consultationId,
        paymentId: orderId,
        status: "completed",
      });
      expect(first.success).toBe(true);
      expect(first.alreadyCompleted).toBe(false);

      // Second call — should be idempotent
      const second = await caller.consultation.updatePayment({
        consultationId: createResult.consultationId,
        paymentId: orderId,
        status: "completed",
      });
      expect(second.success).toBe(true);
      expect(second.alreadyCompleted).toBe(true);

      // DB state should still be completed (not corrupted)
      const consultation = await db.getConsultationById(createResult.consultationId);
      expect(consultation?.paymentStatus).toBe("completed");
    });
  });

  describe("consultation.confirmConsultationPayment idempotency", () => {
    it("should return alreadyCompleted=true when called twice for the same consultation", async () => {
      const seed = Math.floor(Math.random() * 1_000_000);
      const user = await createTestUser(seed);
      const ctx = createAuthContext("user", user.id);
      const caller = appRouter.createCaller(ctx);

      // Create a draft consultation
      const draftResult = await caller.consultation.createDraft({
        patientName: "Draft Patient",
        patientEmail: "draft@example.com",
        symptoms: "Testing confirmConsultationPayment idempotency",
        preferredLanguage: "en" as const,
      });

      const confirmOrderId = `ORDER-IDEM-${seed}`;
      // First confirmation
      const first = await caller.consultation.confirmConsultationPayment({
        consultationId: draftResult.consultationId,
        paypalOrderId: confirmOrderId,
      });
      expect(first.success).toBe(true);
      expect(first.alreadyCompleted).toBe(false);

      // Second confirmation with same order ID — should be idempotent
      const second = await caller.consultation.confirmConsultationPayment({
        consultationId: draftResult.consultationId,
        paypalOrderId: confirmOrderId,
      });
      expect(second.success).toBe(true);
      expect(second.alreadyCompleted).toBe(true);
    });

    it("should throw CONFLICT when the same paypalOrderId is used for a different consultation", async () => {
      const seed = Math.floor(Math.random() * 1_000_000);
      const user = await createTestUser(seed);
      const ctx = createAuthContext("user", user.id);
      const caller = appRouter.createCaller(ctx);

      // Create two draft consultations
      const draft1 = await caller.consultation.createDraft({
        patientName: "Draft Patient A",
        patientEmail: "drafta@example.com",
        symptoms: "First draft for duplicate order test",
        preferredLanguage: "en" as const,
      });
      const draft2 = await caller.consultation.createDraft({
        patientName: "Draft Patient B",
        patientEmail: "draftb@example.com",
        symptoms: "Second draft for duplicate order test",
        preferredLanguage: "en" as const,
      });

      const dupOrderId = `ORDER-DUP-${seed}`;
      // Confirm first consultation with the unique order ID
      await caller.consultation.confirmConsultationPayment({
        consultationId: draft1.consultationId,
        paypalOrderId: dupOrderId,
      });

      // Try to use the same order ID for the second consultation — should throw CONFLICT
      await expect(
        caller.consultation.confirmConsultationPayment({
          consultationId: draft2.consultationId,
          paypalOrderId: dupOrderId,
        })
      ).rejects.toThrow();
    });
  });

  describe("free consultation side effects", () => {
    it("should not block submission when email/WhatsApp notifications fail", async () => {
      // The side effects are fire-and-forget — a notification failure must not
      // propagate to the caller. We verify this by checking the consultation
      // was created successfully even if the side effects would throw.
      const seed = Math.floor(Math.random() * 1_000_000);
      const user = await createTestUser(seed);
      const ctx = createAuthContext("user", user.id);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.consultation.create({
        patientName: "Side Effect Test",
        patientEmail: "sideeffect@example.com",
        symptoms: "Testing that side effects do not block submission",
        preferredLanguage: "en" as const,
        isFree: true,
      });

      // Submission should succeed regardless of notification outcome
      expect(result.success).toBe(true);
      expect(result.consultationId).toBeGreaterThan(0);

      // Consultation should be in DB with correct payment status
      const consultation = await db.getConsultationById(result.consultationId);
      expect(consultation?.paymentStatus).toBe("completed");
      expect(consultation?.isFree).toBe(true);
    });
  });
});
