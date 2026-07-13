import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateConsultationMaterials } from "./materialGenerator";

// Mock dependencies
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: "Comprehensive medical analysis with diagnosis and treatment recommendations."
      }
    }]
  })
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockImplementation((fileName: string) => 
    Promise.resolve({ url: `https://storage.example.com/${fileName}` })
  )
}));

describe("Material Generator", () => {
  const mockConsultationData = {
    consultationId: 1,
    patientName: "John Doe",
    symptoms: "Headache and fever for 3 days",
    medicalHistory: "No previous conditions",
    preferredLanguage: "en" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate all consultation materials successfully", async () => {
    const result = await generateConsultationMaterials(mockConsultationData);

    // reportUrl is the HTML report (fake-PDF path, kept for backward compat)
    expect(result).toHaveProperty("reportUrl");
    // infographicContent and slideDeckContent are JSON strings (not URLs)
    expect(result).toHaveProperty("infographicContent");
    expect(result).toHaveProperty("slideDeckContent");
    expect(result).toHaveProperty("analysisText");

    expect(result.reportUrl).toContain("https://storage.example.com/");
    expect(result.analysisText).toBeTruthy();
    // Verify infographicContent and slideDeckContent are valid JSON
    expect(() => JSON.parse(result.infographicContent)).not.toThrow();
    expect(() => JSON.parse(result.slideDeckContent)).not.toThrow();
  });

  it("should generate materials in Arabic when preferred language is ar", async () => {
    const arabicData = {
      ...mockConsultationData,
      preferredLanguage: "ar" as const,
    };

    const result = await generateConsultationMaterials(arabicData);

    expect(result.analysisText).toBeTruthy();
    expect(result.reportUrl).toBeTruthy();
    expect(result.slideDeckContent).toBeTruthy();
  });

  it("should handle consultation with no medical history", async () => {
    const noHistoryData = {
      ...mockConsultationData,
      medicalHistory: undefined,
    };

    const result = await generateConsultationMaterials(noHistoryData);

    expect(result.reportUrl).toBeTruthy();
    expect(result.analysisText).toBeTruthy();
  });

  it("should generate unique file names for each consultation", async () => {
    const result1 = await generateConsultationMaterials(mockConsultationData);
    const result2 = await generateConsultationMaterials({
      ...mockConsultationData,
      consultationId: 2,
    });

    expect(result1.reportUrl).not.toBe(result2.reportUrl);
    // slideDeckContent is deterministic JSON (not a URL), so uniqueness is not applicable here;
    // uniqueness of reportUrl is sufficient to verify nanoid-based file naming
    expect(result1.reportUrl).toBeTruthy();
    expect(result2.reportUrl).toBeTruthy();
  });
});
