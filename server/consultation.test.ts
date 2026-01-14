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
        description: "I need medical advice about my condition",
        language: "en",
        isFree: true,
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBeDefined();
    });

    it("should reject free consultation if already used", async () => {
      const userId = Math.floor(Math.random() * 1000000);
      const ctx = createAuthContext("user", userId);
      const caller = appRouter.createCaller(ctx);

      // Insert test user and mark free consultation as used
      await db.upsertUser({
        openId: `test-user-${userId}`,
        name: "Test User",
        email: `test${userId}@example.com`,
        loginMethod: "manus",
        role: "user",
        hasUsedFreeConsultation: true,
      });

      // Get the user to get the actual DB ID
      const dbUser = await db.getUserByOpenId(`test-user-${userId}`);
      if (!dbUser) throw new Error("User not created");

      // Update context with correct user ID
      const updatedCtx = createAuthContext("user", dbUser.id);
      const updatedCaller = appRouter.createCaller(updatedCtx);

      // Try to create another free consultation
      await expect(
        updatedCaller.consultation.create({
          patientName: "John Doe",
          patientEmail: "john@example.com",
          description: "Another consultation request",
          language: "en",
          isFree: true,
        })
      ).rejects.toThrow("Free consultation already used");
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
        description: "I need a paid consultation for specialized advice",
        language: "ar",
        isFree: false,
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBeDefined();

      // Verify consultation was created with correct payment status
      const consultation = await db.getConsultationById(result.consultationId);
      expect(consultation?.paymentStatus).toBe("pending");
      expect(consultation?.amount).toBe("50.00");
    });

    it("should validate required fields", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Missing description
      await expect(
        caller.consultation.create({
          patientName: "Test",
          patientEmail: "test@example.com",
          description: "short",
          language: "en",
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
        description: "Test consultation for listing",
        language: "en",
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
        description: "Testing payment update functionality",
        language: "en",
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
        description: "Testing status update by admin",
        language: "en",
        isFree: true,
      });

      // Admin updates status
      const updateResult = await adminCaller.admin.updateConsultationStatus({
        id: createResult.consultationId,
        status: "confirmed",
        adminNotes: "Consultation confirmed by admin",
      });

      expect(updateResult.success).toBe(true);

      // Verify status was updated
      const consultation = await db.getConsultationById(createResult.consultationId);
      expect(consultation?.status).toBe("confirmed");
      expect(consultation?.adminNotes).toBe("Consultation confirmed by admin");
    });
  });

  describe("admin.stats", () => {
    it("should return dashboard statistics", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.admin.stats();
      
      expect(stats).toHaveProperty("totalUsers");
      expect(stats).toHaveProperty("totalConsultations");
      expect(stats).toHaveProperty("pendingConsultations");
      expect(typeof stats.totalUsers).toBe("number");
      expect(typeof stats.totalConsultations).toBe("number");
    });
  });
});
