import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { analyzeMedicalConsultation } from "./aiMedicalAnalysis";

describe("AI Medical Analysis Workflow", () => {
  let testConsultationId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user
    testUserId = await db.createUser({
      openId: `test-ai-${Date.now()}`,
      name: "Test AI User",
      email: "test-ai@example.com",
      loginMethod: "test",
      role: "user",
    });

    // Create a test consultation
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
    }));
  });

  afterAll(async () => {
    // Cleanup: delete test consultation and user
    if (testConsultationId) {
      // Note: Add cleanup functions to db.ts if needed
    }
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
    
    // Verify analysis contains relevant medical information
    expect(analysisResult.analysis).toMatch(/headache|migraine|neurological/i);
  }, 60000); // 60 second timeout for AI processing

  it("should update consultation status through workflow", async () => {
    // Test status transitions
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
    // Update consultation with approval
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
    // Update consultation with rejection
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
