import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Watch History", () => {
  let testUserId: number;
  let testVideoId: number;
  let testPodcastId: number;

  beforeAll(async () => {
    // Create a test user
    const testUser = {
      openId: `test-watch-history-${Date.now()}`,
      name: "Watch History Test User",
      email: `watch-test-${Date.now()}@example.com`,
    };
    await db.upsertUser(testUser);
    const user = await db.getUserByOpenId(testUser.openId);
    testUserId = user!.id;

    // Create test video
    testVideoId = await db.createVideo({
      titleEn: "Test Video for Watch History",
      titleAr: "فيديو اختبار لسجل المشاهدة",
      descriptionEn: "Test video description",
      descriptionAr: "وصف فيديو الاختبار",
      videoUrl: "https://example.com/test-video.mp4",
      thumbnailUrl: "https://example.com/test-thumb.jpg",
      duration: 300,
    });

    // Create test podcast
    testPodcastId = await db.createPodcast({
      titleEn: "Test Podcast for Watch History",
      titleAr: "بودكاست اختبار لسجل المشاهدة",
      descriptionEn: "Test podcast description",
      descriptionAr: "وصف بودكاست الاختبار",
      audioUrl: "https://example.com/test-podcast.mp3",
      thumbnailUrl: "https://example.com/test-thumb.jpg",
      duration: 600,
    });
  });

  it("should save video watch progress", async () => {
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "video",
      mediaId: testVideoId,
      progress: 150,
      duration: 300,
    });

    const history = await db.getUserWatchHistory(testUserId);
    const videoHistory = history.find(
      (h) => h.mediaType === "video" && h.mediaId === testVideoId
    );

    expect(videoHistory).toBeDefined();
    expect(videoHistory?.progress).toBe(150);
    expect(videoHistory?.duration).toBe(300);
    expect(videoHistory?.completed).toBe(false);
  });

  it("should save podcast watch progress", async () => {
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "podcast",
      mediaId: testPodcastId,
      progress: 300,
      duration: 600,
    });

    const history = await db.getUserWatchHistory(testUserId);
    const podcastHistory = history.find(
      (h) => h.mediaType === "podcast" && h.mediaId === testPodcastId
    );

    expect(podcastHistory).toBeDefined();
    expect(podcastHistory?.progress).toBe(300);
    expect(podcastHistory?.duration).toBe(600);
    expect(podcastHistory?.completed).toBe(false);
  });

  it("should mark video as completed when progress >= 90%", async () => {
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "video",
      mediaId: testVideoId,
      progress: 280, // 93% of 300
      duration: 300,
    });

    const history = await db.getUserWatchHistory(testUserId);
    const videoHistory = history.find(
      (h) => h.mediaType === "video" && h.mediaId === testVideoId
    );

    expect(videoHistory?.completed).toBe(true);
  });

  it("should update existing watch history record", async () => {
    // First save
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "video",
      mediaId: testVideoId,
      progress: 100,
      duration: 300,
    });

    // Update with new progress
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "video",
      mediaId: testVideoId,
      progress: 200,
      duration: 300,
    });

    const history = await db.getUserWatchHistory(testUserId);
    const videoHistory = history.filter(
      (h) => h.mediaType === "video" && h.mediaId === testVideoId
    );

    // Should only have one record (updated, not duplicated)
    expect(videoHistory.length).toBe(1);
    expect(videoHistory[0].progress).toBe(200);
  });

  it("should return continue watching items (incomplete only)", async () => {
    // Save incomplete video
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "video",
      mediaId: testVideoId,
      progress: 50,
      duration: 300,
    });

    // Save completed podcast
    await db.upsertWatchHistory({
      userId: testUserId,
      mediaType: "podcast",
      mediaId: testPodcastId,
      progress: 600,
      duration: 600,
    });

    const continueWatching = await db.getContinueWatching(testUserId);

    // Should only include incomplete items
    const hasIncompleteVideo = continueWatching.some(
      (item) => item.mediaType === "video" && item.mediaId === testVideoId
    );
    const hasCompletedPodcast = continueWatching.some(
      (item) => item.mediaType === "podcast" && item.mediaId === testPodcastId
    );

    expect(hasIncompleteVideo).toBe(true);
    expect(hasCompletedPodcast).toBe(false);
  });

  it("should include media details in watch history", async () => {
    const history = await db.getUserWatchHistory(testUserId);
    const videoHistory = history.find(
      (h) => h.mediaType === "video" && h.mediaId === testVideoId
    );

    expect(videoHistory?.media).toBeDefined();
    expect((videoHistory?.media as any)?.titleEn).toBe("Test Video for Watch History");
  });
});
