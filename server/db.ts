import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, consultations, InsertConsultation, videos, podcasts, InsertVideo, InsertPodcast, consultationQuestions, InsertConsultationQuestion } from "../drizzle/schema";
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
