import { describe, it, expect } from "vitest";
import { generateInfographicContent, generateSlideDeckContent } from "./slideContentGenerator";

describe("Slide Content Generator - UI Improvements", () => {
  const mockConsultationData = {
    patientName: "John Doe",
    symptoms: "headache, fever, fatigue",
    medicalHistory: "No prior conditions",
    preferredLanguage: "en",
  };

  const mockAnalysis = `
Urgency: high

Diagnosis: Possible viral infection

Key Findings:
- Elevated body temperature
- Persistent headache
- General fatigue

Recommendations:
- Rest and hydration
- Monitor temperature
- Consult if symptoms worsen
  `;

  describe("generateInfographicContent", () => {
    it("should extract urgency level from analysis", () => {
      const result = generateInfographicContent(mockConsultationData, mockAnalysis);
      
      expect(result.urgencyLevel).toBe("high");
    });

    it("should extract key findings from analysis", () => {
      const result = generateInfographicContent(mockConsultationData, mockAnalysis);
      
      expect(result.keyFindings).toBeDefined();
      expect(result.keyFindings.length).toBeGreaterThan(0);
    });

    it("should parse symptoms into array", () => {
      const result = generateInfographicContent(mockConsultationData, mockAnalysis);
      
      expect(result.symptoms).toEqual(["headache", "fever", "fatigue"]);
    });

    it("should limit symptoms to 5 items", () => {
      const dataWithManySymptoms = {
        ...mockConsultationData,
        symptoms: "symptom1, symptom2, symptom3, symptom4, symptom5, symptom6, symptom7",
      };
      
      const result = generateInfographicContent(dataWithManySymptoms, mockAnalysis);
      
      expect(result.symptoms.length).toBeLessThanOrEqual(5);
    });

    it("should extract recommendations from analysis", () => {
      const result = generateInfographicContent(mockConsultationData, mockAnalysis);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("generateSlideDeckContent", () => {
    it("should generate multiple slides with different types", () => {
      const result = generateSlideDeckContent(mockConsultationData, mockAnalysis);
      
      expect(result.slides.length).toBeGreaterThan(5);
      
      const slideTypes = result.slides.map(s => s.type);
      expect(slideTypes).toContain("title");
      expect(slideTypes).toContain("content");
      expect(slideTypes).toContain("visual");
    });

    it("should include overview slide with urgency level", () => {
      const result = generateSlideDeckContent(mockConsultationData, mockAnalysis);
      
      const overviewSlide = result.slides.find(s => s.id === "overview");
      expect(overviewSlide).toBeDefined();
      expect(overviewSlide?.content).toContain("HIGH");
    });

    it("should include diagnosis slide when diagnosis is present", () => {
      const result = generateSlideDeckContent(mockConsultationData, mockAnalysis);
      
      const diagnosisSlide = result.slides.find(s => s.id === "diagnosis");
      expect(diagnosisSlide).toBeDefined();
      expect(diagnosisSlide?.content).toContain("viral infection");
    });

    it("should include next steps slide", () => {
      const result = generateSlideDeckContent(mockConsultationData, mockAnalysis);
      
      const nextStepsSlide = result.slides.find(s => s.id === "next-steps");
      expect(nextStepsSlide).toBeDefined();
      expect(nextStepsSlide?.content).toContain("1.");
    });

    it("should format symptoms as numbered list", () => {
      const result = generateSlideDeckContent(mockConsultationData, mockAnalysis);
      
      const symptomsSlide = result.slides.find(s => s.id === "symptoms");
      expect(symptomsSlide).toBeDefined();
      expect(symptomsSlide?.content).toMatch(/1\./);
      expect(symptomsSlide?.content).toMatch(/2\./);
    });
  });

  describe("Arabic language support", () => {
    const arabicData = {
      ...mockConsultationData,
      preferredLanguage: "ar",
    };

    it("should generate Arabic infographic content", () => {
      const result = generateInfographicContent(arabicData, mockAnalysis);
      
      expect(result.language).toBe("ar");
      expect(result.title).toContain("ملخص");
    });

    it("should generate Arabic slide deck content", () => {
      const result = generateSlideDeckContent(arabicData, mockAnalysis);
      
      expect(result.language).toBe("ar");
      expect(result.slides[0].title).toContain("التقرير");
    });
  });
});
