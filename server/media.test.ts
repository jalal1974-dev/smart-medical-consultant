import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Media Management", () => {
  describe("admin.createMedia", () => {
    it("should allow admin to create video content", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.createMedia({
        type: "video",
        titleEn: "Understanding Heart Health",
        titleAr: "فهم صحة القلب",
        descriptionEn: "Learn about maintaining a healthy heart",
        descriptionAr: "تعلم كيفية الحفاظ على قلب صحي",
        mediaUrl: "https://youtube.com/watch?v=test123",
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        duration: 600,
        language: "both",
        isPublished: true,
      });

      expect(result.success).toBe(true);
      expect(result.mediaId).toBeDefined();
    });

    it("should allow admin to create podcast content", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.createMedia({
        type: "podcast",
        titleEn: "Medical Insights Podcast",
        titleAr: "بودكاست رؤى طبية",
        descriptionEn: "Weekly medical insights and discussions",
        descriptionAr: "رؤى ومناقشات طبية أسبوعية",
        mediaUrl: "https://soundcloud.com/test-podcast",
        language: "en",
        isPublished: false,
      });

      expect(result.success).toBe(true);
      expect(result.mediaId).toBeDefined();
    });

    it("should reject non-admin media creation", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.createMedia({
          type: "video",
          titleEn: "Test Video",
          titleAr: "فيديو تجريبي",
          mediaUrl: "https://youtube.com/watch?v=test",
          language: "en",
          isPublished: true,
        })
      ).rejects.toThrow("Admin access required");
    });

    it("should validate required fields", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      // Missing titleAr
      await expect(
        caller.admin.createMedia({
          type: "video",
          titleEn: "Test",
          titleAr: "",
          mediaUrl: "https://youtube.com/watch?v=test",
          language: "en",
          isPublished: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("media.videos", () => {
    it("should return published videos for public access", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Create and publish a video first
      const adminCtx = createAuthContext("admin");
      const adminCaller = appRouter.createCaller(adminCtx);
      
      await adminCaller.admin.createMedia({
        type: "video",
        titleEn: "Public Video",
        titleAr: "فيديو عام",
        mediaUrl: "https://youtube.com/watch?v=public",
        language: "both",
        isPublished: true,
      });

      const videos = await caller.media.videos();
      
      expect(Array.isArray(videos)).toBe(true);
      // All returned videos should be published
      videos.forEach(video => {
        expect(video.isPublished).toBe(true);
        expect(video.type).toBe("video");
      });
    });
  });

  describe("media.podcasts", () => {
    it("should return published podcasts for public access", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const podcasts = await caller.media.podcasts();
      
      expect(Array.isArray(podcasts)).toBe(true);
      // All returned podcasts should be published
      podcasts.forEach(podcast => {
        expect(podcast.isPublished).toBe(true);
        expect(podcast.type).toBe("podcast");
      });
    });
  });

  describe("admin.updateMedia", () => {
    it("should allow admin to update media content", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      // Create media first
      const createResult = await caller.admin.createMedia({
        type: "video",
        titleEn: "Original Title",
        titleAr: "العنوان الأصلي",
        mediaUrl: "https://youtube.com/watch?v=original",
        language: "en",
        isPublished: false,
      });

      // Update media
      const updateResult = await caller.admin.updateMedia({
        id: createResult.mediaId,
        titleEn: "Updated Title",
        isPublished: true,
      });

      expect(updateResult.success).toBe(true);
    });
  });

  describe("admin.deleteMedia", () => {
    it("should allow admin to delete media content", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      // Create media first
      const createResult = await caller.admin.createMedia({
        type: "video",
        titleEn: "To Be Deleted",
        titleAr: "سيتم حذفه",
        mediaUrl: "https://youtube.com/watch?v=delete",
        language: "en",
        isPublished: false,
      });

      // Delete media
      const deleteResult = await caller.admin.deleteMedia({
        id: createResult.mediaId,
      });

      expect(deleteResult.success).toBe(true);
    });

    it("should reject non-admin deletion", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.deleteMedia({ id: 1 })
      ).rejects.toThrow("Admin access required");
    });
  });

  describe("media.incrementViews", () => {
    it("should increment view count for media", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Create and publish media
      const adminCtx = createAuthContext("admin");
      const adminCaller = appRouter.createCaller(adminCtx);
      
      const createResult = await adminCaller.admin.createMedia({
        type: "video",
        titleEn: "View Count Test",
        titleAr: "اختبار عدد المشاهدات",
        mediaUrl: "https://youtube.com/watch?v=views",
        language: "en",
        isPublished: true,
      });

      // Increment views
      const result = await caller.media.incrementViews({
        id: createResult.mediaId,
      });

      expect(result.success).toBe(true);
    });
  });
});
