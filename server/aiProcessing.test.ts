import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as db from "./db";

// ── Mock the LLM layer so tests never hit the real API ────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          success: true,
          analysis: "The patient presents with persistent headache, photophobia, and nausea — consistent with migraine or tension-type headache. Neurological causes should be excluded.",
          summary: "Persistent headache with photophobia and nausea",
          keyFindings: ["Persistent headache for 3 days", "Photophobia", "Mild nausea"],
          recommendations: ["Consult a neurologist", "Avoid bright lights", "Consider OTC analgesics"],
          urgencyLevel: "moderate",
          disclaimer: "This is an AI-generated analysis and does not constitute medical advice.",
        }),
      },
    }],
  }),
}));

// Static import — vi.mock hoisting ensures the mock is in place before this runs
import { analyzeMedicalConsultation } from "./aiMedicalAnalysis";

describe("AI Medical Analysis Workflow", () => {
  let testConsultationId: number;
  let testUserId: number;

  beforeAll(async () => {
    // upsertUser is the canonical helper (createUser was removed)
    const user = await db.upsertUser({
      openId: `test-ai-${Date.now()}`,
      name: "Test AI User",
      email: `test-ai-${Date.now()}@example.com`,
      loginMethod: "test",
      role: "user",
    });
    testUserId = user.id;

    testConsultationId = Number(await db.createConsultation({
      userId: testUserId,
      patientName: "John Doe",
      patientEmail: "john@example.com",
      patientPhone: "+1234567890",
      symptoms: "Persistent headache for 3 days, sensitivity to light, mild nausea",
      medicalHistory: "No significant medical history",
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      otherDocuments: null,
      preferredLanguage: "en",
      status: "submitted",
      isFree: true,
      amount: 0,
      paymentStatus: "completed",
      priority: "routine",
    }));
  });

  afterAll(async () => {
    // Cleanup is best-effort; test DB rows are acceptable to leave
  });

  it("should analyze medical consultation and return structured results", async () => {
    const consultation = await db.getConsultationById(testConsultationId);
    expect(consultation).toBeDefined();
    expect(consultation?.symptoms).toContain("headache");

    const analysisResult = await analyzeMedicalConsultation({
      consultationId: testConsultationId,
      patientName: consultation!.patientName,
      patientEmail: consultation!.patientEmail,
      symptoms: consultation!.symptoms,
      medicalHistory: consultation!.medicalHistory,
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      preferredLanguage: "en",
      isDeepAnalysis: false,
      specialistFeedback: null,
    });

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.analysis).toBeDefined();
    expect(analysisResult.summary).toBeDefined();
    expect(analysisResult.keyFindings).toBeDefined();
    expect(analysisResult.recommendations).toBeDefined();
    expect(analysisResult.urgencyLevel).toBeDefined();

    // Verify analysis contains relevant medical information (from mock)
    expect(analysisResult.analysis).toMatch(/headache|migraine|neurological/i);
  });

  it("should update consultation status through workflow", async () => {
    await db.updateConsultationStatus(testConsultationId, "ai_processing");
    let consultation = await db.getConsultationById(testConsultationId);
    expect(consultation?.status).toBe("ai_processing");

    await db.updateConsultationStatus(testConsultationId, "specialist_review");
    consultation = await db.getConsultationById(testConsultationId);
    expect(consultation?.status).toBe("specialist_review");

    await db.updateConsultationStatus(testConsultationId, "completed");
    consultation = await db.getConsultationById(testConsultationId);
    expect(consultation?.status).toBe("completed");
  });

  it("should handle specialist approval workflow", async () => {
    await db.updateConsultation(testConsultationId, {
      specialistApprovalStatus: "approved",
      specialistNotes: "Analysis looks good, approved for patient delivery",
      reviewedBy: testUserId,
      reviewedAt: new Date(),
    });

    const consultation = await db.getConsultationById(testConsultationId);
    expect(consultation?.specialistApprovalStatus).toBe("approved");
    expect(consultation?.specialistNotes).toContain("approved");
    expect(consultation?.reviewedBy).toBe(testUserId);
  });

  it("should handle specialist rejection workflow", async () => {
    await db.updateConsultation(testConsultationId, {
      specialistApprovalStatus: "rejected",
      specialistRejectionReason: "Need more detailed differential diagnosis",
      status: "ai_processing",
    });

    const consultation = await db.getConsultationById(testConsultationId);
    expect(consultation?.specialistApprovalStatus).toBe("rejected");
    expect(consultation?.specialistRejectionReason).toContain("differential diagnosis");
    expect(consultation?.status).toBe("ai_processing");
  });
});
