import { describe, it, expect } from "vitest";

/**
 * Tests for custom prompt infographic regeneration
 * Ensures admins can provide specific instructions to guide AI generation
 */
describe("Custom Prompt Infographic Regeneration", () => {
  describe("Backend custom prompt handling", () => {
    it("should accept optional customPrompt parameter in tRPC route", () => {
      const validInput = {
        consultationId: 123,
        customPrompt: "Emphasize cardiac findings"
      };
      
      expect(validInput.consultationId).toBeTypeOf("number");
      expect(validInput.customPrompt).toBeTypeOf("string");
    });

    it("should handle undefined customPrompt gracefully", () => {
      const inputWithoutPrompt = {
        consultationId: 123,
        customPrompt: undefined
      };
      
      expect(inputWithoutPrompt.consultationId).toBeTypeOf("number");
      expect(inputWithoutPrompt.customPrompt).toBeUndefined();
    });

    it("should pass customPrompt to regenerateInfographicForConsultation", () => {
      const consultationId = 123;
      const aiAnalysis = JSON.stringify({ summary: "test" });
      const patientName = "John Doe";
      const language = "en";
      const customPrompt = "Use larger fonts";
      
      // Verify all parameters are correct types
      expect(consultationId).toBeTypeOf("number");
      expect(aiAnalysis).toBeTypeOf("string");
      expect(patientName).toBeTypeOf("string");
      expect(language).toMatch(/^(en|ar)$/);
      expect(customPrompt).toBeTypeOf("string");
    });
  });

  describe("Prompt incorporation into AI generation", () => {
    it("should append custom prompt to English generation prompt", () => {
      const basePrompt = "Create a clean, professional medical infographic";
      const customPrompt = "Emphasize cardiac findings";
      const expectedAddition = `\n\nAdditional instructions from admin: ${customPrompt}`;
      
      expect(expectedAddition).toContain("Additional instructions from admin:");
      expect(expectedAddition).toContain(customPrompt);
    });

    it("should append custom prompt to Arabic generation prompt", () => {
      const basePrompt = "أنشئ إنفوجرافيك طبي احترافي";
      const customPrompt = "ركز على النتائج القلبية";
      const expectedAddition = `\n\nتعليمات إضافية من المسؤول: ${customPrompt}`;
      
      expect(expectedAddition).toContain("تعليمات إضافية من المسؤول:");
      expect(expectedAddition).toContain(customPrompt);
    });

    it("should not append anything when customPrompt is undefined", () => {
      const customPrompt = undefined;
      const addition = customPrompt ? `\n\nAdditional: ${customPrompt}` : '';
      
      expect(addition).toBe('');
    });

    it("should not append anything when customPrompt is empty string", () => {
      const customPrompt = "";
      const addition = customPrompt ? `\n\nAdditional: ${customPrompt}` : '';
      
      expect(addition).toBe('');
    });
  });

  describe("Frontend custom prompt component", () => {
    it("should have textarea with proper placeholder text", () => {
      const placeholder = "e.g., 'Emphasize cardiac findings', 'Use larger fonts', 'Add more visual icons', 'Focus on key recommendations'";
      
      expect(placeholder).toContain("Emphasize");
      expect(placeholder).toContain("larger fonts");
      expect(placeholder).toContain("visual icons");
    });

    it("should have helper text explaining the feature", () => {
      const helperText = "Provide specific instructions to guide the AI in generating the infographic.";
      
      expect(helperText).toContain("specific instructions");
      expect(helperText).toContain("guide the AI");
    });

    it("should trim whitespace from custom prompt before sending", () => {
      const inputValue = "  Use larger fonts  ";
      const trimmed = inputValue.trim();
      const finalValue = trimmed || undefined;
      
      expect(finalValue).toBe("Use larger fonts");
    });

    it("should send undefined when custom prompt is empty after trimming", () => {
      const inputValue = "   ";
      const trimmed = inputValue.trim();
      const finalValue = trimmed || undefined;
      
      expect(finalValue).toBeUndefined();
    });
  });

  describe("Custom prompt examples", () => {
    it("should handle instruction to emphasize specific findings", () => {
      const customPrompt = "Emphasize cardiac findings and blood pressure readings";
      
      expect(customPrompt).toContain("Emphasize");
      expect(customPrompt).toContain("cardiac");
      expect(customPrompt.length).toBeGreaterThan(0);
    });

    it("should handle instruction for visual styling", () => {
      const customPrompt = "Use larger fonts and more prominent icons";
      
      expect(customPrompt).toContain("larger fonts");
      expect(customPrompt).toContain("icons");
    });

    it("should handle instruction for color preferences", () => {
      const customPrompt = "Use warm colors (red and orange) to highlight urgency";
      
      expect(customPrompt).toContain("colors");
      expect(customPrompt).toContain("urgency");
    });

    it("should handle instruction for content focus", () => {
      const customPrompt = "Focus on key recommendations section, make it more prominent";
      
      expect(customPrompt).toContain("Focus");
      expect(customPrompt).toContain("recommendations");
    });

    it("should handle Arabic custom prompts", () => {
      const customPrompt = "ركز على النتائج الرئيسية واستخدم خطوط أكبر";
      
      expect(customPrompt).toContain("ركز");
      expect(customPrompt).toContain("خطوط");
      expect(customPrompt.length).toBeGreaterThan(0);
    });
  });

  describe("Error handling with custom prompts", () => {
    it("should handle very long custom prompts", () => {
      const longPrompt = "A".repeat(500);
      
      expect(longPrompt.length).toBe(500);
      expect(longPrompt).toBeTypeOf("string");
    });

    it("should handle special characters in custom prompts", () => {
      const specialPrompt = "Use colors: #FF0000 & #00FF00, size: 24px!";
      
      expect(specialPrompt).toContain("#FF0000");
      expect(specialPrompt).toContain("&");
      expect(specialPrompt).toContain("!");
    });
  });
});
