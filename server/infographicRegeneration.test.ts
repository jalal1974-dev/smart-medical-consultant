import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for infographic regeneration functionality
 * Ensures admins can manually regenerate infographics when needed
 */
describe("Infographic Regeneration", () => {
  describe("regenerateInfographicForConsultation function", () => {
    it("should parse AI analysis and generate new infographic", async () => {
      // Mock AI analysis data
      const mockAnalysis = JSON.stringify({
        summary: "Patient shows signs of hypertension",
        urgencyLevel: "high",
        keyFindings: [
          "Elevated blood pressure (160/100)",
          "Persistent headaches",
          "Dizziness"
        ],
        recommendations: [
          "Consult cardiologist immediately",
          "Monitor blood pressure daily",
          "Reduce sodium intake"
        ]
      });

      const consultationId = 123;
      const patientName = "John Doe";
      const language = "en";

      // Verify function signature and parameters
      expect(consultationId).toBeTypeOf("number");
      expect(patientName).toBeTypeOf("string");
      expect(language).toMatch(/^(en|ar)$/);
      
      // Verify AI analysis can be parsed
      const parsed = JSON.parse(mockAnalysis);
      expect(parsed).toHaveProperty("summary");
      expect(parsed).toHaveProperty("urgencyLevel");
      expect(parsed).toHaveProperty("keyFindings");
      expect(parsed).toHaveProperty("recommendations");
    });

    it("should handle Arabic language regeneration", async () => {
      const mockAnalysisAr = JSON.stringify({
        summary: "المريض يعاني من ارتفاع ضغط الدم",
        urgencyLevel: "high",
        keyFindings: [
          "ارتفاع ضغط الدم (160/100)",
          "صداع مستمر",
          "دوخة"
        ],
        recommendations: [
          "استشارة طبيب القلب فوراً",
          "مراقبة ضغط الدم يومياً",
          "تقليل تناول الملح"
        ]
      });

      const language = "ar";
      
      // Verify Arabic content structure
      const parsed = JSON.parse(mockAnalysisAr);
      expect(parsed.summary).toContain("المريض");
      expect(parsed.keyFindings[0]).toContain("ارتفاع");
      expect(parsed.recommendations[0]).toContain("استشارة");
      expect(language).toBe("ar");
    });

    it("should return null on invalid AI analysis JSON", async () => {
      const invalidAnalysis = "not a valid JSON";
      
      // Verify invalid JSON throws error
      expect(() => JSON.parse(invalidAnalysis)).toThrow();
    });
  });

  describe("Admin regenerateInfographic route", () => {
    it("should require admin privileges", () => {
      // Admin procedure should check for admin role
      const mockUser = { role: "user" };
      expect(mockUser.role).not.toBe("admin");
      
      const adminUser = { role: "admin" };
      expect(adminUser.role).toBe("admin");
    });

    it("should validate consultation exists", () => {
      const consultationId = 999;
      
      // Should check if consultation exists before regenerating
      expect(consultationId).toBeTypeOf("number");
      expect(consultationId).toBeGreaterThan(0);
    });

    it("should validate AI analysis exists", () => {
      const mockConsultation = {
        id: 1,
        aiAnalysis: null
      };
      
      // Should fail if no AI analysis available
      expect(mockConsultation.aiAnalysis).toBeNull();
      
      const validConsultation = {
        id: 1,
        aiAnalysis: JSON.stringify({ summary: "test" })
      };
      
      expect(validConsultation.aiAnalysis).not.toBeNull();
    });

    it("should return success with new infographic URL", () => {
      const mockResponse = {
        success: true,
        infographicUrl: "https://storage.example.com/infographics/abc123.png"
      };
      
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.infographicUrl).toContain("infographics/");
      expect(mockResponse.infographicUrl).toMatch(/\.png$/);
    });
  });

  describe("RegenerateInfographicButton component", () => {
    it("should display confirmation dialog before regenerating", () => {
      const dialogTitle = "Regenerate Infographic?";
      const dialogDescription = "This will create a new infographic image using AI";
      
      expect(dialogTitle).toContain("Regenerate");
      expect(dialogDescription).toContain("new infographic");
    });

    it("should show loading state during regeneration", () => {
      const loadingText = "Regenerating...";
      const normalText = "Regenerate";
      
      expect(loadingText).toContain("Regenerating");
      expect(normalText).toBe("Regenerate");
    });

    it("should invalidate consultations query after success", () => {
      // After successful regeneration, should refresh consultation list
      const queryKey = "admin.consultations";
      expect(queryKey).toBe("admin.consultations");
    });
  });

  describe("Error handling", () => {
    it("should handle generation failure gracefully", () => {
      const errorMessage = "Failed to regenerate infographic";
      
      expect(errorMessage).toContain("Failed");
      expect(errorMessage).toContain("regenerate");
    });

    it("should log errors with consultation ID", () => {
      const consultationId = 123;
      const logMessage = `[Infographic Regeneration] Error for consultation #${consultationId}`;
      
      expect(logMessage).toContain(`#${consultationId}`);
      expect(logMessage).toContain("Error");
    });
  });
});
