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
  subscriptionType: mysqlEnum("subscription_type", ["free", "pay_per_case", "monthly"]).default("free").notNull(),
  planType: mysqlEnum("plan_type", ["free", "premium"]).default("free").notNull(), // simplified plan: free (1 consultation) | premium (10+ consultations)
  consultationsRemaining: int("consultations_remaining").default(1).notNull(),
  freeConsultationsUsed: int("free_consultations_used").default(0).notNull(),   // how many free ones consumed
  freeConsultationsTotal: int("free_consultations_total").default(1).notNull(), // 1 for free plan, 10 for $1 premium
  avatarUrl: varchar("avatar_url", { length: 500 }),   // S3 URL for profile picture
  bio: text("bio"),                                     // Short user bio (max 300 chars)
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
  
  // Priority level for case triage
  priority: mysqlEnum("priority", ["routine", "urgent", "critical"]).default("routine").notNull(),
  
  // Status workflow: submitted → ai_processing → specialist_review → completed → follow_up
  status: mysqlEnum("status", [
    "submitted",
    "ai_processing",
    "specialist_review",
    "completed",
    "follow_up"
  ]).default("submitted").notNull(),
  
  // AI Analysis results
  aiAnalysis: text("aiAnalysis"), // AI-generated comprehensive medical analysis
  aiReportUrl: varchar("aiReportUrl", { length: 500 }), // PDF report URL
  aiVideoUrl: varchar("aiVideoUrl", { length: 500 }), // Video explanation URL
  aiAudioUrl: varchar("aiAudioUrl", { length: 500 }), // Audio summary URL
  aiInfographicUrl: varchar("aiInfographicUrl", { length: 500 }), // Infographic URL (manus-slides://)
  aiInfographicContent: text("aiInfographicContent"), // JSON content for infographic generation
  aiSlideDeckUrl: varchar("aiSlideDeckUrl", { length: 500 }), // Slide presentation URL (manus-slides://)
  aiSlideDeckContent: text("aiSlideDeckContent"), // JSON content for slide deck generation
  aiMindMapUrl: varchar("aiMindMapUrl", { length: 500 }), // Mind map URL
  pptxReportUrl: varchar("pptxReportUrl", { length: 500 }), // Dedicated PPTX report URL (separate from AI slide deck)

  // Admin "Send to Patient" approval flags — each report is hidden from patient until explicitly sent
  sentPdfToPatient: boolean("sentPdfToPatient").default(false).notNull(),
  sentInfographicToPatient: boolean("sentInfographicToPatient").default(false).notNull(),
  sentSlidesToPatient: boolean("sentSlidesToPatient").default(false).notNull(),
  sentMindMapToPatient: boolean("sentMindMapToPatient").default(false).notNull(),
  sentPptxToPatient: boolean("sentPptxToPatient").default(false).notNull(),
  sentToPatientAt: timestamp("sentToPatientAt"), // timestamp of most recent send action
  sentToPatientBy: int("sentToPatientBy"), // admin user ID who last sent
  aiProcessingAttempts: int("aiProcessingAttempts").default(0).notNull(), // Number of AI analysis attempts
  aiLastProcessedAt: timestamp("aiLastProcessedAt"), // Last AI processing timestamp
  materialsRegeneratedAt: timestamp("materialsRegeneratedAt"), // Last material regeneration timestamp
  materialsRegeneratedCount: int("materialsRegeneratedCount").default(0).notNull(), // Number of times materials were regenerated
  
  // Specialist review and approval workflow
  specialistApprovalStatus: mysqlEnum("specialistApprovalStatus", [
    "pending_review",
    "approved",
    "rejected",
    "needs_deep_analysis"
  ]).default("pending_review"),
  specialistNotes: text("specialistNotes"), // Specialist feedback
  specialistRejectionReason: text("specialistRejectionReason"), // Why content was rejected
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

/**
 * Consultation questions table - follow-up questions from patients
 */
export const consultationQuestions = mysqlTable("consultation_questions", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultation_id").notNull(),
  userId: int("user_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredBy: int("answered_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  answeredAt: timestamp("answeredAt"),
});

export type ConsultationQuestion = typeof consultationQuestions.$inferSelect;
export type InsertConsultationQuestion = typeof consultationQuestions.$inferInsert;

/**
 * Watch history table - tracks user progress on videos and podcasts
 */
export const watchHistory = mysqlTable("watch_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  mediaType: mysqlEnum("media_type", ["video", "podcast"]).notNull(),
  mediaId: int("media_id").notNull(),
  progress: int("progress").default(0).notNull(), // Current position in seconds
  duration: int("duration").notNull(), // Total duration in seconds
  completed: boolean("completed").default(false).notNull(),
  lastWatchedAt: timestamp("last_watched_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = typeof watchHistory.$inferInsert;

/**
 * Satisfaction surveys table - patient feedback on completed consultations
 */
export const satisfactionSurveys = mysqlTable("satisfaction_surveys", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultation_id").notNull().unique(),
  userId: int("user_id").notNull(),
  
  // Ratings (1-5 scale)
  overallRating: int("overall_rating").notNull(), // Overall satisfaction
  aiQualityRating: int("ai_quality_rating"), // Quality of AI analysis
  specialistRating: int("specialist_rating"), // Specialist review quality
  responseTimeRating: int("response_time_rating"), // Speed of service
  
  // Feedback
  feedback: text("feedback"), // Open-ended comments
  wouldRecommend: boolean("would_recommend"), // Would recommend to others
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type InsertSatisfactionSurvey = typeof satisfactionSurveys.$inferInsert;

/**
 * Research topics table - stores mind map topics for deep research
 */
export const researchTopics = mysqlTable("research_topics", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultation_id").notNull(),
  
  // Topic information
  topicId: varchar("topic_id", { length: 100 }).notNull(), // Unique ID from mind map
  parentTopicId: varchar("parent_topic_id", { length: 100 }), // For hierarchical structure
  label: varchar("label", { length: 500 }).notNull(), // Topic name
  description: text("description"), // What to research
  
  // Research status
  researchPriority: mysqlEnum("research_priority", ["high", "medium", "low"]).default("medium").notNull(),
  researched: boolean("researched").default(false).notNull(),
  researchContent: text("research_content"), // Deep research results
  researchedAt: timestamp("researched_at"),
  researchedBy: int("researched_by"), // Admin user ID who triggered research
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResearchTopic = typeof researchTopics.$inferSelect;
export type InsertResearchTopic = typeof researchTopics.$inferInsert;

/**
 * Slide generation requests table - tracks requests for agent to generate Manus slides
 */
export const slideGenerationRequests = mysqlTable("slide_generation_requests", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultation_id").notNull(),
  
  // Request information
  requestedBy: int("requested_by").notNull(), // Admin user ID who requested
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  
  // Generation status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  
  // Generated slides URLs (stored after agent completes generation)
  infographicSlidesUrl: varchar("infographic_slides_url", { length: 500 }), // manus-slides:// URL
  slideDeckSlidesUrl: varchar("slide_deck_slides_url", { length: 500 }), // manus-slides:// URL
  
  // Error information if generation fails
  errorMessage: text("error_message"),
  
  // Completion timestamp
  completedAt: timestamp("completed_at"),
  
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SlideGenerationRequest = typeof slideGenerationRequests.$inferSelect;
export type InsertSlideGenerationRequest = typeof slideGenerationRequests.$inferInsert;

/**
 * Blog categories table - organizes blog posts by medical topics
 */
export const blogCategories = mysqlTable("blog_categories", {
  id: int("id").autoincrement().primaryKey(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  slugEn: varchar("slug_en", { length: 255 }).notNull().unique(),
  slugAr: varchar("slug_ar", { length: 255 }).notNull().unique(),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;

/**
 * Blog posts table - SEO-optimized medical articles
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("category_id").notNull(),
  authorId: int("author_id").notNull(), // User ID of author (admin)
  
  // Content in both languages
  titleEn: varchar("title_en", { length: 500 }).notNull(),
  titleAr: varchar("title_ar", { length: 500 }).notNull(),
  slugEn: varchar("slug_en", { length: 500 }).notNull().unique(),
  slugAr: varchar("slug_ar", { length: 500 }).notNull().unique(),
  excerptEn: text("excerpt_en").notNull(), // Short summary for listings
  excerptAr: text("excerpt_ar").notNull(),
  contentEn: text("content_en").notNull(), // Full article content (Markdown)
  contentAr: text("content_ar").notNull(),
  
  // SEO fields
  metaDescriptionEn: varchar("meta_description_en", { length: 500 }),
  metaDescriptionAr: varchar("meta_description_ar", { length: 500 }),
  metaKeywordsEn: text("meta_keywords_en"), // Comma-separated keywords
  metaKeywordsAr: text("meta_keywords_ar"),
  
  // Featured image
  featuredImage: varchar("featured_image", { length: 500 }),
  featuredImageAlt: varchar("featured_image_alt", { length: 255 }),
  
  // Publishing
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  
  // Engagement metrics
  views: int("views").default(0).notNull(),
  readingTimeMinutes: int("reading_time_minutes").default(5).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Report generation logs table - audit trail for all admin-triggered report actions
 */
export const reportGenerationLogs = mysqlTable("report_generation_logs", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultation_id").notNull(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  adminId: int("admin_id").notNull(),
  adminName: varchar("admin_name", { length: 255 }).notNull(),
  reportType: mysqlEnum("report_type", [
    "infographic",
    "pdf",
    "slides",
    "mindmap",
    "pptx",
    "all",
    "upload_infographic",
    "upload_pptx",
    "upload_pdf",
    "upload_slides",
    "upload_mindmap"
  ]).notNull(),
  action: mysqlEnum("action", ["generate", "regenerate", "upload"]).default("generate").notNull(),
  status: mysqlEnum("status", ["success", "failed"]).default("success").notNull(),
  errorMessage: text("error_message"),
  outputUrl: varchar("output_url", { length: 500 }), // S3 URL of the generated file
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportGenerationLog = typeof reportGenerationLogs.$inferSelect;
export type InsertReportGenerationLog = typeof reportGenerationLogs.$inferInsert;

/**
 * User medical records table - personal health file vault for each registered user
 */
export const userMedicalRecords = mysqlTable("user_medical_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  
  // File information
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(), // S3 public URL
  fileKey: varchar("file_key", { length: 500 }).notNull(), // S3 key for deletion
  fileType: varchar("file_type", { length: 100 }).notNull(), // MIME type
  fileSize: int("file_size"), // bytes
  
  // Categorization
  category: mysqlEnum("category", [
    "medical_report",
    "lab_result",
    "xray",
    "prescription",
    "other"
  ]).default("other").notNull(),
  
  // Optional notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserMedicalRecord = typeof userMedicalRecords.$inferSelect;
export type InsertUserMedicalRecord = typeof userMedicalRecords.$inferInsert;

/**
 * Registration payments table - tracks $1 PayPal payments for user registration
 */
export const registrationPayments = mysqlTable("registration_payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  paypalOrderId: varchar("paypal_order_id", { length: 255 }).notNull().unique(),
  paypalPayerId: varchar("paypal_payer_id", { length: 255 }),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  consultationsGranted: int("consultations_granted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegistrationPayment = typeof registrationPayments.$inferSelect;
export type InsertRegistrationPayment = typeof registrationPayments.$inferInsert;

/**
 * Password reset tokens table - secure one-time tokens for password recovery
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: int("expires_at").notNull(), // Unix timestamp ms
  usedAt: int("used_at"), // Unix timestamp ms, null if not used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * External upload tokens - secure single-use tokens for uploading reports from outside the website
 */
export const uploadTokens = mysqlTable("upload_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  consultationId: int("consultation_id").notNull(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  reportType: mysqlEnum("report_type", ["infographic", "slides", "pdf", "mindmap", "pptx"]).notNull(),
  createdByAdminId: int("created_by_admin_id").notNull(),
  createdByAdminName: varchar("created_by_admin_name", { length: 255 }).notNull(),
  expiresAt: int("expires_at").notNull(), // Unix timestamp ms
  usedAt: int("used_at"),                  // null = not yet used
  uploadedFileUrl: varchar("uploaded_file_url", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UploadToken = typeof uploadTokens.$inferSelect;
export type InsertUploadToken = typeof uploadTokens.$inferInsert;

/**
 * Consultation attached records - links existing user medical records to a consultation
 */
export const consultationAttachedRecords = mysqlTable("consultation_attached_records", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultation_id").notNull(),
  recordId: int("record_id").notNull(), // FK to user_medical_records.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsultationAttachedRecord = typeof consultationAttachedRecords.$inferSelect;
export type InsertConsultationAttachedRecord = typeof consultationAttachedRecords.$inferInsert;
