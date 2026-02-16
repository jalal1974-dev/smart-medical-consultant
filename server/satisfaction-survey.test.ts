import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import * as db from "./db";
import { users } from "../drizzle/schema";

// Mock context for testing
const createMockContext = (userId: number, role: "admin" | "user" = "user"): Context => ({
  user: {
    id: userId,
    openId: `test-openid-${userId}`,
    name: "Test User",
    email: "test@example.com",
    avatar: null,
    role,
    hasUsedFreeConsultation: false,
    subscriptionType: "free" as const,
    consultationsRemaining: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: null,
  },
  req: {} as any,
  res: {} as any,
});

describe("Satisfaction Survey System", () => {
  let testUserId: number;
  let testConsultationId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Use a test user ID that exists in the system
    testUserId = 999999; // Using a high ID to avoid conflicts
    
    // Insert test user into database
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.insert(users).values({
        id: testUserId,
        openId: `test-openid-${testUserId}`,
        name: "Test User",
        email: "test@example.com",
        role: "user",
        hasUsedFreeConsultation: false,
        subscriptionType: "free",
        consultationsRemaining: 5,
      }).onDuplicateKeyUpdate({ set: { name: "Test User" } });
    }
    
    const userCaller = appRouter.createCaller(createMockContext(testUserId));

    // Create a test consultation (paid to avoid free consultation tracking issues)
    const consultation = await userCaller.consultation.create({
      patientName: "Test Patient",
      patientEmail: "test@example.com",
      symptoms: "Test symptoms for survey testing",
      medicalHistory: "Test history",
      preferredLanguage: "en" as const,
      isFree: false,
    });

    testConsultationId = consultation.consultationId;

    // Update consultation status to completed (so survey can be submitted)
    const adminCaller = appRouter.createCaller(createMockContext(888888, "admin"));
    await db.updateConsultationStatus(testConsultationId, "completed");

    caller = userCaller;
  });

  describe("surveys.submit", () => {
    it("should submit a satisfaction survey for completed consultation", async () => {
      const result = await caller.survey.submit({
        consultationId: testConsultationId,
        overallRating: 5,
        aiQualityRating: 5,
        specialistRating: 4,
        responseTimeRating: 5,
        feedback: "Excellent service, very helpful!",
        wouldRecommend: true,
      });

      expect(result.success).toBe(true);
    });

    it("should reject duplicate survey submission for same consultation", async () => {
      await expect(
        caller.survey.submit({
          consultationId: testConsultationId,
          overallRating: 4,
          aiQualityRating: 4,
          specialistRating: 4,
          responseTimeRating: 4,
          feedback: "Second attempt",
          wouldRecommend: true,
        })
      ).rejects.toThrow("Survey already submitted for this consultation");
    });

    it("should reject survey with invalid ratings", async () => {
      // Create another consultation for this test
      const consultation2 = await caller.consultation.create({
        patientName: "Test Patient 2",
        patientEmail: "test2@example.com",
        symptoms: "Test symptoms 2 for testing",
        medicalHistory: "Test history 2",
        preferredLanguage: "en" as const,
        isFree: false,
      });

      const adminCaller = appRouter.createCaller(createMockContext(888888, "admin"));
      await db.updateConsultationStatus(consultation2.consultationId, "completed");

      await expect(
        caller.survey.submit({
          consultationId: consultation2.consultationId,
          overallRating: 6, // Invalid: should be 1-5
          aiQualityRating: 5,
          specialistRating: 5,
          responseTimeRating: 5,
          feedback: "Test",
          wouldRecommend: true,
        })
      ).rejects.toThrow();
    });

    it("should allow survey without feedback text", async () => {
      // Create another consultation
      const consultation3 = await caller.consultation.create({
        patientName: "Test Patient 3",
        patientEmail: "test3@example.com",
        symptoms: "Test symptoms 3 for testing",
        medicalHistory: "Test history 3",
        preferredLanguage: "en" as const,
        isFree: false,
      });

      const adminCaller = appRouter.createCaller(createMockContext(888888, "admin"));
      await db.updateConsultationStatus(consultation3.consultationId, "completed");

      const result = await caller.survey.submit({
        consultationId: consultation3.consultationId,
        overallRating: 4,
        aiQualityRating: 4,
        specialistRating: 4,
        responseTimeRating: 4,
        feedback: "", // Empty feedback should be allowed
        wouldRecommend: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("surveys.getStats", () => {
    it("should return survey statistics for admin", async () => {
      const adminCaller = appRouter.createCaller(createMockContext(888888, "admin"));
      const stats = await adminCaller.survey.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalSurveys).toBeGreaterThan(0);
      expect(stats.averageOverallRating).toBeGreaterThan(0);
      expect(stats.averageOverallRating).toBeLessThanOrEqual(5);
    });


  });

  describe("surveys.getBySurveyConsultation", () => {
    it("should return survey for specific consultation", async () => {
      const survey = await caller.survey.getBySurvey({
        consultationId: testConsultationId,
      });

      expect(survey).toBeDefined();
      expect(survey?.consultationId).toBe(testConsultationId);
      expect(survey?.overallRating).toBe(5);
      expect(survey?.feedback).toBe("Excellent service, very helpful!");
      expect(survey?.wouldRecommend).toBe(true);
    });

    it("should return null for consultation without survey", async () => {
      // Create a consultation without survey
      const consultation4 = await caller.consultation.create({
        patientName: "Test Patient 4",
        patientEmail: "test4@example.com",
        symptoms: "Test symptoms 4 for testing",
        medicalHistory: "Test history 4",
        preferredLanguage: "en" as const,
        isFree: false,
      });

      const survey = await caller.survey.getBySurvey({
        consultationId: consultation4.consultationId,
      });

      expect(survey).toBeNull();
    });
  });
});
