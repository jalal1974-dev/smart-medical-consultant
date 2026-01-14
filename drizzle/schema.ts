import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  hasUsedFreeConsultation: boolean("hasUsedFreeConsultation").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Consultations table - stores AI-powered medical analysis requests
 */
export const consultations = mysqlTable("consultations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  patientName: varchar("patientName", { length: 255 }).notNull(),
  patientEmail: varchar("patientEmail", { length: 320 }).notNull(),
  patientPhone: varchar("patientPhone", { length: 50 }),
  
  // Medical information
  symptoms: text("symptoms").notNull(),
  medicalHistory: text("medicalHistory"),
  
  // Uploaded files (stored as JSON array of file URLs)
  medicalReports: text("medicalReports"), // JSON array of URLs
  labResults: text("labResults"), // JSON array of URLs
  xrayImages: text("xrayImages"), // JSON array of URLs
  otherDocuments: text("otherDocuments"), // JSON array of URLs
  
  preferredLanguage: mysqlEnum("preferredLanguage", ["en", "ar"]).default("en").notNull(),
  
  // Status workflow: submitted → ai_processing → specialist_review → completed → follow_up
  status: mysqlEnum("status", [
    "submitted",
    "ai_processing",
    "specialist_review",
    "completed",
    "follow_up"
  ]).default("submitted").notNull(),
  
  // AI Analysis results
  aiAnalysis: text("aiAnalysis"), // AI-generated analysis text
  aiReportUrl: varchar("aiReportUrl", { length: 500 }), // PDF report URL
  aiVideoUrl: varchar("aiVideoUrl", { length: 500 }), // Video explanation URL
  aiInfographicUrl: varchar("aiInfographicUrl", { length: 500 }), // Infographic URL
  
  // Specialist review
  specialistNotes: text("specialistNotes"),
  reviewedBy: int("reviewedBy"), // Admin user ID who reviewed
  reviewedAt: timestamp("reviewedAt"),
  
  // Follow-up tracking
  treatmentPlan: text("treatmentPlan"), // Patient's doctor treatment plan
  followUpNotes: text("followUpNotes"), // AI analysis of treatment effectiveness
  followUpStatus: mysqlEnum("followUpStatus", ["pending", "approved", "concerns"]),
  
  // Payment
  isFree: boolean("isFree").default(false).notNull(),
  amount: int("amount").default(0).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  paymentId: varchar("paymentId", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

/**
 * Videos table - educational medical content
 */
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  videoUrl: varchar("videoUrl", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  duration: int("duration"), // in seconds
  views: int("views").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * Podcasts table - audio medical content
 */
export const podcasts = mysqlTable("podcasts", {
  id: int("id").autoincrement().primaryKey(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  audioUrl: varchar("audioUrl", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  duration: int("duration"), // in seconds
  views: int("views").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Podcast = typeof podcasts.$inferSelect;
export type InsertPodcast = typeof podcasts.$inferInsert;
