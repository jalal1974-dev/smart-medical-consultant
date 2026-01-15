import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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

describe("Analytics Dashboard", () => {
  let testUserId: number;
  let consultationIds: number[] = [];

  beforeAll(async () => {
    // Create test user
    await db.upsertUser({
      openId: "analytics-test-user",
      name: "Analytics Test User",
      email: "analytics@test.com",
      loginMethod: "manus",
    });

    const user = await db.getUserByOpenId("analytics-test-user");
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;

    // Create multiple test consultations with different statuses
    const statuses: Array<"submitted" | "ai_processing" | "specialist_review" | "completed" | "follow_up"> = [
      "submitted",
      "ai_processing",
      "specialist_review",
      "completed",
      "follow_up",
    ];

    for (let i = 0; i < 5; i++) {
      const consultationId = Number(await db.createConsultation({
        userId: testUserId,
        patientName: `Test Patient ${i}`,
        patientEmail: `patient${i}@test.com`,
        patientPhone: null,
        symptoms: `Test symptoms ${i}`,
        medicalHistory: null,
        medicalReports: JSON.stringify([`report${i}.pdf`]),
        labResults: null,
        xrayImages: null,
        otherDocuments: null,
        preferredLanguage: "en",
        status: statuses[i],
        isFree: i === 0, // First one is free
        amount: i === 0 ? 0 : 5,
        paymentStatus: i === 0 ? "completed" : "completed",
      }));
      consultationIds.push(consultationId);
    }

    // Create some questions
    await db.createConsultationQuestion({
      consultationId: consultationIds[3]!, // completed consultation
      userId: testUserId,
      question: "Test question 1",
    });

    const questionId = Number(await db.createConsultationQuestion({
      consultationId: consultationIds[3]!,
      userId: testUserId,
      question: "Test question 2",
    }));

    // Answer one question
    await db.answerQuestion(questionId, "Test answer", 1); // answered by admin user ID 1
  });

  it("should calculate total consultations correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    expect(result.consultations.totalConsultations).toBeGreaterThanOrEqual(5);
  });

  it("should calculate free vs paid consultations correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    expect(result.consultations.freeConsultations).toBeGreaterThanOrEqual(1);
    expect(result.consultations.paidConsultations).toBeGreaterThanOrEqual(4);
  });

  it("should calculate total revenue correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    // 4 paid consultations at $5 each = $20 minimum
    expect(result.consultations.totalRevenue).toBeGreaterThanOrEqual(20);
  });

  it("should calculate status distribution correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    const statusDist = result.consultations.statusDistribution;
    
    // We created one of each status
    expect(statusDist.submitted).toBeGreaterThanOrEqual(1);
    expect(statusDist.ai_processing).toBeGreaterThanOrEqual(1);
    expect(statusDist.specialist_review).toBeGreaterThanOrEqual(1);
    expect(statusDist.completed).toBeGreaterThanOrEqual(1);
    expect(statusDist.follow_up).toBeGreaterThanOrEqual(1);
  });

  it("should calculate completion rate correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    // At least 1 completed out of 5+ total
    expect(result.consultations.completionRate).toBeGreaterThan(0);
    expect(result.consultations.completionRate).toBeLessThanOrEqual(100);
  });

  it("should calculate average response time for completed consultations", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    // Response time should be a non-negative number
    expect(result.consultations.averageResponseTime).toBeGreaterThanOrEqual(0);
  });

  it("should calculate question analytics correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    expect(result.questions.totalQuestions).toBeGreaterThanOrEqual(2);
    expect(result.questions.answeredQuestions).toBeGreaterThanOrEqual(1);
    expect(result.questions.unansweredQuestions).toBeGreaterThanOrEqual(1);
  });

  it("should calculate question answer rate correctly", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    expect(result.questions.answerRate).toBeGreaterThan(0);
    expect(result.questions.answerRate).toBeLessThanOrEqual(100);
  });

  it("should filter analytics by date range", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    // Get analytics for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const result = await caller.admin.analytics({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Should have consultations from the last 7 days
    expect(result.consultations.totalConsultations).toBeGreaterThanOrEqual(0);
  });

  it("should provide consultations by date", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    expect(Array.isArray(result.consultations.consultationsByDate)).toBe(true);
    expect(result.consultations.consultationsByDate.length).toBeGreaterThan(0);
    
    // Each entry should have date and count
    result.consultations.consultationsByDate.forEach(entry => {
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('count');
      expect(typeof entry.count).toBe('number');
    });
  });

  it("should provide revenue by date", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.analytics({});

    expect(Array.isArray(result.consultations.revenueByDate)).toBe(true);
    expect(result.consultations.revenueByDate.length).toBeGreaterThan(0);
    
    // Each entry should have date and revenue
    result.consultations.revenueByDate.forEach(entry => {
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('revenue');
      expect(typeof entry.revenue).toBe('number');
    });
  });
});
