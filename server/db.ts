import { eq, desc, and, sql, gte, lte, inArray, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, consultations, InsertConsultation, videos, podcasts, InsertVideo, InsertPodcast, consultationQuestions, InsertConsultationQuestion, watchHistory, InsertWatchHistory, satisfactionSurveys, researchTopics, blogCategories, blogPosts, InsertBlogCategory, InsertBlogPost, userMedicalRecords, UserMedicalRecord, consultationAttachedRecords, ConsultationAttachedRecord } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User Functions ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function markFreeConsultationUsed(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ hasUsedFreeConsultation: true }).where(eq(users.id, userId));
}

/**
 * Increment the free consultations used counter for a user.
 * Returns the updated counts so the caller can decide if quota is exceeded.
 */
export async function incrementFreeConsultationsUsed(userId: number): Promise<{ used: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Atomic increment via raw SQL
  await db.execute(
    sql`UPDATE users SET free_consultations_used = free_consultations_used + 1, hasUsedFreeConsultation = 1 WHERE id = ${userId}`
  );

  const rows = await db.execute(sql`SELECT free_consultations_used, free_consultations_total FROM users WHERE id = ${userId}`);
  const row = (rows as any)[0]?.[0] ?? (rows as any)?.[0];
  return {
    used: Number(row?.free_consultations_used ?? 1),
    total: Number(row?.free_consultations_total ?? 1),
  };
}

/**
 * Check whether a user still has free consultations remaining.
 */
export async function getUserFreeQuota(userId: number): Promise<{ used: number; total: number; hasRemaining: boolean }> {
  const db = await getDb();
  if (!db) return { used: 0, total: 1, hasRemaining: true };

  const rows = await db.execute(sql`SELECT free_consultations_used, free_consultations_total FROM users WHERE id = ${userId}`);
  const row = (rows as any)[0]?.[0] ?? (rows as any)?.[0];
  const used = Number(row?.free_consultations_used ?? 0);
  const total = Number(row?.free_consultations_total ?? 1);
  return { used, total, hasRemaining: used < total };
}

// ==================== Consultation Functions ====================

export async function createConsultation(data: InsertConsultation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(consultations).values(data);
  return result[0].insertId;
}

export async function getConsultationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getConsultationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const userConsultations = await db.select().from(consultations)
    .where(eq(consultations.userId, userId))
    .orderBy(desc(consultations.createdAt));

  // Get questions for each consultation
  const consultationsWithQuestions = await Promise.all(
    userConsultations.map(async (consultation) => {
      const questions = await getQuestionsByConsultationId(consultation.id);
      return {
        ...consultation,
        questions,
      };
    })
  );

  return consultationsWithQuestions;
}

export async function getAllConsultations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(consultations).orderBy(desc(consultations.createdAt));
}

export async function updateConsultationStatus(id: number, status: typeof consultations.$inferSelect.status) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultations).set({ status, updatedAt: new Date() }).where(eq(consultations.id, id));
}

export async function updateConsultationPayment(id: number, paymentStatus: typeof consultations.$inferSelect.paymentStatus, paymentId?: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultations).set({ 
    paymentStatus, 
    paymentId,
    updatedAt: new Date() 
  }).where(eq(consultations.id, id));
}

export async function updateConsultationAIResults(
  id: number,
  data: {
    aiAnalysis?: string;
    aiReportUrl?: string;
    aiVideoUrl?: string;
    aiInfographicUrl?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultations).set({ 
    ...data,
    status: 'specialist_review',
    updatedAt: new Date() 
  }).where(eq(consultations.id, id));
}

export async function updateConsultationSpecialistReview(
  id: number,
  specialistNotes: string,
  reviewedBy: number
) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultations).set({ 
    specialistNotes,
    reviewedBy,
    reviewedAt: new Date(),
    status: 'completed',
    updatedAt: new Date() 
  }).where(eq(consultations.id, id));
}

export async function updateConsultationFollowUp(
  id: number,
  data: {
    treatmentPlan?: string;
    followUpNotes?: string;
    followUpStatus?: typeof consultations.$inferSelect.followUpStatus;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultations).set({ 
    ...data,
    status: 'follow_up',
    updatedAt: new Date() 
  }).where(eq(consultations.id, id));
}

export async function getConsultationStats() {
  const db = await getDb();
  if (!db) return { total: 0, submitted: 0, processing: 0, completed: 0 };

  const all = await db.select().from(consultations);
  
  return {
    total: all.length,
    submitted: all.filter(c => c.status === 'submitted').length,
    processing: all.filter(c => c.status === 'ai_processing' || c.status === 'specialist_review').length,
    completed: all.filter(c => c.status === 'completed').length,
    followUp: all.filter(c => c.status === 'follow_up').length,
  };
}

// ==================== Video Functions ====================

export async function createVideo(data: InsertVideo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(videos).values(data);
  return result[0].insertId;
}

export async function getAllVideos() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(videos).orderBy(desc(videos.createdAt));
}

export async function getVideoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementVideoViews(id: number) {
  const db = await getDb();
  if (!db) return;

  const video = await getVideoById(id);
  if (video) {
    await db.update(videos).set({ views: video.views + 1 }).where(eq(videos.id, id));
  }
}

export async function updateVideo(id: number, data: Partial<InsertVideo>) {
  const db = await getDb();
  if (!db) return;

  await db.update(videos).set(data).where(eq(videos.id, id));
}

export async function deleteVideo(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(videos).where(eq(videos.id, id));
}

// ==================== Podcast Functions ====================

export async function createPodcast(data: InsertPodcast) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(podcasts).values(data);
  return result[0].insertId;
}

export async function getAllPodcasts() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
}

export async function getPodcastById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(podcasts).where(eq(podcasts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementPodcastViews(id: number) {
  const db = await getDb();
  if (!db) return;

  const podcast = await getPodcastById(id);
  if (podcast) {
    await db.update(podcasts).set({ views: podcast.views + 1 }).where(eq(podcasts.id, id));
  }
}

export async function updatePodcast(id: number, data: Partial<InsertPodcast>) {
  const db = await getDb();
  if (!db) return;

  await db.update(podcasts).set(data).where(eq(podcasts.id, id));
}

export async function deletePodcast(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(podcasts).where(eq(podcasts.id, id));
}

// ==================== Consultation Question Functions ====================

export async function createConsultationQuestion(data: InsertConsultationQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(consultationQuestions).values(data);
  return result[0].insertId;
}

export async function getQuestionsByConsultationId(consultationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(consultationQuestions)
    .where(eq(consultationQuestions.consultationId, consultationId))
    .orderBy(desc(consultationQuestions.createdAt));
}

export async function answerQuestion(id: number, answer: string, answeredBy: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultationQuestions).set({
    answer,
    answeredBy,
    answeredAt: new Date(),
  }).where(eq(consultationQuestions.id, id));
}

// ============================================
// Analytics Functions
// ============================================

export interface ConsultationAnalytics {
  totalConsultations: number;
  freeConsultations: number;
  paidConsultations: number;
  totalRevenue: number;
  averageResponseTime: number; // in hours
  completionRate: number; // percentage
  statusDistribution: {
    submitted: number;
    ai_processing: number;
    specialist_review: number;
    completed: number;
    follow_up: number;
  };
  consultationsByDate: Array<{ date: string; count: number }>;
  revenueByDate: Array<{ date: string; revenue: number }>;
}

export async function getConsultationAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<ConsultationAnalytics> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Apply date filters if provided
  let allConsultations;
  if (startDate && endDate) {
    allConsultations = await db.select().from(consultations).where(
      and(
        gte(consultations.createdAt, startDate),
        lte(consultations.createdAt, endDate)
      )
    );
  } else {
    allConsultations = await db.select().from(consultations);
  }

  // Calculate metrics
  const totalConsultations = allConsultations.length;
  const freeConsultations = allConsultations.filter(c => c.isFree).length;
  const paidConsultations = allConsultations.filter(c => !c.isFree).length;
  const totalRevenue = allConsultations.reduce((sum, c) => sum + Number(c.amount), 0);

  // Calculate average response time (from submission to completion)
  const completedConsultations = allConsultations.filter(c => c.status === "completed");
  let averageResponseTime = 0;
  if (completedConsultations.length > 0) {
    const totalResponseTime = completedConsultations.reduce((sum, c) => {
      const created = new Date(c.createdAt).getTime();
      const updated = new Date(c.updatedAt).getTime();
      return sum + (updated - created);
    }, 0);
    averageResponseTime = totalResponseTime / completedConsultations.length / (1000 * 60 * 60); // Convert to hours
  }

  // Calculate completion rate
  const completionRate = totalConsultations > 0
    ? (completedConsultations.length / totalConsultations) * 100
    : 0;

  // Status distribution
  const statusDistribution = {
    submitted: allConsultations.filter(c => c.status === "submitted").length,
    ai_processing: allConsultations.filter(c => c.status === "ai_processing").length,
    specialist_review: allConsultations.filter(c => c.status === "specialist_review").length,
    completed: allConsultations.filter(c => c.status === "completed").length,
    follow_up: allConsultations.filter(c => c.status === "follow_up").length,
  };

  // Group by date
  const consultationsByDate: { [key: string]: number } = {};
  const revenueByDate: { [key: string]: number } = {};

  allConsultations.forEach(c => {
    const date = new Date(c.createdAt).toISOString().split('T')[0];
    consultationsByDate[date] = (consultationsByDate[date] || 0) + 1;
    revenueByDate[date] = (revenueByDate[date] || 0) + Number(c.amount);
  });

  return {
    totalConsultations,
    freeConsultations,
    paidConsultations,
    totalRevenue,
    averageResponseTime,
    completionRate,
    statusDistribution,
    consultationsByDate: Object.entries(consultationsByDate).map(([date, count]) => ({ date, count })),
    revenueByDate: Object.entries(revenueByDate).map(([date, revenue]) => ({ date, revenue })),
  };
}

export async function getQuestionAnalytics() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const allQuestions = await db.select().from(consultationQuestions);

  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter(q => q.answer !== null).length;
  const unansweredQuestions = totalQuestions - answeredQuestions;

  // Calculate average response time for answered questions
  let averageQuestionResponseTime = 0;
  const questionsWithAnswers = allQuestions.filter(q => q.answer !== null && q.answeredAt !== null);
  if (questionsWithAnswers.length > 0) {
    const totalResponseTime = questionsWithAnswers.reduce((sum, q) => {
      const created = new Date(q.createdAt).getTime();
      const answered = new Date(q.answeredAt!).getTime();
      return sum + (answered - created);
    }, 0);
    averageQuestionResponseTime = totalResponseTime / questionsWithAnswers.length / (1000 * 60 * 60); // Convert to hours
  }

  return {
    totalQuestions,
    answeredQuestions,
    unansweredQuestions,
    averageQuestionResponseTime,
    answerRate: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
  };
}

// ==================== Watch History Functions ====================

export async function upsertWatchHistory(data: {
  userId: number;
  mediaType: "video" | "podcast";
  mediaId: number;
  progress: number;
  duration: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const completed = data.progress >= data.duration * 0.9; // Consider 90% as completed

  // Check if record exists
  const existing = await db
    .select()
    .from(watchHistory)
    .where(
      and(
        eq(watchHistory.userId, data.userId),
        eq(watchHistory.mediaType, data.mediaType),
        eq(watchHistory.mediaId, data.mediaId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(watchHistory)
      .set({
        progress: data.progress,
        duration: data.duration,
        completed,
        lastWatchedAt: new Date(),
      })
      .where(eq(watchHistory.id, existing[0].id));
  } else {
    // Insert new record using raw SQL to avoid Drizzle mapping issue
    await db.execute(sql`
      INSERT INTO watch_history (user_id, media_type, media_id, progress, duration, completed)
      VALUES (${data.userId}, ${data.mediaType}, ${data.mediaId}, ${data.progress}, ${data.duration}, ${completed})
    `);
  }
}

export async function getUserWatchHistory(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all watch history for user, ordered by most recently watched
  const history = await db
    .select()
    .from(watchHistory)
    .where(eq(watchHistory.userId, userId))
    .orderBy(desc(watchHistory.lastWatchedAt));

  // Fetch video and podcast details
  const videoIds = history.filter(h => h.mediaType === "video").map(h => h.mediaId);
  const podcastIds = history.filter(h => h.mediaType === "podcast").map(h => h.mediaId);

  const videoDetails = videoIds.length > 0
    ? await db.select().from(videos).where(inArray(videos.id, videoIds))
    : [];

  const podcastDetails = podcastIds.length > 0
    ? await db.select().from(podcasts).where(inArray(podcasts.id, podcastIds))
    : [];

  // Combine history with media details
  return history.map(h => {
    if (h.mediaType === "video") {
      const video = videoDetails.find(v => v.id === h.mediaId);
      return {
        ...h,
        media: video || null,
      };
    } else {
      const podcast = podcastDetails.find(p => p.id === h.mediaId);
      return {
        ...h,
        media: podcast || null,
      };
    }
  });
}

export async function getContinueWatching(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get incomplete watch history, ordered by most recently watched
  const history = await db
    .select()
    .from(watchHistory)
    .where(
      and(
        eq(watchHistory.userId, userId),
        eq(watchHistory.completed, false)
      )
    )
    .orderBy(desc(watchHistory.lastWatchedAt))
    .limit(6); // Limit to 6 items for Continue Watching section

  // Fetch video and podcast details
  const videoIds = history.filter(h => h.mediaType === "video").map(h => h.mediaId);
  const podcastIds = history.filter(h => h.mediaType === "podcast").map(h => h.mediaId);

  const videoDetails = videoIds.length > 0
    ? await db.select().from(videos).where(inArray(videos.id, videoIds))
    : [];

  const podcastDetails = podcastIds.length > 0
    ? await db.select().from(podcasts).where(inArray(podcasts.id, podcastIds))
    : [];

  // Combine history with media details
  return history.map(h => {
    if (h.mediaType === "video") {
      const video = videoDetails.find(v => v.id === h.mediaId);
      return {
        ...h,
        media: video || null,
      };
    } else {
      const podcast = podcastDetails.find(p => p.id === h.mediaId);
      return {
        ...h,
        media: podcast || null,
      };
    }
  }).filter(item => item.media !== null); // Filter out items where media was deleted
}

/**
 * General consultation update function for AI processing workflow
 */
export async function updateConsultation(
  id: number,
  data: Partial<typeof consultations.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;

  await db.update(consultations).set({ 
    ...data,
    updatedAt: new Date() 
  }).where(eq(consultations.id, id));
}

/**
 * Satisfaction Survey Functions
 */
export async function createSatisfactionSurvey(data: typeof satisfactionSurveys.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(satisfactionSurveys).values(data);
  return (result as any).insertId;
}

export async function getSatisfactionSurveyByConsultation(consultationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [survey] = await db
    .select()
    .from(satisfactionSurveys)
    .where(eq(satisfactionSurveys.consultationId, consultationId));
  
  return survey || null;
}

export async function getAllSatisfactionSurveys() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(satisfactionSurveys).orderBy(desc(satisfactionSurveys.createdAt));
}

export async function getSatisfactionSurveyStats() {
  const db = await getDb();
  if (!db) return null;

  const surveys = await db.select().from(satisfactionSurveys);
  
  if (surveys.length === 0) {
    return {
      totalSurveys: 0,
      averageOverallRating: 0,
      averageAiQualityRating: 0,
      averageSpecialistRating: 0,
      averageResponseTimeRating: 0,
      recommendationRate: 0,
    };
  }

  const total = surveys.length;
  const sum = (arr: (number | null)[]) => arr.filter(n => n !== null).reduce((a, b) => a! + b!, 0) || 0;
  const count = (arr: (number | null)[]) => arr.filter(n => n !== null).length;

  return {
    totalSurveys: total,
    averageOverallRating: sum(surveys.map(s => s.overallRating)) / total,
    averageAiQualityRating: count(surveys.map(s => s.aiQualityRating)) > 0 
      ? sum(surveys.map(s => s.aiQualityRating)) / count(surveys.map(s => s.aiQualityRating))
      : 0,
    averageSpecialistRating: count(surveys.map(s => s.specialistRating)) > 0
      ? sum(surveys.map(s => s.specialistRating)) / count(surveys.map(s => s.specialistRating))
      : 0,
    averageResponseTimeRating: count(surveys.map(s => s.responseTimeRating)) > 0
      ? sum(surveys.map(s => s.responseTimeRating)) / count(surveys.map(s => s.responseTimeRating))
      : 0,
    recommendationRate: (surveys.filter(s => s.wouldRecommend).length / total) * 100,
  };
}

// ============================================================================
// Research Topics Functions
// ============================================================================

export async function getResearchTopics(consultationId: number) {
  const db = await getDb();
  if (!db) return [];

  const { researchTopics } = await import("../drizzle/schema");
  return await db
    .select()
    .from(researchTopics)
    .where(eq(researchTopics.consultationId, consultationId))
    .orderBy(researchTopics.createdAt);
}

export async function saveResearchTopics(consultationId: number, nodes: any[]) {
  const db = await getDb();
  if (!db) return;

  const { researchTopics } = await import("../drizzle/schema");

  // Flatten the hierarchical structure and save all nodes
  const flattenNodes = (nodes: any[], parentId: string | null = null): any[] => {
    const result: any[] = [];
    for (const node of nodes) {
      result.push({
        consultationId,
        topicId: node.id,
        parentTopicId: parentId,
        label: node.label,
        description: node.description,
        researchPriority: node.researchPriority,
        researched: node.researched || false,
      });

      if (node.children && node.children.length > 0) {
        result.push(...flattenNodes(node.children, node.id));
      }
    }
    return result;
  };

  const flatNodes = flattenNodes(nodes);
  
  // Delete existing topics for this consultation
  await db.delete(researchTopics).where(eq(researchTopics.consultationId, consultationId));
  
  // Insert new topics
  if (flatNodes.length > 0) {
    await db.insert(researchTopics).values(flatNodes);
  }
}

export async function getResearchTopicById(consultationId: number, topicId: string) {
  const db = await getDb();
  if (!db) return null;

  const { researchTopics } = await import("../drizzle/schema");
  const [topic] = await db
    .select()
    .from(researchTopics)
    .where(
      and(
        eq(researchTopics.consultationId, consultationId),
        eq(researchTopics.topicId, topicId)
      )
    );

  return topic || null;
}

export async function updateResearchTopic(
  consultationId: number,
  topicId: string,
  updates: {
    researched?: boolean;
    researchContent?: string;
    researchedBy?: number;
    researchedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;

  const { researchTopics } = await import("../drizzle/schema");
  await db
    .update(researchTopics)
    .set(updates)
    .where(
      and(
        eq(researchTopics.consultationId, consultationId),
        eq(researchTopics.topicId, topicId)
      )
    );
}

// ============================================================================
// Slide Generation Requests
// ============================================================================

export async function createSlideGenerationRequest(data: {
  consultationId: number;
  requestedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { slideGenerationRequests } = await import("../drizzle/schema");
  const [request] = await db
    .insert(slideGenerationRequests)
    .values({
      consultationId: data.consultationId,
      requestedBy: data.requestedBy,
      status: "pending",
    })
    .$returningId();

  return { id: request.id };
}

export async function getPendingSlideRequests() {
  const db = await getDb();
  if (!db) return [];

  const { slideGenerationRequests, consultations } = await import("../drizzle/schema");
  return await db
    .select({
      id: slideGenerationRequests.id,
      consultationId: slideGenerationRequests.consultationId,
      requestedBy: slideGenerationRequests.requestedBy,
      requestedAt: slideGenerationRequests.requestedAt,
      status: slideGenerationRequests.status,
      patientName: consultations.patientName,
      symptoms: consultations.symptoms,
    })
    .from(slideGenerationRequests)
    .leftJoin(consultations, eq(slideGenerationRequests.consultationId, consultations.id))
    .where(eq(slideGenerationRequests.status, "pending"))
    .orderBy(slideGenerationRequests.requestedAt);
}

export async function getSlideRequestByConsultation(consultationId: number) {
  const db = await getDb();
  if (!db) return null;

  const { slideGenerationRequests } = await import("../drizzle/schema");
  const [request] = await db
    .select()
    .from(slideGenerationRequests)
    .where(eq(slideGenerationRequests.consultationId, consultationId))
    .orderBy(desc(slideGenerationRequests.requestedAt))
    .limit(1);

  return request || null;
}

export async function updateSlideGenerationRequest(
  requestId: number,
  updates: {
    status?: "pending" | "processing" | "completed" | "failed";
    infographicSlidesUrl?: string;
    slideDeckSlidesUrl?: string;
    errorMessage?: string;
    completedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;

  const { slideGenerationRequests } = await import("../drizzle/schema");
  await db
    .update(slideGenerationRequests)
    .set(updates)
    .where(eq(slideGenerationRequests.id, requestId));
}

// ==================== Material Regeneration Functions ====================

export async function regenerateConsultationMaterials(
  consultationId: number,
  updates: {
    aiReportUrl?: string;
    aiInfographicContent?: string;
    aiSlideDeckContent?: string;
    aiMindMapUrl?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(consultations)
    .set({
      ...updates,
      materialsRegeneratedAt: new Date(),
      materialsRegeneratedCount: sql`${consultations.materialsRegeneratedCount} + 1`,
    })
    .where(eq(consultations.id, consultationId));
}

export async function getAllResearchedTopics(consultationId: number) {
  const db = await getDb();
  if (!db) return [];

  const topics = await db
    .select()
    .from(researchTopics)
    .where(
      and(
        eq(researchTopics.consultationId, consultationId),
        eq(researchTopics.researched, true)
      )
    );

  return topics;
}

// ===== Blog Functions =====

export async function getAllBlogCategories() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(blogCategories).orderBy(blogCategories.nameEn);
}

export async function getBlogCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [category] = await db
    .select()
    .from(blogCategories)
    .where(eq(blogCategories.id, id))
    .limit(1);
  
  return category || null;
}

export async function createBlogCategory(data: InsertBlogCategory) {
  const db = await getDb();
  if (!db) return null;
  
  const [result] = await db.insert(blogCategories).values(data);
  return result.insertId;
}

export async function getAllPublishedBlogPosts(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (categoryId) {
    return await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.published, true), eq(blogPosts.categoryId, categoryId)))
      .orderBy(desc(blogPosts.publishedAt));
  }
  
  return await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.published, true))
    .orderBy(desc(blogPosts.publishedAt));
}

export async function getAllBlogPosts(includeUnpublished = false) {
  const db = await getDb();
  if (!db) return [];
  
  if (includeUnpublished) {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }
  
  return await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.published, true))
    .orderBy(desc(blogPosts.createdAt));
}

export async function getBlogPostBySlug(slug: string, language: 'en' | 'ar') {
  const db = await getDb();
  if (!db) return null;
  
  const slugField = language === 'ar' ? blogPosts.slugAr : blogPosts.slugEn;
  
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(slugField, slug))
    .limit(1);
  
  return post || null;
}

export async function getBlogPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);
  
  return post || null;
}

export async function createBlogPost(data: InsertBlogPost) {
  const db = await getDb();
  if (!db) return null;
  
  const [result] = await db.insert(blogPosts).values(data);
  return result.insertId;
}

export async function updateBlogPost(id: number, data: Partial<InsertBlogPost>) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(blogPosts)
    .set(data)
    .where(eq(blogPosts.id, id));
}

export async function incrementBlogPostViews(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(blogPosts)
    .set({ views: sql`${blogPosts.views} + 1` })
    .where(eq(blogPosts.id, id));
}

export async function searchBlogPosts(searchQuery: string, language: 'en' | 'ar') {
  const db = await getDb();
  if (!db) return [];
  
  const titleField = language === 'ar' ? blogPosts.titleAr : blogPosts.titleEn;
  const contentField = language === 'ar' ? blogPosts.contentAr : blogPosts.contentEn;
  
  return await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.published, true),
        or(
          like(titleField, `%${searchQuery}%`),
          like(contentField, `%${searchQuery}%`)
        )
      )
    )
    .orderBy(desc(blogPosts.publishedAt));
}

// ==================== Local Auth Functions ====================

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await (db as any).execute(
    `SELECT * FROM users WHERE username = ? LIMIT 1`,
    [username]
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return rows.length > 0 ? rows[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  // Use raw SQL to include password_hash which was added via direct SQL migration
  const result = await (db as any).execute(
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  if (!rows || rows.length === 0) return undefined;
  const row = rows[0];
  return {
    id: row.id as number,
    openId: row.open_id as string,
    name: row.name as string | null,
    email: row.email as string | null,
    username: row.username as string | null,
    passwordHash: row.password_hash as string | null,
    loginMethod: row.login_method as string | null,
    role: row.role as 'user' | 'admin',
    consultationsRemaining: row.consultations_remaining as number,
    hasUsedFreeConsultation: Boolean(row.has_used_free_consultation),
    subscriptionType: row.subscription_type as string,
    freeConsultationsUsed: (row.free_consultations_used as number) ?? 0,
    freeConsultationsTotal: (row.free_consultations_total as number) ?? 1,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    lastSignedIn: row.last_signed_in as Date,
  };
}

export async function createLocalUser(data: {
  username: string;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId for local users
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const result = await (db as any).execute(
    `INSERT INTO users (openId, username, email, name, password_hash, auth_method, loginMethod, role, hasUsedFreeConsultation, subscription_type, consultations_remaining, lastSignedIn, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'local', 'local', 'user', 0, 'free', 0, NOW(), NOW(), NOW())`,
    [openId, data.username, data.email, data.name, data.passwordHash]
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return (rows as any).insertId;
}

export async function grantConsultationsAfterPayment(userId: number, count: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Also update free_consultations_total so the quota system reflects the premium plan
  await (db as any).execute(
    `UPDATE users SET consultations_remaining = consultations_remaining + ?,
     free_consultations_total = free_consultations_total + ?,
     subscription_type = 'pay_per_case'
     WHERE id = ?`,
    [count, count, userId]
  );
}

export async function createRegistrationPayment(data: {
  userId: number;
  paypalOrderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  consultationsGranted: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await (db as any).execute(
    `INSERT INTO registration_payments (user_id, paypal_order_id, amount, currency, status, consultations_granted)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.userId, data.paypalOrderId, data.amount, data.currency, data.status, data.consultationsGranted]
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return (rows as any).insertId;
}

export async function updateRegistrationPaymentStatus(paypalOrderId: string, status: 'completed' | 'failed', paypalPayerId?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await (db as any).execute(
    `UPDATE registration_payments SET status = ?, paypal_payer_id = ?, updated_at = NOW() WHERE paypal_order_id = ?`,
    [status, paypalPayerId || null, paypalOrderId]
  );
}

export async function getRegistrationPaymentByOrderId(paypalOrderId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await (db as any).execute(
    `SELECT * FROM registration_payments WHERE paypal_order_id = ? LIMIT 1`,
    [paypalOrderId]
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return rows.length > 0 ? rows[0] : undefined;
}

// ─── Password Reset Token Helpers ───────────────────────────────────────────

export async function createPasswordResetToken(userId: number, token: string, expiresAt: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await (db as any).execute(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [userId, token, expiresAt]
  );
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await (db as any).execute(
    `SELECT * FROM password_reset_tokens WHERE token = ? LIMIT 1`,
    [token]
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as number,
    token: row.token as string,
    expiresAt: Number(row.expires_at),
    usedAt: row.used_at ? Number(row.used_at) : null,
    createdAt: Number(row.created_at),
  };
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await (db as any).execute(
    `UPDATE password_reset_tokens SET used_at = ? WHERE token = ?`,
    [Date.now(), token]
  );
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await (db as any).execute(
    `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
    [passwordHash, userId]
  );
}

// ==================== User Medical Records Functions ====================

export async function getUserMedicalRecords(userId: number): Promise<UserMedicalRecord[]> {
  const db = await getDb();
  if (!db) return [];

  const records = await (db as any)
    .select()
    .from(userMedicalRecords)
    .where(eq(userMedicalRecords.userId, userId))
    .orderBy(desc(userMedicalRecords.createdAt));

  return records;
}

export async function createUserMedicalRecord(data: {
  userId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileType: string;
  fileSize?: number;
  category: 'medical_report' | 'lab_result' | 'xray' | 'prescription' | 'other';
  notes?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await (db as any).execute(
    `INSERT INTO user_medical_records (user_id, file_name, file_url, file_key, file_type, file_size, category, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.userId, data.fileName, data.fileUrl, data.fileKey, data.fileType, data.fileSize ?? null, data.category, data.notes ?? null]
  );
  return result[0].insertId;
}

export async function deleteUserMedicalRecord(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await (db as any).execute(
    `DELETE FROM user_medical_records WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result[0].affectedRows > 0;
}

export async function getUserMedicalRecordById(id: number): Promise<UserMedicalRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const records = await (db as any)
    .select()
    .from(userMedicalRecords)
    .where(eq(userMedicalRecords.id, id))
    .limit(1);

  return records[0] ?? null;
}

// ==================== Consultation Attached Records Functions ====================

export async function attachRecordsToConsultation(consultationId: number, recordIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db || recordIds.length === 0) return;

  // Insert each record link (ignore duplicates)
  for (const recordId of recordIds) {
    await (db as any).execute(
      `INSERT IGNORE INTO consultation_attached_records (consultation_id, record_id) VALUES (?, ?)`,
      [consultationId, recordId]
    );
  }
}

export async function getAttachedRecordsForConsultation(consultationId: number): Promise<(ConsultationAttachedRecord & { fileName: string; fileUrl: string; fileType: string; category: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await (db as any).execute(
    `SELECT car.id, car.consultation_id, car.record_id, car.createdAt,
            umr.file_name AS fileName, umr.file_url AS fileUrl,
            umr.file_type AS fileType, umr.category
     FROM consultation_attached_records car
     JOIN user_medical_records umr ON umr.id = car.record_id
     WHERE car.consultation_id = ?
     ORDER BY car.createdAt ASC`,
    [consultationId]
  );

  return rows[0] ?? [];
}

export async function getAttachedRecordsForConsultations(consultationIds: number[]): Promise<Record<number, { id: number; fileName: string; fileUrl: string; fileType: string; category: string }[]>> {
  const db = await getDb();
  if (!db || consultationIds.length === 0) return {};

  const placeholders = consultationIds.map(() => '?').join(',');
  const rows = await (db as any).execute(
    `SELECT car.consultation_id, car.record_id,
            umr.file_name AS fileName, umr.file_url AS fileUrl,
            umr.file_type AS fileType, umr.category
     FROM consultation_attached_records car
     JOIN user_medical_records umr ON umr.id = car.record_id
     WHERE car.consultation_id IN (${placeholders})
     ORDER BY car.createdAt ASC`,
    consultationIds
  );

  const result: Record<number, { id: number; fileName: string; fileUrl: string; fileType: string; category: string }[]> = {};
  for (const row of (rows[0] ?? [])) {
    const cid = row.consultation_id;
    if (!result[cid]) result[cid] = [];
    result[cid].push({ id: row.record_id, fileName: row.fileName, fileUrl: row.fileUrl, fileType: row.fileType, category: row.category });
  }
  return result;
}
