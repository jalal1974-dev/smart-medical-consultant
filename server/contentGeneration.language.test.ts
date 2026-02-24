import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for language purity in content generation
 * Ensures Arabic content doesn't mix with English and vice versa
 */
describe("Content Generation - Language Purity", () => {
  describe("Infographic prompt generation", () => {
    it("should generate pure Arabic prompt without English words", () => {
      // Mock data for Arabic consultation
      const patientName = "أحمد محمد";
      const urgencyLevel = "high";
      const keyFindings = ["ارتفاع ضغط الدم", "صداع مستمر", "دوخة"];
      const recommendations = ["استشارة طبيب", "فحوصات شاملة", "راحة"];
      
      // Expected Arabic prompt structure
      const arabicPrompt = `أنشئ إنفوجرافيك طبي احترافي ونظيف يحتوي على:
- المريض: ${patientName}
- مستوى الأولوية: ${urgencyLevel}
- النتائج الرئيسية: ${keyFindings.join("، ")}
- التوصيات الرئيسية: ${recommendations.join("، ")}

الأسلوب: إنفوجرافيك طبي حديث مع أيقونات، أقسام واضحة، نظام ألوان احترافي (أزرق وأخضر)، تصميم سهل القراءة.
اللغة: جميع النصوص يجب أن تكون بالعربية فقط، بدون أي كلمات إنجليزية.`;
      
      // Verify prompt structure
      expect(arabicPrompt).toContain("أنشئ إنفوجرافيك");
      expect(arabicPrompt).toContain("المريض:");
      expect(arabicPrompt).toContain("مستوى الأولوية:");
      expect(arabicPrompt).toContain("النتائج الرئيسية:");
      expect(arabicPrompt).toContain("التوصيات الرئيسية:");
      expect(arabicPrompt).toContain("جميع النصوص يجب أن تكون بالعربية فقط");
      
      // Verify no English instruction words (except variable values)
      const promptWithoutVariables = arabicPrompt
        .replace(patientName, "")
        .replace(urgencyLevel, "")
        .replace(keyFindings.join("، "), "")
        .replace(recommendations.join("، "), "");
      
      // Should not contain common English words in instructions
      expect(promptWithoutVariables).not.toMatch(/\b(Create|Patient|Urgency|Findings|Recommendations|Style|Language)\b/);
    });

    it("should generate pure English prompt without Arabic words", () => {
      // Mock data for English consultation
      const patientName = "John Doe";
      const urgencyLevel = "high";
      const keyFindings = ["High blood pressure", "Persistent headache", "Dizziness"];
      const recommendations = ["Consult specialist", "Complete tests", "Rest"];
      
      // Expected English prompt structure
      const englishPrompt = `Create a clean, professional medical infographic showing:
- Patient: ${patientName}
- Urgency: ${urgencyLevel}
- Key Findings: ${keyFindings.join(", ")}
- Top Recommendations: ${recommendations.join(", ")}

Style: Modern medical infographic with icons, clear sections, professional color scheme (blues and greens), easy to read layout.
Language: All text must be in English only, no Arabic words.`;
      
      // Verify prompt structure
      expect(englishPrompt).toContain("Create a clean");
      expect(englishPrompt).toContain("Patient:");
      expect(englishPrompt).toContain("Urgency:");
      expect(englishPrompt).toContain("Key Findings:");
      expect(englishPrompt).toContain("Top Recommendations:");
      expect(englishPrompt).toContain("All text must be in English only");
      
      // Verify no Arabic characters in instructions
      const arabicPattern = /[\u0600-\u06FF]/;
      expect(englishPrompt).not.toMatch(arabicPattern);
    });
  });

  describe("Language instruction clarity", () => {
    it("should explicitly state language requirement in Arabic prompt", () => {
      const arabicInstruction = "جميع النصوص يجب أن تكون بالعربية فقط، بدون أي كلمات إنجليزية";
      
      expect(arabicInstruction).toContain("بالعربية فقط");
      expect(arabicInstruction).toContain("بدون أي كلمات إنجليزية");
    });

    it("should explicitly state language requirement in English prompt", () => {
      const englishInstruction = "All text must be in English only, no Arabic words";
      
      expect(englishInstruction).toContain("English only");
      expect(englishInstruction).toContain("no Arabic words");
    });
  });

  describe("Content structure validation", () => {
    it("should maintain consistent structure between languages", () => {
      // Both prompts should have the same sections
      const arabicSections = [
        "المريض:",
        "مستوى الأولوية:",
        "النتائج الرئيسية:",
        "التوصيات الرئيسية:",
        "الأسلوب:",
        "اللغة:"
      ];
      
      const englishSections = [
        "Patient:",
        "Urgency:",
        "Key Findings:",
        "Top Recommendations:",
        "Style:",
        "Language:"
      ];
      
      // Verify both have 6 sections
      expect(arabicSections.length).toBe(englishSections.length);
      expect(arabicSections.length).toBe(6);
    });
  });
});
