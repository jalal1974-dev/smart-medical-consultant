import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, consultations, InsertConsultation, mediaContent, InsertMediaContent } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function markFreeConsultationUsed(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ hasUsedFreeConsultation: true }).where(eq(users.id, userId));
}

// Consultation queries
export async function createConsultation(consultation: InsertConsultation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(consultations).values(consultation);
  return result;
}

export async function getConsultationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(consultations).where(eq(consultations.userId, userId)).orderBy(desc(consultations.createdAt));
}

export async function getAllConsultations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(consultations).orderBy(desc(consultations.createdAt));
}

export async function getConsultationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateConsultationStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled", adminNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }

  await db.update(consultations).set(updateData).where(eq(consultations.id, id));
}

export async function updateConsultationPayment(id: number, paymentStatus: "pending" | "completed" | "failed" | "refunded", transactionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { paymentStatus };
  if (transactionId) {
    updateData.paypalTransactionId = transactionId;
  }

  await db.update(consultations).set(updateData).where(eq(consultations.id, id));
}

// Media content queries
export async function createMediaContent(media: InsertMediaContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(mediaContent).values(media);
  return result;
}

export async function getPublishedMedia(type?: "video" | "podcast") {
  const db = await getDb();
  if (!db) return [];

  if (type) {
    return await db.select().from(mediaContent).where(and(eq(mediaContent.type, type), eq(mediaContent.isPublished, true))).orderBy(desc(mediaContent.createdAt));
  }

  return await db.select().from(mediaContent).where(eq(mediaContent.isPublished, true)).orderBy(desc(mediaContent.createdAt));
}

export async function getAllMedia() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mediaContent).orderBy(desc(mediaContent.createdAt));
}

export async function getMediaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(mediaContent).where(eq(mediaContent.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMediaContent(id: number, updates: Partial<InsertMediaContent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(mediaContent).set(updates).where(eq(mediaContent.id, id));
}

export async function deleteMediaContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(mediaContent).where(eq(mediaContent.id, id));
}

export async function incrementMediaViews(id: number) {
  const db = await getDb();
  if (!db) return;

  const media = await getMediaById(id);
  if (media) {
    await db.update(mediaContent).set({ viewCount: (media.viewCount || 0) + 1 }).where(eq(mediaContent.id, id));
  }
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getConsultationStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, confirmed: 0, completed: 0 };

  const allConsultations = await db.select().from(consultations);
  
  return {
    total: allConsultations.length,
    pending: allConsultations.filter(c => c.status === "pending").length,
    confirmed: allConsultations.filter(c => c.status === "confirmed").length,
    completed: allConsultations.filter(c => c.status === "completed").length,
  };
}
