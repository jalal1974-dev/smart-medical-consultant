import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Track if user has used their free consultation */
  hasUsedFreeConsultation: boolean("hasUsedFreeConsultation").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Consultations table - tracks all consultation bookings
 */
export const consultations = mysqlTable("consultations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Patient name */
  patientName: varchar("patientName", { length: 255 }).notNull(),
  /** Patient email */
  patientEmail: varchar("patientEmail", { length: 320 }).notNull(),
  /** Patient phone number */
  patientPhone: varchar("patientPhone", { length: 50 }),
  /** Consultation description/reason */
  description: text("description").notNull(),
  /** Preferred language for consultation */
  language: mysqlEnum("language", ["en", "ar"]).notNull(),
  /** Consultation status */
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  /** Whether this was a free consultation */
  isFree: boolean("isFree").default(false).notNull(),
  /** Payment status */
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  /** PayPal transaction ID */
  paypalTransactionId: varchar("paypalTransactionId", { length: 255 }),
  /** Consultation fee amount */
  amount: decimal("amount", { precision: 10, scale: 2 }),
  /** Scheduled date and time for consultation */
  scheduledAt: timestamp("scheduledAt"),
  /** Admin notes */
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

/**
 * Media content table - stores videos and podcasts
 */
export const mediaContent = mysqlTable("mediaContent", {
  id: int("id").autoincrement().primaryKey(),
  /** Media type */
  type: mysqlEnum("type", ["video", "podcast"]).notNull(),
  /** Title in English */
  titleEn: varchar("titleEn", { length: 500 }).notNull(),
  /** Title in Arabic */
  titleAr: varchar("titleAr", { length: 500 }).notNull(),
  /** Description in English */
  descriptionEn: text("descriptionEn"),
  /** Description in Arabic */
  descriptionAr: text("descriptionAr"),
  /** Media URL (YouTube, Vimeo, or S3) */
  mediaUrl: text("mediaUrl").notNull(),
  /** Thumbnail image URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** Duration in seconds */
  duration: int("duration"),
  /** Language of the content */
  language: mysqlEnum("language", ["en", "ar", "both"]).notNull(),
  /** Published status */
  isPublished: boolean("isPublished").default(false).notNull(),
  /** View count */
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaContent = typeof mediaContent.$inferSelect;
export type InsertMediaContent = typeof mediaContent.$inferInsert;
