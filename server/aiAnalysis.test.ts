import { describe, it, expect } from "vitest";
import { analyzeMedicalConsultation } from "./aiMedicalAnalysis";

describe("AI Medical Analysis", () => {
  it("should analyze medical consultation and return structured results", async () => {
    const analysisResult = await analyzeMedicalConsultation({
      consultationId: 999,
      patientName: "Test Patient",
      patientEmail: "test@example.com",
      symptoms: "Persistent headache for 3 days, sensitivity to light, mild nausea",
      medicalHistory: "No significant medical history",
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      preferredLanguage: "en",
      isDeepAnalysis: false,
      specialistFeedback: null,
    });

    // Verify the structure of the response
    expect(analysisResult).toBeDefined();
    expect(analysisResult.success).toBe(true);
    expect(analysisResult.analysis).toBeDefined();
    expect(analysisResult.summary).toBeDefined();
    expect(analysisResult.keyFindings).toBeDefined();
    expect(analysisResult.recommendations).toBeDefined();
    expect(analysisResult.urgencyLevel).toBeDefined();
    
    // Verify analysis is a non-empty string
    expect(typeof analysisResult.analysis).toBe("string");
    expect(analysisResult.analysis.length).toBeGreaterThan(100);
    
    // Verify urgency level is valid
    expect(["low", "medium", "high", "critical"]).toContain(analysisResult.urgencyLevel);
    
    // Verify key findings is an array
    expect(Array.isArray(analysisResult.keyFindings)).toBe(true);
    expect(analysisResult.keyFindings.length).toBeGreaterThan(0);
    
    // Verify recommendations is an array
    expect(Array.isArray(analysisResult.recommendations)).toBe(true);
    expect(analysisResult.recommendations.length).toBeGreaterThan(0);
  }, 60000); // 60 second timeout for AI API call

  it("should handle deep analysis with specialist feedback", async () => {
    const analysisResult = await analyzeMedicalConsultation({
      consultationId: 999,
      patientName: "Test Patient",
      patientEmail: "test@example.com",
      symptoms: "Chest pain radiating to left arm, shortness of breath",
      medicalHistory: "Hypertension, family history of heart disease",
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      preferredLanguage: "en",
      isDeepAnalysis: true,
      specialistFeedback: "Need more detailed cardiovascular risk assessment and differential diagnosis",
    });

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.analysis).toBeDefined();
    
    // Deep analysis should produce more comprehensive results
    expect(analysisResult.analysis.length).toBeGreaterThan(200);
    
    // Should address the specialist feedback
    expect(analysisResult.analysis.toLowerCase()).toMatch(/cardiovascular|cardiac|heart/);
  }, 60000);

  it("should handle Arabic language preference", async () => {
    const analysisResult = await analyzeMedicalConsultation({
      consultationId: 999,
      patientName: "مريض تجريبي",
      patientEmail: "test@example.com",
      symptoms: "صداع مستمر لمدة 3 أيام",
      medicalHistory: "لا يوجد تاريخ طبي مهم",
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      preferredLanguage: "ar",
      isDeepAnalysis: false,
      specialistFeedback: null,
    });

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.analysis).toBeDefined();
    
    // Analysis should contain Arabic text
    expect(analysisResult.analysis).toMatch(/[\u0600-\u06FF]/); // Arabic Unicode range
  }, 60000);
});
