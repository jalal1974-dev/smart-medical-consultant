/**
 * AI Medical Analysis Tests
 *
 * These tests mock the underlying LLM call so they run deterministically
 * without consuming API quota or hitting the 412 "usage exhausted" error
 * that occurs in the CI/test environment.
 *
 * The tests verify:
 *  - The function correctly assembles the LLM response into MedicalAnalysisResult
 *  - Deep-analysis mode passes the right prompt flags
 *  - Arabic language preference is forwarded to the LLM prompt
 *  - Failure paths (empty response, thrown error) return success:false
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MedicalAnalysisResult } from "./aiMedicalAnalysis";

// ── Mock the LLM module BEFORE importing the module under test ────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { analyzeMedicalConsultation } from "./aiMedicalAnalysis";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal OpenAI-style chat completion response */
function makeLLMResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

const STRUCTURED_JSON = JSON.stringify({
  summary: "Patient presents with persistent headache.",
  keyFindings: ["Photophobia", "Nausea", "3-day duration"],
  recommendations: ["Neurological evaluation", "Hydration", "Rest"],
  urgencyLevel: "medium",
});

const ARABIC_ANALYSIS =
  "تحليل طبي: يعاني المريض من صداع مستمر. يُنصح بمراجعة الطبيب المختص.";

const ARABIC_STRUCTURED_JSON = JSON.stringify({
  summary: "يعاني المريض من صداع مستمر.",
  keyFindings: ["حساسية للضوء", "غثيان"],
  recommendations: ["مراجعة طبيب الأعصاب", "الراحة"],
  urgencyLevel: "low",
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AI Medical Analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should analyze medical consultation and return structured results", async () => {
    const mockInvoke = vi.mocked(invokeLLM);
    // First call → freeform analysis text
    mockInvoke.mockResolvedValueOnce(
      makeLLMResponse(
        "Comprehensive analysis: Patient presents with persistent headache for 3 days " +
          "with photophobia and nausea. Differential diagnosis includes tension headache, " +
          "migraine, and viral illness. Recommend neurological evaluation and hydration."
      )
    );
    // Second call → structured JSON extraction
    mockInvoke.mockResolvedValueOnce(makeLLMResponse(STRUCTURED_JSON));

    const result: MedicalAnalysisResult = await analyzeMedicalConsultation({
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

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    expect(typeof result.analysis).toBe("string");
    expect(result.analysis!.length).toBeGreaterThan(100);

    expect(result.summary).toBe("Patient presents with persistent headache.");
    expect(Array.isArray(result.keyFindings)).toBe(true);
    expect(result.keyFindings!.length).toBeGreaterThan(0);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations!.length).toBeGreaterThan(0);
    expect(["low", "medium", "high", "critical"]).toContain(result.urgencyLevel);

    // Verify the LLM was called exactly twice (analysis + structured extraction)
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("should handle deep analysis with specialist feedback", async () => {
    const mockInvoke = vi.mocked(invokeLLM);
    const deepAnalysisText =
      "Deep cardiovascular analysis: Patient presents with chest pain radiating to left arm " +
      "and shortness of breath. Given hypertension and family history of heart disease, " +
      "differential diagnosis includes acute coronary syndrome, unstable angina, and aortic " +
      "dissection. Urgent cardiac evaluation required. ECG, troponin, and echocardiogram " +
      "recommended. Cardiovascular risk stratification indicates high risk.";

    mockInvoke.mockResolvedValueOnce(makeLLMResponse(deepAnalysisText));
    mockInvoke.mockResolvedValueOnce(
      makeLLMResponse(
        JSON.stringify({
          summary: "High-risk cardiovascular presentation requiring urgent evaluation.",
          keyFindings: ["Chest pain", "Radiation to left arm", "Hypertension", "Family history"],
          recommendations: ["ECG", "Troponin levels", "Echocardiogram", "Cardiology referral"],
          urgencyLevel: "critical",
        })
      )
    );

    const result = await analyzeMedicalConsultation({
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
      specialistFeedback:
        "Need more detailed cardiovascular risk assessment and differential diagnosis",
    });

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    // Deep analysis should produce more comprehensive results
    expect(result.analysis!.length).toBeGreaterThan(200);
    // Should address the cardiovascular concern
    expect(result.analysis!.toLowerCase()).toMatch(/cardiovascular|cardiac|heart/);
    expect(result.urgencyLevel).toBe("critical");

    // Verify the deep-analysis prompt was used (isDeepAnalysis=true)
    const firstCallMessages = mockInvoke.mock.calls[0][0].messages as Array<{
      role: string;
      content: string;
    }>;
    const systemPrompt = firstCallMessages.find((m) => m.role === "system")?.content ?? "";
    expect(systemPrompt).toMatch(/DEEP/i);
  });

  it("should handle Arabic language preference", async () => {
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockResolvedValueOnce(makeLLMResponse(ARABIC_ANALYSIS));
    mockInvoke.mockResolvedValueOnce(makeLLMResponse(ARABIC_STRUCTURED_JSON));

    const result = await analyzeMedicalConsultation({
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

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    // Analysis should contain Arabic text (Unicode range \u0600-\u06FF)
    expect(result.analysis).toMatch(/[\u0600-\u06FF]/);

    // Verify the Arabic language instruction was included in the system prompt
    const firstCallMessages = mockInvoke.mock.calls[0][0].messages as Array<{
      role: string;
      content: string;
    }>;
    const systemPrompt = firstCallMessages.find((m) => m.role === "system")?.content ?? "";
    expect(systemPrompt).toMatch(/Arabic/i);
  });

  it("should return success:false when LLM returns empty content", async () => {
    const mockInvoke = vi.mocked(invokeLLM);
    // First call returns empty content
    mockInvoke.mockResolvedValueOnce(makeLLMResponse(""));

    const result = await analyzeMedicalConsultation({
      consultationId: 999,
      patientName: "Test Patient",
      patientEmail: "test@example.com",
      symptoms: "Test symptoms",
      medicalHistory: null,
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      preferredLanguage: "en",
      isDeepAnalysis: false,
      specialistFeedback: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return success:false when LLM throws an error", async () => {
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockRejectedValueOnce(new Error("412 Precondition Failed – usage exhausted"));

    const result = await analyzeMedicalConsultation({
      consultationId: 999,
      patientName: "Test Patient",
      patientEmail: "test@example.com",
      symptoms: "Test symptoms",
      medicalHistory: null,
      medicalReports: null,
      labResults: null,
      xrayImages: null,
      preferredLanguage: "en",
      isDeepAnalysis: false,
      specialistFeedback: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
