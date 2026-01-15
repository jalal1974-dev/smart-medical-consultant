import { describe, expect, it, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as emailNotifications from "./emailNotifications";

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

describe("Question Email Notifications", () => {
  let testUserId: number;
  let testConsultationId: number;
  let questionId: number;

  beforeAll(async () => {
    // Create test user
    await db.upsertUser({
      openId: "test-notification-user",
      name: "Notification Test User",
      email: "notification@test.com",
      loginMethod: "manus",
    });

    const user = await db.getUserByOpenId("test-notification-user");
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;

    // Create test consultation
    testConsultationId = Number(await db.createConsultation({
      userId: testUserId,
      patientName: "Notification Test User",
      patientEmail: "notification@test.com",
      patientPhone: null,
      symptoms: "Test symptoms for notifications",
      medicalHistory: null,
      medicalReports: JSON.stringify(["report1.pdf"]),
      labResults: null,
      xrayImages: null,
      otherDocuments: null,
      preferredLanguage: "en",
      status: "completed",
      isFree: true,
      amount: 0,
      paymentStatus: "completed",
    }));
  });

  it("should send notification to admin when patient asks a question", async () => {
    // Spy on the notification function
    const sendNewQuestionSpy = vi.spyOn(emailNotifications, "sendNewQuestionNotification");

    const ctx = createTestContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.consultation.askQuestion({
      consultationId: testConsultationId,
      question: "Is this treatment plan suitable for my condition?",
    });

    expect(result.success).toBe(true);
    expect(result.questionId).toBeDefined();
    questionId = result.questionId as number;

    // Verify notification was sent
    expect(sendNewQuestionSpy).toHaveBeenCalledWith(
      testConsultationId,
      expect.any(String), // Patient name from ctx.user
      expect.any(String), // Patient email from ctx.user
      "Is this treatment plan suitable for my condition?"
    );

    sendNewQuestionSpy.mockRestore();
  });

  it("should send notification to patient when admin answers a question", async () => {
    // Spy on the notification function
    const sendAnsweredSpy = vi.spyOn(emailNotifications, "sendQuestionAnsweredNotification");

    const adminCtx = createTestContext(1, "admin");
    const caller = appRouter.createCaller(adminCtx);

    const result = await caller.admin.answerQuestion({
      questionId,
      answer: "Yes, this treatment plan is appropriate for your condition based on the latest medical guidelines. However, please follow up with your doctor for personalized advice.",
    });

    expect(result.success).toBe(true);

    // Verify notification was sent
    expect(sendAnsweredSpy).toHaveBeenCalled();
    
    // Check that the call included the patient's email
    const calls = sendAnsweredSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]).toBe("notification@test.com"); // patient email
    expect(calls[0]?.[1]).toBe("Notification Test User"); // patient name

    sendAnsweredSpy.mockRestore();
  });

  it("should include bilingual support in patient notifications", async () => {
    // Create Arabic-speaking user
    await db.upsertUser({
      openId: "test-arabic-user",
      name: "Arabic Test User",
      email: "arabic@test.com",
      loginMethod: "manus",
    });

    const arabicUser = await db.getUserByOpenId("test-arabic-user");
    if (!arabicUser) throw new Error("Failed to create Arabic test user");

    // Create Arabic consultation
    const arabicConsultationId = Number(await db.createConsultation({
      userId: arabicUser.id,
      patientName: "Arabic Test User",
      patientEmail: "arabic@test.com",
      patientPhone: null,
      symptoms: "Test symptoms",
      medicalHistory: null,
      medicalReports: JSON.stringify(["report1.pdf"]),
      labResults: null,
      xrayImages: null,
      otherDocuments: null,
      preferredLanguage: "ar", // Arabic
      status: "completed",
      isFree: true,
      amount: 0,
      paymentStatus: "completed",
    }));

    // Ask question
    const userCtx = createTestContext(arabicUser.id);
    const userCaller = appRouter.createCaller(userCtx);

    const questionResult = await userCaller.consultation.askQuestion({
      consultationId: arabicConsultationId,
      question: "هل هذا العلاج مناسب؟",
    });

    expect(questionResult.success).toBe(true);
    const arabicQuestionId = questionResult.questionId as number;

    // Spy on the notification function
    const sendAnsweredSpy = vi.spyOn(emailNotifications, "sendQuestionAnsweredNotification");

    // Admin answers
    const adminCtx = createTestContext(1, "admin");
    const adminCaller = appRouter.createCaller(adminCtx);

    await adminCaller.admin.answerQuestion({
      questionId: arabicQuestionId,
      answer: "نعم، هذا العلاج مناسب لحالتك",
    });

    // Verify Arabic language was passed
    const calls = sendAnsweredSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[5]).toBe("ar"); // preferred language

    sendAnsweredSpy.mockRestore();
  });
});
