import { eq, desc, and, sql, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, consultations, InsertConsultation, videos, podcasts, InsertVideo, InsertPodcast, consultationQuestions, InsertConsultationQuestion, watchHistory, InsertWatchHistory } from "../drizzle/schema";
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
