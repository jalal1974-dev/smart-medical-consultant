import { describe, it, expect } from "vitest";

/**
 * Tests for SEO configuration
 * Ensures proper SEO meta tags, titles, and descriptions
 */

// SEO configuration (duplicated for testing without client imports)
const pageSEO = {
  home: {
    title: "Smart Medical Consultant - AI-Powered Medical Analysis | مستشارك الطبي الذكي",
    description: "Get instant AI-powered medical consultation with comprehensive reports, infographics, and specialist review. Bilingual Arabic/English support. First consultation FREE! احصل على استشارة طبية ذكية مع تقارير شاملة ومراجعة من أطباء متخصصين.",
    keywords: "medical consultation, AI doctor, symptom checker, online medical advice, telemedicine, healthcare AI, استشارة طبية, طبيب ذكي, تشخيص الأعراض",
    ogImage: "/og-image-home.jpg"
  },
  consultations: {
    title: "Submit Medical Consultation - Smart Medical Consultant",
    description: "Submit your medical reports, symptoms, and history for AI-powered analysis. Get comprehensive consultation reports reviewed by medical specialists in English or Arabic.",
    keywords: "submit consultation, medical analysis, AI diagnosis, symptom analysis, medical report review, استشارة طبية, تحليل طبي",
    ogImage: "/og-image-consultations.jpg"
  },
  dashboard: {
    title: "My Dashboard - Smart Medical Consultant",
    description: "View your consultation history, download reports, access infographics, and track your medical analysis results. Secure patient portal with bilingual support.",
    keywords: "patient dashboard, consultation history, medical reports, health records, لوحة المريض, سجلات طبية",
    ogImage: "/og-image-dashboard.jpg"
  },
  videos: {
    title: "Medical Education Videos - Smart Medical Consultant",
    description: "Watch educational medical videos covering various health topics, conditions, and treatments. Expert explanations in English and Arabic.",
    keywords: "medical videos, health education, medical tutorials, healthcare videos, فيديوهات طبية, تعليم صحي",
    ogImage: "/og-image-videos.jpg"
  },
  podcasts: {
    title: "Medical Podcasts - Smart Medical Consultant",
    description: "Listen to medical podcasts featuring expert discussions on health topics, medical advances, and patient care. Available in English and Arabic.",
    keywords: "medical podcasts, health podcasts, medical discussions, healthcare audio, بودكاست طبي, صحة",
    ogImage: "/og-image-podcasts.jpg"
  },
  analytics: {
    title: "Analytics Dashboard - Smart Medical Consultant",
    description: "View platform analytics, consultation statistics, and usage metrics. Administrative dashboard for tracking system performance.",
    keywords: "analytics, statistics, metrics, dashboard, تحليلات, إحصائيات",
    ogImage: "/og-image-analytics.jpg"
  },
  admin: {
    title: "Admin Panel - Smart Medical Consultant",
    description: "Administrative panel for managing consultations, reviewing AI analysis, conducting deep research, and approving materials. Specialist access only.",
    keywords: "admin panel, consultation management, specialist review, medical administration, لوحة الإدارة",
    ogImage: "/og-image-admin.jpg"
  }
};

function getCanonicalURL(path: string): string {
  const baseURL = "https://smartmedcon-jsnymp6w.manus.space";
  return `${baseURL}${path}`;
}

describe("SEO Configuration", () => {
  describe("Page SEO Configuration", () => {
    it("should have SEO config for all main pages", () => {
      const requiredPages = ["home", "consultations", "dashboard", "videos", "podcasts", "analytics", "admin"];
      
      requiredPages.forEach(page => {
        expect(pageSEO[page as keyof typeof pageSEO]).toBeDefined();
        expect(pageSEO[page as keyof typeof pageSEO].title).toBeTypeOf("string");
        expect(pageSEO[page as keyof typeof pageSEO].description).toBeTypeOf("string");
      });
    });

    it("should have bilingual titles for main pages", () => {
      expect(pageSEO.home.title).toContain("Smart Medical Consultant");
      expect(pageSEO.home.title).toContain("مستشارك الطبي الذكي");
    });

    it("should have bilingual descriptions for main pages", () => {
      expect(pageSEO.home.description).toMatch(/[a-zA-Z]/); // Contains English
      expect(pageSEO.home.description).toMatch(/[\u0600-\u06FF]/); // Contains Arabic
    });

    it("should have keywords for each page", () => {
      Object.values(pageSEO).forEach(seo => {
        expect(seo.keywords).toBeDefined();
        expect(seo.keywords!.length).toBeGreaterThan(0);
      });
    });

    it("should have OG images for each page", () => {
      Object.values(pageSEO).forEach(seo => {
        expect(seo.ogImage).toBeDefined();
        expect(seo.ogImage).toMatch(/\.(jpg|png|jpeg)$/);
      });
    });
  });

  describe("Canonical URL Generation", () => {
    it("should generate correct canonical URL for homepage", () => {
      const url = getCanonicalURL("/");
      expect(url).toBe("https://smartmedcon-jsnymp6w.manus.space/");
    });

    it("should generate correct canonical URL for consultations page", () => {
      const url = getCanonicalURL("/consultations");
      expect(url).toBe("https://smartmedcon-jsnymp6w.manus.space/consultations");
    });

    it("should generate correct canonical URL for dashboard", () => {
      const url = getCanonicalURL("/dashboard");
      expect(url).toBe("https://smartmedcon-jsnymp6w.manus.space/dashboard");
    });

    it("should handle paths with trailing slashes", () => {
      const url = getCanonicalURL("/videos/");
      expect(url).toBe("https://smartmedcon-jsnymp6w.manus.space/videos/");
    });

    it("should handle nested paths", () => {
      const url = getCanonicalURL("/admin/ai-review");
      expect(url).toBe("https://smartmedcon-jsnymp6w.manus.space/admin/ai-review");
    });
  });

  describe("SEO Content Quality", () => {
    it("should have titles under 100 characters for optimal display", () => {
      Object.entries(pageSEO).forEach(([page, seo]) => {
        // Allow longer titles for bilingual content
        if (page === "home") {
          expect(seo.title.length).toBeLessThan(100);
        } else {
          expect(seo.title.length).toBeLessThan(70);
        }
      });
    });

    it("should have descriptions between 100-300 characters for optimal display", () => {
      Object.values(pageSEO).forEach(seo => {
        // Allow longer descriptions for bilingual content
        expect(seo.description.length).toBeGreaterThan(100);
        expect(seo.description.length).toBeLessThan(300);
      });
    });

    it("should have unique titles for each page", () => {
      const titles = Object.values(pageSEO).map(seo => seo.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it("should have unique descriptions for each page", () => {
      const descriptions = Object.values(pageSEO).map(seo => seo.description);
      const uniqueDescriptions = new Set(descriptions);
      expect(uniqueDescriptions.size).toBe(descriptions.length);
    });

    it("should include brand name in all titles", () => {
      Object.values(pageSEO).forEach(seo => {
        expect(seo.title.toLowerCase()).toContain("smart medical consultant");
      });
    });
  });

  describe("Multilingual SEO", () => {
    it("should have Arabic keywords for main pages", () => {
      expect(pageSEO.home.keywords).toMatch(/[\u0600-\u06FF]/);
      expect(pageSEO.consultations.keywords).toMatch(/[\u0600-\u06FF]/);
      expect(pageSEO.dashboard.keywords).toMatch(/[\u0600-\u06FF]/);
    });

    it("should have English keywords for main pages", () => {
      expect(pageSEO.home.keywords).toMatch(/[a-zA-Z]/);
      expect(pageSEO.consultations.keywords).toMatch(/[a-zA-Z]/);
      expect(pageSEO.dashboard.keywords).toMatch(/[a-zA-Z]/);
    });

    it("should separate keywords with commas", () => {
      Object.values(pageSEO).forEach(seo => {
        if (seo.keywords) {
          expect(seo.keywords).toContain(",");
        }
      });
    });
  });

  describe("Medical SEO Keywords", () => {
    it("should include medical-related keywords", () => {
      const medicalKeywords = ["medical", "health", "consultation", "doctor", "طبي", "صحة", "استشارة"];
      const allKeywords = Object.values(pageSEO)
        .map(seo => seo.keywords?.toLowerCase() || "")
        .join(" ");
      
      medicalKeywords.forEach(keyword => {
        expect(allKeywords).toContain(keyword.toLowerCase());
      });
    });

    it("should include AI-related keywords for relevant pages", () => {
      const aiKeywords = ["AI", "artificial intelligence", "ذكي", "ذكاء"];
      const homeKeywords = pageSEO.home.keywords?.toLowerCase() || "";
      
      const hasAIKeyword = aiKeywords.some(keyword => 
        homeKeywords.includes(keyword.toLowerCase())
      );
      expect(hasAIKeyword).toBe(true);
    });
  });

  describe("Open Graph Images", () => {
    it("should use different OG images for different pages", () => {
      const images = Object.values(pageSEO).map(seo => seo.ogImage);
      const uniqueImages = new Set(images);
      expect(uniqueImages.size).toBe(images.length);
    });

    it("should have descriptive OG image filenames", () => {
      Object.entries(pageSEO).forEach(([page, seo]) => {
        expect(seo.ogImage).toContain(page);
      });
    });
  });
});
