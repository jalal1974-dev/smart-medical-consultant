import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getUserByOpenId } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-test-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("AI Consultation Workflow", () => {
  let testUserId: number;

  beforeEach(async () => {
    const openId = `ai-test-user-${Date.now()}`;
    await upsertUser({
      openId,
      name: "AI Test User",
      email: "aitest@example.com",
      loginMethod: "manus",
    });
    const user = await getUserByOpenId(openId);
    testUserId = user!.id;
  });

  it("should create a consultation with file uploads", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.consultations.create({
      patientName: "John Doe",
      patientEmail: "john@example.com",
      patientPhone: "+1234567890",
      symptoms: "Persistent headaches and dizziness",
      medicalHistory: "No previous major illnesses",
      medicalReports: JSON.stringify(["report1.pdf", "report2.pdf"]),
      labResults: JSON.stringify(["lab1.pdf"]),
      xrayImages: JSON.stringify(["xray1.jpg"]),
      otherDocuments: JSON.stringify([]),
      preferredLanguage: "en",
    });

    expect(result.success).toBe(true);
    expect(result.consultationId).toBeGreaterThan(0);
  });

  it("should track AI analysis workflow statuses", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // Create consultation
    const createResult = await caller.consultations.create({
      patientName: "Jane Smith",
      patientEmail: "jane@example.com",
      symptoms: "Chest pain",
      medicalHistory: "Hypertension",
      medicalReports: JSON.stringify(["report.pdf"]),
      labResults: JSON.stringify([]),
      xrayImages: JSON.stringify([]),
      otherDocuments: JSON.stringify([]),
      preferredLanguage: "ar",
    });

    expect(createResult.success).toBe(true);

    // Get consultations and verify initial status
    const consultations = await caller.consultations.list();
    const consultation = consultations.find((c) => c.id === createResult.consultationId);
    
    expect(consultation).toBeDefined();
    expect(consultation?.status).toBe("submitted");
  });

  it("should allow admin to update consultation status", async () => {
    // Create consultation as user
    const { ctx: userCtx } = createAuthContext(testUserId);
    const userCaller = appRouter.createCaller(userCtx);

    const createResult = await userCaller.consultations.create({
      patientName: "Test Patient",
      patientEmail: "patient@example.com",
      symptoms: "Test symptoms",
      medicalHistory: "Test history",
      medicalReports: JSON.stringify([]),
      labResults: JSON.stringify([]),
      xrayImages: JSON.stringify([]),
      otherDocuments: JSON.stringify([]),
      preferredLanguage: "en",
    });

    // Update status as admin
    const { ctx: adminCtx } = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    await adminCaller.admin.updateStatus({
      id: createResult.consultationId!,
      status: "ai_processing",
    });

    // Verify status updated
    const consultations = await adminCaller.admin.consultations();
    const updated = consultations.find((c) => c.id === createResult.consultationId);
    
    expect(updated?.status).toBe("ai_processing");
  });

  it("should handle free consultation tracking", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // First consultation should be free
    const first = await caller.consultations.create({
      patientName: "Free User",
      patientEmail: "free@example.com",
      symptoms: "Test",
      medicalHistory: "None",
      medicalReports: JSON.stringify([]),
      labResults: JSON.stringify([]),
      xrayImages: JSON.stringify([]),
      otherDocuments: JSON.stringify([]),
      preferredLanguage: "en",
    });

    expect(first.success).toBe(true);

    // Check user's free consultation status
    const me = await caller.auth.me();
    expect(me?.hasUsedFreeConsultation).toBe(true);
  });

  it("should store AI analysis results", async () => {
    const { ctx: userCtx } = createAuthContext(testUserId);
    const userCaller = appRouter.createCaller(userCtx);

    const createResult = await userCaller.consultations.create({
      patientName: "AI Analysis Patient",
      patientEmail: "ai@example.com",
      symptoms: "Complex symptoms",
      medicalHistory: "Detailed history",
      medicalReports: JSON.stringify(["report.pdf"]),
      labResults: JSON.stringify(["lab.pdf"]),
      xrayImages: JSON.stringify(["xray.jpg"]),
      otherDocuments: JSON.stringify([]),
      preferredLanguage: "en",
    });

    // Admin adds AI analysis
    const { ctx: adminCtx } = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    await adminCaller.admin.updateStatus({
      id: createResult.consultationId!,
      status: "completed",
      aiAnalysis: "AI analysis shows normal results",
      specialistNotes: "Reviewed and approved by specialist",
      aiReportUrl: "https://example.com/report.pdf",
      aiVideoUrl: "https://example.com/video.mp4",
      aiInfographicUrl: "https://example.com/infographic.png",
    });

    // User retrieves consultation with AI results
    const consultations = await userCaller.consultations.list();
    const completed = consultations.find((c) => c.id === createResult.consultationId);

    expect(completed?.aiAnalysis).toBe("AI analysis shows normal results");
    expect(completed?.specialistNotes).toBe("Reviewed and approved by specialist");
    expect(completed?.aiReportUrl).toBe("https://example.com/report.pdf");
  });
});
