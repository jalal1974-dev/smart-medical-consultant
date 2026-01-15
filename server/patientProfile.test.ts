import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId: number, role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
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
    res: {} as TrpcContext["res"],
  };
}

describe("Patient Profile Features", () => {
  let testUserId: number;
  let testConsultationId: number;

  beforeAll(async () => {
    // Create test user
    await db.upsertUser({
      openId: "test-profile-user",
      name: "Profile Test User",
      email: "profile@test.com",
      loginMethod: "manus",
    });

    const user = await db.getUserByOpenId("test-profile-user");
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;

    // Create test consultation
    testConsultationId = Number(await db.createConsultation({
      userId: testUserId,
      patientName: "Profile Test User",
      patientEmail: "profile@test.com",
      patientPhone: null,
      symptoms: "Test symptoms for profile",
      medicalHistory: null,
      medicalReports: JSON.stringify(["report1.pdf"]),
      labResults: JSON.stringify(["lab1.pdf"]),
      xrayImages: JSON.stringify(["xray1.jpg"]),
      otherDocuments: null,
      preferredLanguage: "en",
      status: "completed",
      isFree: true,
      amount: 0,
      paymentStatus: "completed",
    }));
  });

  it("should get consultations by user ID with questions", async () => {
    const ctx = createTestContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const consultations = await caller.consultation.getByUserId(testUserId);

    expect(consultations).toBeDefined();
    expect(Array.isArray(consultations)).toBe(true);
    expect(consultations.length).toBeGreaterThan(0);
    
    const consultation = consultations[0];
    expect(consultation).toHaveProperty("id");
    expect(consultation).toHaveProperty("questions");
    expect(Array.isArray(consultation.questions)).toBe(true);
  });

  it("should allow patient to ask a follow-up question", async () => {
    const ctx = createTestContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.consultation.askQuestion({
      consultationId: testConsultationId,
      question: "What should I do if the symptoms persist after treatment?",
    });

    expect(result.success).toBe(true);
    expect(result.questionId).toBeDefined();
    expect(typeof result.questionId).toBe("number");
  });

  it("should include asked questions in consultation data", async () => {
    const ctx = createTestContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const consultations = await caller.consultation.getByUserId(testUserId);
    const consultation = consultations.find(c => c.id === testConsultationId);

    expect(consultation).toBeDefined();
    expect(consultation?.questions).toBeDefined();
    expect(consultation?.questions.length).toBeGreaterThan(0);
    
    const question = consultation?.questions[0];
    expect(question).toHaveProperty("question");
    expect(question?.question).toContain("symptoms persist");
  });

  it("should prevent unauthorized access to other user's consultations", async () => {
    const otherUserCtx = createTestContext(testUserId + 999);
    const caller = appRouter.createCaller(otherUserCtx);

    await expect(
      caller.consultation.getByUserId(testUserId)
    ).rejects.toThrow("FORBIDDEN");
  });

  it("should allow admin to answer patient questions", async () => {
    const adminCtx = createTestContext(1, "admin");
    const caller = appRouter.createCaller(adminCtx);

    // Get the question ID
    const userCtx = createTestContext(testUserId);
    const userCaller = appRouter.createCaller(userCtx);
    const consultations = await userCaller.consultation.getByUserId(testUserId);
    const consultation = consultations.find(c => c.id === testConsultationId);
    const questionId = consultation?.questions[0]?.id;

    if (!questionId) throw new Error("No question found to answer");

    const result = await caller.admin.answerQuestion({
      questionId,
      answer: "If symptoms persist after 48 hours, please consult your doctor immediately for further evaluation.",
    });

    expect(result.success).toBe(true);
  });

  it("should show answered questions in patient profile", async () => {
    const ctx = createTestContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const consultations = await caller.consultation.getByUserId(testUserId);
    const consultation = consultations.find(c => c.id === testConsultationId);
    const question = consultation?.questions[0];

    expect(question).toBeDefined();
    expect(question?.answer).toBeDefined();
    expect(question?.answer).toContain("consult your doctor");
    expect(question?.answeredBy).toBeDefined();
    expect(question?.answeredAt).toBeDefined();
  });
});
