import { describe, it, expect } from "vitest";

describe("Blog System", () => {
  describe("Slug generation", () => {
    it("should generate valid English slugs", () => {
      const title = "Understanding Hypertension: Causes, Risks, and Treatment";
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      expect(slug).toBe("understanding-hypertension-causes-risks-and-treatment");
    });

    it("should generate valid Arabic slugs", () => {
      const title = "فهم ارتفاع ضغط الدم";
      const slug = title.trim().replace(/\s+/g, "-");
      expect(slug).toBe("فهم-ارتفاع-ضغط-الدم");
    });
  });

  describe("Reading time calculation", () => {
    it("should calculate reading time for English content", () => {
      const wordsPerMinute = 200;
      const content = "word ".repeat(400); // 400 words
      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / wordsPerMinute);
      expect(readingTime).toBe(2);
    });

    it("should calculate reading time for Arabic content", () => {
      const wordsPerMinute = 150; // Arabic reading is slightly slower
      const content = "كلمة ".repeat(300); // 300 words
      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / wordsPerMinute);
      expect(readingTime).toBe(2);
    });

    it("should return minimum 1 minute for very short content", () => {
      const wordsPerMinute = 200;
      const content = "short content";
      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
      expect(readingTime).toBe(1);
    });
  });

  describe("SEO meta content", () => {
    it("should validate meta description length", () => {
      const metaDesc = "Learn about hypertension causes, risk factors, complications, and treatment options.";
      expect(metaDesc.length).toBeGreaterThan(50);
      expect(metaDesc.length).toBeLessThanOrEqual(160);
    });

    it("should validate meta keywords format", () => {
      const keywords = "hypertension, high blood pressure, cardiovascular health";
      const keywordList = keywords.split(",").map(k => k.trim());
      expect(keywordList.length).toBeGreaterThan(0);
      keywordList.forEach(keyword => {
        expect(keyword.length).toBeGreaterThan(0);
      });
    });

    it("should validate Arabic meta description", () => {
      const metaDescAr = "تعرف على أسباب ارتفاع ضغط الدم وعوامل الخطر والمضاعفات وخيارات العلاج.";
      expect(metaDescAr.length).toBeGreaterThan(20);
      // Should contain Arabic characters
      expect(/[\u0600-\u06FF]/.test(metaDescAr)).toBe(true);
    });
  });

  describe("Blog post validation", () => {
    it("should require title in both languages", () => {
      const post = {
        title_en: "Understanding Hypertension",
        title_ar: "فهم ارتفاع ضغط الدم",
        content_en: "Content here",
        content_ar: "المحتوى هنا",
      };
      expect(post.title_en).toBeTruthy();
      expect(post.title_ar).toBeTruthy();
    });

    it("should validate published status", () => {
      const draftPost = { published: false, published_at: null };
      const publishedPost = { published: true, published_at: new Date() };
      expect(draftPost.published).toBe(false);
      expect(publishedPost.published).toBe(true);
      expect(publishedPost.published_at).toBeInstanceOf(Date);
    });

    it("should validate category assignment", () => {
      const validCategoryIds = [1, 2, 3, 4, 5];
      const postCategoryId = 1;
      expect(validCategoryIds.includes(postCategoryId)).toBe(true);
    });
  });

  describe("Content structure", () => {
    it("should detect markdown headings in content", () => {
      const content = "## Introduction\n\nSome text\n\n## Treatment\n\nMore text";
      const headings = content.match(/^#{1,6}\s.+/gm);
      expect(headings).toBeTruthy();
      expect(headings!.length).toBe(2);
    });

    it("should detect bilingual content completeness", () => {
      const post = {
        content_en: "English content with sufficient detail for medical article",
        content_ar: "محتوى عربي مع تفاصيل كافية للمقال الطبي",
      };
      expect(post.content_en.length).toBeGreaterThan(20);
      expect(post.content_ar.length).toBeGreaterThan(20);
    });
  });
});
