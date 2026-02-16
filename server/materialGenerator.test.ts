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

    expect(result).toHaveProperty("reportUrl");
    expect(result).toHaveProperty("infographicUrl");
    expect(result).toHaveProperty("slideDeckUrl");
    expect(result).toHaveProperty("analysisText");

    expect(result.reportUrl).toContain("https://storage.example.com/");
    expect(result.slideDeckUrl).toContain("https://storage.example.com/");
    expect(result.analysisText).toBeTruthy();
  });

  it("should generate materials in Arabic when preferred language is ar", async () => {
    const arabicData = {
      ...mockConsultationData,
      preferredLanguage: "ar" as const,
    };

    const result = await generateConsultationMaterials(arabicData);

    expect(result.analysisText).toBeTruthy();
    expect(result.reportUrl).toBeTruthy();
    expect(result.slideDeckUrl).toBeTruthy();
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
    expect(result1.slideDeckUrl).not.toBe(result2.slideDeckUrl);
  });
});
