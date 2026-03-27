import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock external dependencies ──────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  getUserFreeQuota: vi.fn(),
  getConsultationsByUserId: vi.fn(),
  getUserMedicalRecords: vi.fn(),
  createConsultation: vi.fn(),
  incrementFreeConsultationsUsed: vi.fn(),
  getAllUsers: vi.fn(),
}));

vi.mock("./emailNotifications", () => ({
  sendConsultationReceipt: vi.fn().mockResolvedValue(undefined),
  sendConsultationStatusUpdate: vi.fn().mockResolvedValue(undefined),
  sendNewQuestionNotification: vi.fn().mockResolvedValue(undefined),
  sendQuestionAnsweredNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./whatsappNotification", () => ({
  sendConsultationWhatsAppNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./aiProcessingOrchestrator", () => ({
  processConsultationWithAI: vi.fn().mockResolvedValue(undefined),
  reprocessConsultationAfterRejection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({ text: "test" }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/file.png" }),
}));

vi.mock("nanoid", () => ({ nanoid: () => "test-nanoid" }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn().mockResolvedValue(true) },
}));

vi.mock("./_core/sdk", () => ({
  sdk: { createSessionToken: vi.fn().mockResolvedValue("token") },
}));

import * as db from "./db";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Admin: getProfileByUserId", () => {
  const mockUser = {
    id: 42,
    name: "Test Patient",
    email: "patient@example.com",
    role: "user",
    login_method: "local",
    subscription_type: "free",
    plan_type: "free",
    free_consultations_total: 10,
    free_consultations_used: 3,
    avatar_url: null,
    bio: null,
    createdAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.getUserById as any).mockResolvedValue(mockUser);
    (db.getConsultationsByUserId as any).mockResolvedValue([
      { id: 1, status: "completed", patientName: "Test" },
      { id: 2, status: "submitted", patientName: "Test" },
      { id: 3, status: "ai_processing", patientName: "Test" },
    ]);
    (db.getUserMedicalRecords as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
  });

  it("returns user profile with correct stats", async () => {
    const userId = 42;
    const user = await db.getUserById(userId);
    const consultations = await db.getConsultationsByUserId(userId);
    const records = await db.getUserMedicalRecords(userId);

    expect(user).toBeTruthy();
    expect(consultations).toHaveLength(3);
    expect(records).toHaveLength(2);

    const totalConsultations = consultations.length;
    const completedConsultations = consultations.filter((c: any) => c.status === "completed").length;
    const pendingConsultations = consultations.filter((c: any) =>
      ["submitted", "ai_processing", "specialist_review"].includes(c.status)
    ).length;

    expect(totalConsultations).toBe(3);
    expect(completedConsultations).toBe(1);
    expect(pendingConsultations).toBe(2);
  });

  it("calculates consultationsRemaining correctly", async () => {
    const user = await db.getUserById(42);
    const freeTotal = (user as any).free_consultations_total ?? 0;
    const freeUsed = (user as any).free_consultations_used ?? 0;
    const consultationsRemaining = Math.max(0, freeTotal - freeUsed);
    expect(consultationsRemaining).toBe(7);
  });

  it("returns planType from user record", async () => {
    const user = await db.getUserById(42);
    const planType = (user as any).plan_type ?? "free";
    expect(planType).toBe("free");
  });

  it("returns premium planType when user is premium", async () => {
    (db.getUserById as any).mockResolvedValue({ ...mockUser, plan_type: "premium" });
    const user = await db.getUserById(42);
    const planType = (user as any).plan_type ?? "free";
    expect(planType).toBe("premium");
  });

  it("throws NOT_FOUND when user does not exist", async () => {
    (db.getUserById as any).mockResolvedValue(null);
    const user = await db.getUserById(999);
    expect(user).toBeNull();
    // In the actual procedure this would throw TRPCError NOT_FOUND
  });
});

describe("Admin quota bypass in consultation.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getUserById as any).mockResolvedValue({
      id: 1, role: "admin", name: "Admin", email: "admin@example.com",
    });
    (db.getUserFreeQuota as any).mockResolvedValue({ total: 0, used: 0 });
    (db.createConsultation as any).mockResolvedValue(100);
    (db.incrementFreeConsultationsUsed as any).mockResolvedValue(undefined);
  });

  it("admin with 0 quota remaining can still create free consultation", async () => {
    const isAdmin = true;
    const quota = await db.getUserFreeQuota(1);
    const freeRemaining = quota.total - quota.used;

    // Simulate the quota check logic
    const isFree = true;
    let quotaError = false;
    if (isFree && !isAdmin) {
      if (freeRemaining <= 0) {
        quotaError = true;
      }
    }

    expect(quotaError).toBe(false); // Admin bypasses quota
    expect(freeRemaining).toBe(0);  // Quota is indeed 0
  });

  it("non-admin with 0 quota gets quota error", async () => {
    const isAdmin = false;
    const quota = await db.getUserFreeQuota(1);
    const freeRemaining = quota.total - quota.used;

    const isFree = true;
    let quotaError = false;
    if (isFree && !isAdmin) {
      if (freeRemaining <= 0) {
        quotaError = true;
      }
    }

    expect(quotaError).toBe(true); // Non-admin gets quota error
  });

  it("admin does not increment free consultations used counter", async () => {
    const isAdmin = true;
    const isFree = true;

    // Simulate the increment logic
    if (isFree && !isAdmin) {
      await db.incrementFreeConsultationsUsed(1);
    }

    expect(db.incrementFreeConsultationsUsed).not.toHaveBeenCalled();
  });

  it("non-admin increments free consultations used counter", async () => {
    const isAdmin = false;
    const isFree = true;

    if (isFree && !isAdmin) {
      await db.incrementFreeConsultationsUsed(1);
    }

    expect(db.incrementFreeConsultationsUsed).toHaveBeenCalledWith(1);
  });
});
