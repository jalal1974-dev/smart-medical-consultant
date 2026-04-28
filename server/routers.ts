import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { sendConsultationReceipt, sendConsultationStatusUpdate, sendNewQuestionNotification, sendQuestionAnsweredNotification, sendReportReadyNotification } from "./emailNotifications";
import { sendConsultationWhatsAppNotification } from "./whatsappNotification";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { processConsultationWithAI, reprocessConsultationAfterRejection } from "./aiProcessingOrchestrator";
import { generateConsultationPDF } from "./consultationPDFGenerator";
import { transcribeAudio } from "./voiceTranscription";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Local registration (step 1: create account, no payment yet)
    register: publicProcedure
      .input(z.object({
        username: z.string().min(3, 'Username must be at least 3 characters').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
        email: z.string().email('Invalid email address'),
        name: z.string().min(1, 'Full name is required').max(100),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      }))
      .mutation(async ({ input }) => {
        // Check username uniqueness
        const existingUsername = await db.getUserByUsername(input.username);
        if (existingUsername) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Username already taken' });
        }
        // Check email uniqueness
        const existingEmail = await db.getUserByEmail(input.email);
        if (existingEmail) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });
        }
        // Hash password with bcrypt (12 rounds for strong security)
        const passwordHash = await bcrypt.hash(input.password, 12);
        // Create user (0 consultations until payment)
        const userId = await db.createLocalUser({
          username: input.username,
          email: input.email,
          name: input.name,
          passwordHash,
        });
        return { success: true, userId };
      }),

    // Local login with username/password
    loginLocal: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByUsername(input.username);
        if (!user || !user.password_hash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
        }
        const isValid = await bcrypt.compare(input.password, user.password_hash);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
        }
        // Create session cookie
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),

    // DEPRECATED: Registration is now free. This route is kept for backward compatibility only.
    // New users get 1 free consultation automatically via createLocalUser in db.ts.
    confirmPaypalPayment: publicProcedure
      .input(z.object({
        userId: z.number(),
        paypalOrderId: z.string(),
        paypalPayerId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check payment not already processed
        const existing = await db.getRegistrationPaymentByOrderId(input.paypalOrderId);
        if (existing && existing.status === 'completed') {
          throw new TRPCError({ code: 'CONFLICT', message: 'Payment already processed' });
        }
        // Record payment
        if (!existing) {
          await db.createRegistrationPayment({
            userId: input.userId,
            paypalOrderId: input.paypalOrderId,
            amount: 1.00,
            currency: 'USD',
            status: 'completed',
            consultationsGranted: 10,
          });
        } else {
          await db.updateRegistrationPaymentStatus(input.paypalOrderId, 'completed', input.paypalPayerId);
        }
        // Grant 10 consultations to the user
        await db.grantConsultationsAfterPayment(input.userId, 1); // DEPRECATED: now grants 1 for backward compat
        // Auto-login: create session for the new user
        const user = await db.getUserById(input.userId);
        if (user) {
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || '',
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        }
        return { success: true, consultationsGranted: 10 };
      }),

    // Request password reset - sends email with token
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email('Invalid email address'),
      }))
      .mutation(async ({ input }) => {
        // Always return success to prevent email enumeration attacks
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          // User not found or uses OAuth only — still return success
          return { success: true };
        }

        // Generate a cryptographically secure token
        const crypto = await import('crypto');
        const token = crypto.randomBytes(48).toString('hex');
        const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

        // Store token in DB
        await db.createPasswordResetToken(user.id, token, expiresAt);

        // Send reset email
        const { sendPasswordResetEmail } = await import('./emailNotifications');
        const resetUrl = `https://smartmedcon-jsnymp6w.manus.space/reset-password?token=${token}`;
        await sendPasswordResetEmail(user.email || input.email, user.name, resetUrl);

        return { success: true };
      }),

    // Reset password using token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1, 'Token is required'),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      }))
      .mutation(async ({ input }) => {
        const resetToken = await db.getPasswordResetToken(input.token);
        if (!resetToken) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired reset token' });
        }
        if (resetToken.usedAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reset link has already been used' });
        }
        if (Date.now() > resetToken.expiresAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reset link has expired. Please request a new one.' });
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(input.newPassword, 12);

        // Update user password and mark token as used
        await db.updateUserPassword(resetToken.userId, passwordHash);
        await db.markPasswordResetTokenUsed(input.token);

        return { success: true };
      }),
  }),

  // File upload route
  upload: router({
    file: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64 encoded file data
        category: z.enum(['medical_report', 'lab_result', 'xray', 'other', 'audio']),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Validate file type
          const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            // Audio types for voice recording
            'audio/webm',
            'audio/mp3',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/m4a',
            'audio/mp4',
          ];

          if (!allowedTypes.includes(input.fileType)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid file type. Only PDF, images, Word documents, and audio files are allowed.',
            });
          }

          // Convert base64 to buffer
          const fileBuffer = Buffer.from(input.fileData, 'base64');

          // Validate file size (16MB for audio, 10MB for others)
          const isAudio = input.fileType.startsWith('audio/');
          const maxSize = isAudio ? 16 * 1024 * 1024 : 10 * 1024 * 1024;
          if (fileBuffer.length > maxSize) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: isAudio ? 'Audio file size exceeds 16MB limit.' : 'File size exceeds 10MB limit.',
            });
          }

          // Generate unique file key
          const fileExtension = input.fileName.split('.').pop();
          const uniqueId = nanoid();
          const fileKey = `consultations/${ctx.user.id}/${input.category}/${uniqueId}.${fileExtension}`;

          // Upload to S3
          const { url } = await storagePut(fileKey, fileBuffer, input.fileType);

          return {
            success: true,
            url,
            fileKey,
          };
        } catch (error: any) {
          console.error('File upload error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to upload file',
          });
        }
      }),
  }),

  consultation: router({
    // Create a new AI-powered consultation request
    create: protectedProcedure
      .input(z.object({
        patientName: z.string().min(1, "Patient name is required"),
        patientEmail: z.string().email("Valid email is required"),
        patientPhone: z.string().optional(),
        symptoms: z.string().min(10, "Please describe your symptoms in at least 10 characters"),
        medicalHistory: z.string().optional(),
        medicalReports: z.array(z.string()).optional(), // Array of file URLs
        labResults: z.array(z.string()).optional(),
        xrayImages: z.array(z.string()).optional(),
        otherDocuments: z.array(z.string()).optional(),
        preferredLanguage: z.enum(["en", "ar"]),
        priority: z.enum(["routine", "urgent", "critical"]).optional().default("routine"),
        isFree: z.boolean(),
        attachedRecordIds: z.array(z.number()).optional(), // IDs of existing user_medical_records to attach
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        // ── Quota check ──────────────────────────────────────────────────────
        // Admins bypass all quota restrictions — unlimited free consultations
        const isAdmin = ctx.user.role === 'admin';
        // Determine how many free consultations this user has left
        const quota = await db.getUserFreeQuota(ctx.user.id);
        const freeRemaining = quota.total - quota.used;

        if (input.isFree && !isAdmin) {
          // User wants to use a free slot — make sure one is available
          if (freeRemaining <= 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'FREE_QUOTA_EXHAUSTED', // frontend detects this code
            });
          }
        }

        const consultationId = await db.createConsultation({
          userId: ctx.user.id,
          patientName: input.patientName,
          patientEmail: input.patientEmail,
          patientPhone: input.patientPhone || null,
          symptoms: input.symptoms,
          medicalHistory: input.medicalHistory || null,
          medicalReports: input.medicalReports ? JSON.stringify(input.medicalReports) : null,
          labResults: input.labResults ? JSON.stringify(input.labResults) : null,
          xrayImages: input.xrayImages ? JSON.stringify(input.xrayImages) : null,
          otherDocuments: input.otherDocuments ? JSON.stringify(input.otherDocuments) : null,
          preferredLanguage: input.preferredLanguage,
          priority: input.priority || "routine",
          status: 'submitted',
          isFree: input.isFree,
          amount: input.isFree ? 0 : 5, // Consultation fee $5
          paymentStatus: input.isFree ? "completed" : "pending",
        });

        // Mark free consultation as used (increment counter) — admins are exempt
        if (input.isFree && !isAdmin) {
          await db.incrementFreeConsultationsUsed(ctx.user.id);
        }

        // Send email receipt to patient
        await sendConsultationReceipt({
          consultationId: Number(consultationId),
          patientName: input.patientName,
          patientEmail: input.patientEmail,
          amount: input.isFree ? 0 : 5,
          isFree: input.isFree,
          preferredLanguage: input.preferredLanguage,
          createdAt: new Date(),
          status: 'submitted',
        });

        // Send WhatsApp notification to admin
        await sendConsultationWhatsAppNotification({
          patientName: input.patientName,
          symptoms: input.symptoms,
          consultationId: Number(consultationId),
        });

        // Trigger AI processing in the background (non-blocking)
        processConsultationWithAI(Number(consultationId)).catch(error => {
          console.error(`Background AI processing failed for consultation #${consultationId}:`, error);
        });

        // Attach existing medical records if provided
        if (input.attachedRecordIds && input.attachedRecordIds.length > 0) {
          await db.attachRecordsToConsultation(Number(consultationId), input.attachedRecordIds);
        }

        return { success: true, consultationId: Number(consultationId) };
      }),

    // Get user's consultations
    list: protectedProcedure.query(async ({ ctx }) => {
      const consultations = await db.getConsultationsByUserId(ctx.user.id);
      // Parse JSON fields
      return consultations.map(c => ({
        ...c,
        medicalReports: c.medicalReports ? JSON.parse(c.medicalReports) : [],
        labResults: c.labResults ? JSON.parse(c.labResults) : [],
        xrayImages: c.xrayImages ? JSON.parse(c.xrayImages) : [],
        otherDocuments: c.otherDocuments ? JSON.parse(c.otherDocuments) : [],
      }));
    }),

    // Get single consultation
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.id);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        // Only allow user to see their own consultations unless admin
        if (consultation.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        return {
          ...consultation,
          medicalReports: consultation.medicalReports ? JSON.parse(consultation.medicalReports) : [],
          labResults: consultation.labResults ? JSON.parse(consultation.labResults) : [],
          xrayImages: consultation.xrayImages ? JSON.parse(consultation.xrayImages) : [],
          otherDocuments: consultation.otherDocuments ? JSON.parse(consultation.otherDocuments) : [],
        };
      }),

    // Get attached medical records for a consultation
    getAttachedRecords: protectedProcedure
      .input(z.object({ consultationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND' });
        if (consultation.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return db.getAttachedRecordsForConsultation(input.consultationId);
      }),

    // Get user's consultations
    getByUserId: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        // Only allow users to see their own consultations unless admin
        if (input !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        const consultations = await db.getConsultationsByUserId(input);
        return consultations.map(c => ({
          ...c,
          medicalReports: c.medicalReports ? JSON.parse(c.medicalReports) : [],
          labResults: c.labResults ? JSON.parse(c.labResults) : [],
          xrayImages: c.xrayImages ? JSON.parse(c.xrayImages) : [],
          otherDocuments: c.otherDocuments ? JSON.parse(c.otherDocuments) : [],
        }));
      }),

    // Ask a follow-up question about a consultation
    askQuestion: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        question: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this consultation
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation || consultation.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const questionId = await db.createConsultationQuestion({
          consultationId: input.consultationId,
          userId: ctx.user.id,
          question: input.question,
          answer: null,
          answeredBy: null,
          answeredAt: null,
        });

        // Send notification to admins
        await sendNewQuestionNotification(
          input.consultationId,
          ctx.user.name || "Patient",
          ctx.user.email || "",
          input.question
        );

        return { success: true, questionId: Number(questionId) };
      }),

    // Update payment status (called after PayPal payment)
    updatePayment: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        paymentId: z.string(),
        status: z.enum(["completed", "failed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation || consultation.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        await db.updateConsultationPayment(
          input.consultationId,
          input.status,
          input.paymentId
        );

        // If payment completed, move to AI processing
        if (input.status === "completed") {
          await db.updateConsultationStatus(input.consultationId, "ai_processing");
        }

        return { success: true };
      }),

    // ── Step 1: Save form data as a draft (payment_pending) ──
    // Called before PayPal checkout so we have a consultationId to reference.
    createDraft: protectedProcedure
      .input(z.object({
        patientName: z.string().min(1),
        patientEmail: z.string().email(),
        patientPhone: z.string().optional(),
        symptoms: z.string().min(10),
        medicalHistory: z.string().optional(),
        medicalReports: z.array(z.string()).optional(),
        labResults: z.array(z.string()).optional(),
        xrayImages: z.array(z.string()).optional(),
        otherDocuments: z.array(z.string()).optional(),
        preferredLanguage: z.enum(["en", "ar"]),
        priority: z.enum(["routine", "urgent", "critical"]).optional().default("routine"),
        attachedRecordIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Save as draft — paymentStatus=pending, status=submitted but isFree=false
        const consultationId = await db.createConsultation({
          userId: ctx.user.id,
          patientName: input.patientName,
          patientEmail: input.patientEmail,
          patientPhone: input.patientPhone || null,
          symptoms: input.symptoms,
          medicalHistory: input.medicalHistory || null,
          medicalReports: input.medicalReports ? JSON.stringify(input.medicalReports) : null,
          labResults: input.labResults ? JSON.stringify(input.labResults) : null,
          xrayImages: input.xrayImages ? JSON.stringify(input.xrayImages) : null,
          otherDocuments: input.otherDocuments ? JSON.stringify(input.otherDocuments) : null,
          preferredLanguage: input.preferredLanguage,
          priority: input.priority || "routine",
          status: 'submitted',
          isFree: false,
          amount: 5,
          paymentStatus: 'pending', // will be updated after PayPal
        });

        // Attach existing medical records if provided
        if (input.attachedRecordIds && input.attachedRecordIds.length > 0) {
          await db.attachRecordsToConsultation(Number(consultationId), input.attachedRecordIds);
        }

        return { success: true, consultationId: Number(consultationId) };
      }),

    // ── Step 2: Confirm PayPal payment for a draft consultation ──
    // Called after PayPal onApprove with the captured order ID.
    confirmConsultationPayment: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        paypalOrderId: z.string(),
        paypalPayerId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation || consultation.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Consultation not found' });
        }
        if (consultation.paymentStatus === 'completed') {
          // Idempotent — already confirmed
          return { success: true, consultationId: input.consultationId };
        }

        // Mark payment as completed and store the PayPal order ID
        await db.updateConsultationPayment(input.consultationId, 'completed', input.paypalOrderId);

        // Trigger AI processing in the background
        processConsultationWithAI(input.consultationId).catch(error => {
          console.error(`Background AI processing failed for consultation #${input.consultationId}:`, error);
        });

        // Send receipt email
        await sendConsultationReceipt({
          consultationId: input.consultationId,
          patientName: consultation.patientName,
          patientEmail: consultation.patientEmail,
          amount: 5,
          isFree: false,
          preferredLanguage: consultation.preferredLanguage as 'en' | 'ar',
          createdAt: new Date(),
          status: 'submitted',
        });

        // WhatsApp admin notification
        await sendConsultationWhatsAppNotification({
          patientName: consultation.patientName,
          symptoms: consultation.symptoms,
          consultationId: input.consultationId,
        });

        return { success: true, consultationId: input.consultationId };
      }),
  }),

  // Admin routes for managing consultations and AI workflow
  admin: router({
    // Get all consultations
    consultations: adminProcedure.query(async () => {
      const consultations = await db.getAllConsultations();
      return consultations.map(c => ({
        ...c,
        medicalReports: c.medicalReports ? JSON.parse(c.medicalReports) : [],
        labResults: c.labResults ? JSON.parse(c.labResults) : [],
        xrayImages: c.xrayImages ? JSON.parse(c.xrayImages) : [],
        otherDocuments: c.otherDocuments ? JSON.parse(c.otherDocuments) : [],
      }));
    }),

    // Update consultation status
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['submitted', 'ai_processing', 'specialist_review', 'completed', 'follow_up']),
      }))
      .mutation(async ({ input }) => {
        await db.updateConsultationStatus(input.id, input.status);
        
        // Get consultation details to send email notification
        const consultation = await db.getConsultationById(input.id);
        if (consultation) {
          await sendConsultationStatusUpdate(
            consultation.id,
            consultation.patientName,
            consultation.patientEmail,
            input.status,
            consultation.preferredLanguage as "en" | "ar"
          );
        }
        
        return { success: true };
      }),

    // Upload AI-generated results
    uploadAIResults: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        aiAnalysis: z.string().optional(),
        aiReportUrl: z.string().optional(),
        aiVideoUrl: z.string().optional(),
        aiInfographicUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateConsultationAIResults(input.consultationId, {
          aiAnalysis: input.aiAnalysis,
          aiReportUrl: input.aiReportUrl,
          aiVideoUrl: input.aiVideoUrl,
          aiInfographicUrl: input.aiInfographicUrl,
        });
        return { success: true };
      }),

    // Specialist review and approval
    reviewConsultation: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        specialistNotes: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateConsultationSpecialistReview(
          input.consultationId,
          input.specialistNotes,
          ctx.user.id
        );
        return { success: true };
      }),

    // Approve AI-generated content
    approveAIContent: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        specialistNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateConsultation(input.consultationId, {
          specialistApprovalStatus: "approved",
          status: "completed",
          specialistNotes: input.specialistNotes || null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });

        // Send notification to patient that results are ready
        const consultation = await db.getConsultationById(input.consultationId);
        if (consultation) {
          await sendConsultationStatusUpdate(
            consultation.id,
            consultation.patientName,
            consultation.patientEmail,
            "completed",
            consultation.preferredLanguage as "en" | "ar"
          );
        }

        return { success: true };
      }),

    // Reject AI-generated content and trigger reprocessing
    rejectAIContent: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        rejectionReason: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Trigger reprocessing with specialist feedback
        await reprocessConsultationAfterRejection(
          input.consultationId,
          input.rejectionReason
        );
        return { success: true };
      }),

    // Add follow-up information
    addFollowUp: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        treatmentPlan: z.string().optional(),
        followUpNotes: z.string().optional(),
        followUpStatus: z.enum(['pending', 'approved', 'concerns']).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateConsultationFollowUp(input.consultationId, {
          treatmentPlan: input.treatmentPlan,
          followUpNotes: input.followUpNotes,
          followUpStatus: input.followUpStatus,
        });
        return { success: true };
      }),

    // Get statistics
    stats: adminProcedure.query(async () => {
      const consultationStats = await db.getConsultationStats();
      const users = await db.getAllUsers();
      
      return {
        totalUsers: users.length,
        totalConsultations: consultationStats.total,
        submittedConsultations: consultationStats.submitted,
        processingConsultations: consultationStats.processing,
        completedConsultations: consultationStats.completed,
        followUpConsultations: consultationStats.followUp || 0,
      };
    }),

    // Get all users
    users: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    // Regenerate infographic for a consultation
    regenerateInfographic: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }

        if (!consultation.aiAnalysis) {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'AI analysis not available. Cannot regenerate infographic.' 
          });
        }

        // Import generateInfographic function
        const { regenerateInfographicForConsultation } = await import('./contentGeneration');
        
        // Regenerate infographic
        const newInfographicUrl = await regenerateInfographicForConsultation(
          consultation.id,
          consultation.aiAnalysis,
          consultation.patientName,
          consultation.preferredLanguage as "en" | "ar",
          input.customPrompt
        );

        if (!newInfographicUrl) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'Failed to regenerate infographic' 
          });
        }

        // Update consultation with new infographic URL
        await db.updateConsultation(input.consultationId, {
          aiInfographicUrl: newInfographicUrl,
        });

        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'infographic',
          action: 'regenerate',
          status: 'success',
          outputUrl: newInfographicUrl,
        });

        return { 
          success: true, 
          infographicUrl: newInfographicUrl 
        };
      }),

    // Regenerate PDF report for a consultation
    regeneratePdf: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        if (!consultation.aiAnalysis) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'AI analysis not available. Cannot regenerate PDF.' });
        }
        const { regeneratePdfForConsultation } = await import('./contentGeneration');
        const newPdfUrl = await regeneratePdfForConsultation(
          consultation.id,
          consultation.aiAnalysis,
          consultation.patientName,
          consultation.preferredLanguage as 'en' | 'ar'
        );
        if (!newPdfUrl) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to regenerate PDF report' });
        }
        await db.updateConsultation(input.consultationId, { aiReportUrl: newPdfUrl });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'pdf',
          action: 'regenerate',
          status: 'success',
          outputUrl: newPdfUrl,
        });
        return { success: true, pdfUrl: newPdfUrl };
      }),

    // Regenerate slide deck for a consultation
    regenerateSlides: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        if (!consultation.aiAnalysis) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'AI analysis not available. Cannot regenerate slides.' });
        }
        const { regenerateSlidesForConsultation } = await import('./contentGeneration');
        const newSlidesUrl = await regenerateSlidesForConsultation(
          consultation.id,
          consultation.aiAnalysis,
          consultation.patientName,
          consultation.preferredLanguage as 'en' | 'ar'
        );
        if (!newSlidesUrl) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to regenerate slide deck' });
        }
        await db.updateConsultation(input.consultationId, { aiSlideDeckUrl: newSlidesUrl });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'slides',
          action: 'regenerate',
          status: 'success',
          outputUrl: newSlidesUrl,
        });
        return { success: true, slidesUrl: newSlidesUrl };
      }),

    // Regenerate mind map for a consultation
    regenerateMindMap: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        if (!consultation.aiAnalysis) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'AI analysis not available. Cannot regenerate mind map.' });
        }
        const { regenerateMindMapForConsultation } = await import('./contentGeneration');
        const newMindMapUrl = await regenerateMindMapForConsultation(
          consultation.id,
          consultation.aiAnalysis,
          consultation.symptoms,
          consultation.preferredLanguage as 'en' | 'ar'
        );
        if (!newMindMapUrl) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to regenerate mind map' });
        }
        await db.updateConsultation(input.consultationId, { aiMindMapUrl: newMindMapUrl });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'mindmap',
          action: 'regenerate',
          status: 'success',
          outputUrl: newMindMapUrl,
        });
        return { success: true, mindMapUrl: newMindMapUrl };
      }),

    // Regenerate ALL reports at once
    regenerateAllReports: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        if (!consultation.aiAnalysis) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'AI analysis not available. Cannot regenerate reports.' });
        }
        const {
          regenerateInfographicForConsultation,
          regeneratePdfForConsultation,
          regenerateSlidesForConsultation,
          regenerateMindMapForConsultation,
        } = await import('./contentGeneration');
        const lang = consultation.preferredLanguage as 'en' | 'ar';
        const [infographicUrl, pdfUrl, slidesUrl, mindMapUrl] = await Promise.all([
          regenerateInfographicForConsultation(consultation.id, consultation.aiAnalysis, consultation.patientName, lang),
          regeneratePdfForConsultation(consultation.id, consultation.aiAnalysis, consultation.patientName, lang),
          regenerateSlidesForConsultation(consultation.id, consultation.aiAnalysis, consultation.patientName, lang),
          regenerateMindMapForConsultation(consultation.id, consultation.aiAnalysis, consultation.symptoms, lang),
        ]);
        await db.updateConsultation(input.consultationId, {
          aiInfographicUrl: infographicUrl ?? undefined,
          aiReportUrl: pdfUrl ?? undefined,
          aiSlideDeckUrl: slidesUrl ?? undefined,
          aiMindMapUrl: mindMapUrl ?? undefined,
          materialsRegeneratedAt: new Date(),
          materialsRegeneratedCount: (consultation.materialsRegeneratedCount || 0) + 1,
        });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'all',
          action: 'regenerate',
          status: 'success',
        });
        // Notify patient by email that their reports are ready
        if (consultation.patientEmail) {
          sendReportReadyNotification(
            consultation.patientEmail,
            consultation.patientName,
            consultation.id,
            pdfUrl ?? `${ctx.req.headers.origin ?? 'https://smartmedcon-jsnymp6w.manus.space'}/dashboard`,
            lang
          ).catch(err => console.error('[Email] Failed to send report-ready notification:', err));
        }
        return { success: true, infographicUrl, pdfUrl, slidesUrl, mindMapUrl };
      }),

    // Upload and replace infographic with a custom image (base64)
    uploadReplaceInfographic: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        fileBase64: z.string(), // base64-encoded image data
        mimeType: z.string().default('image/png'), // e.g. image/png, image/jpeg
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType.split('/')[1] || 'png';
        const key = `infographics/custom-${input.consultationId}-${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateConsultation(input.consultationId, { aiInfographicUrl: url });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'upload_infographic',
          action: 'upload',
          status: 'success',
          outputUrl: url,
        });
        return { success: true, infographicUrl: url };
      }),

    // Upload and replace PPTX with a custom file (base64)
    uploadReplacePptx: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        fileBase64: z.string(), // base64-encoded PPTX data
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const key = `pptx/custom-${input.consultationId}-${nanoid()}.pptx`;
        const { url } = await storagePut(key, buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        // Store in dedicated pptxReportUrl column
        await db.updateConsultation(input.consultationId, { pptxReportUrl: url });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'upload_pptx',
          action: 'upload',
          status: 'success',
          outputUrl: url,
        });
        return { success: true, pptxUrl: url };
      }),

    // Generate PPTX report using Manus LLM + pptxgenjs
    generatePptxReport: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }
        const { generatePptxForConsultation } = await import('./pptxGeneration');
        const pptxUrl = await generatePptxForConsultation({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          symptoms: consultation.symptoms,
          medicalHistory: consultation.medicalHistory ?? null,
          aiAnalysis: consultation.aiAnalysis ?? null,
          preferredLanguage: (consultation.preferredLanguage ?? 'ar') as 'en' | 'ar',
        });
        await db.updateConsultation(input.consultationId, { pptxReportUrl: pptxUrl });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'pptx',
          action: 'generate',
          status: 'success',
          outputUrl: pptxUrl,
        });
        // Notify patient by email that their professional report is ready
        if (consultation.patientEmail) {
          sendReportReadyNotification(
            consultation.patientEmail,
            consultation.patientName,
            consultation.id,
            pptxUrl,
            (consultation.preferredLanguage ?? 'ar') as 'en' | 'ar'
          ).catch(err => console.error('[Email] Failed to send report-ready notification:', err));
        }
        return { success: true, pptxUrl };
      }),

    // Upload and replace PDF report with a custom file (base64)
    uploadReplacePdf: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        fileBase64: z.string(),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const key = `reports/custom-pdf-${input.consultationId}-${nanoid()}.pdf`;
        const { url } = await storagePut(key, buffer, 'application/pdf');
        await db.updateConsultation(input.consultationId, { aiReportUrl: url });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'upload_pdf',
          action: 'upload',
          status: 'success',
          outputUrl: url,
        });
        return { success: true, pdfUrl: url };
      }),

    // Upload and replace slide deck with a custom file (base64 PDF or PPTX)
    uploadReplaceSlides: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('application/pdf'),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const isPptx = input.mimeType.includes('presentationml');
        const ext = isPptx ? 'pptx' : 'pdf';
        const key = `slides/custom-${input.consultationId}-${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateConsultation(input.consultationId, { aiSlideDeckUrl: url });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'upload_slides',
          action: 'upload',
          status: 'success',
          outputUrl: url,
        });
        return { success: true, slidesUrl: url };
      }),

    // Upload and replace mind map with a custom image (base64)
    uploadReplaceMindMap: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/png'),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType.split('/')[1] || 'png';
        const key = `mindmaps/custom-${input.consultationId}-${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateConsultation(input.consultationId, { aiMindMapUrl: url });
        await db.insertReportLog({
          consultationId: consultation.id,
          patientName: consultation.patientName,
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? 'Admin',
          reportType: 'upload_mindmap',
          action: 'upload',
          status: 'success',
          outputUrl: url,
        });
        return { success: true, mindMapUrl: url };
      }),

    // Send one or more reports to the patient — sets the sentXxxToPatient flags
    sendReportToPatient: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        // Which reports to send (at least one must be true)
        sendPdf: z.boolean().default(false),
        sendInfographic: z.boolean().default(false),
        sendSlides: z.boolean().default(false),
        sendMindMap: z.boolean().default(false),
        sendPptx: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });

        const updates: Record<string, any> = {
          sentToPatientAt: new Date(),
          sentToPatientBy: ctx.user.id,
        };
        if (input.sendPdf) updates.sentPdfToPatient = true;
        if (input.sendInfographic) updates.sentInfographicToPatient = true;
        if (input.sendSlides) updates.sentSlidesToPatient = true;
        if (input.sendMindMap) updates.sentMindMapToPatient = true;
        if (input.sendPptx) updates.sentPptxToPatient = true;

        await db.updateConsultation(input.consultationId, updates);

        // Fire-and-forget email notification
        const sentCount = [input.sendPdf, input.sendInfographic, input.sendSlides, input.sendMindMap, input.sendPptx].filter(Boolean).length;
        if (sentCount > 0 && consultation.patientEmail) {
          // Pick the most prominent URL to link in the email
          const reportUrl =
            (input.sendPptx && consultation.pptxReportUrl) ||
            (input.sendPdf && consultation.aiReportUrl) ||
            (input.sendInfographic && consultation.aiInfographicUrl) ||
            (input.sendSlides && consultation.aiSlideDeckUrl) ||
            (input.sendMindMap && consultation.aiMindMapUrl) ||
            null;
          sendReportReadyNotification(
            consultation.patientEmail,
            consultation.patientName,
            consultation.id,
            (reportUrl as string | null) ?? 'https://smartmedcon-jsnymp6w.manus.space/dashboard',
            (consultation.preferredLanguage ?? 'ar') as 'en' | 'ar'
          ).catch(err => console.error('[Email] sendReportToPatient notification failed:', err));
        }

        return { success: true, updatedFields: Object.keys(updates) };
      }),

    // Get report generation audit log
    getReportLogs: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        reportType: z.string().optional(),
        adminId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getReportLogs({
          limit: input.limit,
          offset: input.offset,
          reportType: input.reportType,
          adminId: input.adminId,
        });
      }),

    // Get analytics data
    analytics: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;
        
        const consultationAnalytics = await db.getConsultationAnalytics(startDate, endDate);
        const questionAnalytics = await db.getQuestionAnalytics();
        
        return {
          consultations: consultationAnalytics,
          questions: questionAnalytics,
        };
      }),

    // Answer a patient's follow-up question
    answerQuestion: adminProcedure
      .input(z.object({
        questionId: z.number(),
        answer: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get the question details first
        const questions = await db.getQuestionsByConsultationId(0); // Will filter below
        const allQuestions = [];
        
        // Get all consultations to find the question
        const consultations = await db.getAllConsultations();
        for (const consultation of consultations) {
          const consultationQuestions = await db.getQuestionsByConsultationId(consultation.id);
          allQuestions.push(...consultationQuestions.map(q => ({ ...q, consultation })));
        }
        
        const questionWithConsultation = allQuestions.find(q => q.id === input.questionId);
        
        // Answer the question
        await db.answerQuestion(input.questionId, input.answer, ctx.user.id);
        
        // Send notification to patient if we found the question
        if (questionWithConsultation) {
          const consultation = questionWithConsultation.consultation;
          const user = await db.getUserById(consultation.userId);
          
          if (user && user.email) {
            await sendQuestionAnsweredNotification(
              user.email,
              user.name || "Patient",
              consultation.id,
              questionWithConsultation.question,
              input.answer,
              consultation.preferredLanguage as "en" | "ar"
            );
          }
        }
        
        return { success: true };
      }),

    // Video management
    videos: router({
      list: adminProcedure.query(async () => {
        return await db.getAllVideos();
      }),

      create: adminProcedure
        .input(z.object({
          titleEn: z.string(),
          titleAr: z.string(),
          descriptionEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          videoUrl: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
          duration: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await db.createVideo(input);
          return { success: true, id };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteVideo(input.id);
          return { success: true };
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          titleEn: z.string().optional(),
          titleAr: z.string().optional(),
          descriptionEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          videoUrl: z.string().url().optional(),
          thumbnailUrl: z.string().url().optional(),
          duration: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          await db.updateVideo(input.id, input);
          return { success: true };
        }),
    }),

    // Podcast management
    podcasts: router({
      list: adminProcedure.query(async () => {
        return await db.getAllPodcasts();
      }),

      create: adminProcedure
        .input(z.object({
          titleEn: z.string(),
          titleAr: z.string(),
          descriptionEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          audioUrl: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
          duration: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await db.createPodcast(input);
          return { success: true, id };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deletePodcast(input.id);
          return { success: true };
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          titleEn: z.string().optional(),
          titleAr: z.string().optional(),
          descriptionEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          audioUrl: z.string().url().optional(),
          thumbnailUrl: z.string().url().optional(),
          duration: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          await db.updatePodcast(input.id, input);
          return { success: true };
        }),
    }),
  }),

  // Public routes for videos and podcasts
  media: router({
    videos: publicProcedure.query(async () => {
      return await db.getAllVideos();
    }),

    podcasts: publicProcedure.query(async () => {
      return await db.getAllPodcasts();
    }),

    incrementVideoViews: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementVideoViews(input.id);
        return { success: true };
      }),

    incrementPodcastViews: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementPodcastViews(input.id);
        return { success: true };
      }),

    // Watch history endpoints
    saveWatchProgress: protectedProcedure
      .input(z.object({
        mediaType: z.enum(["video", "podcast"]),
        mediaId: z.number(),
        progress: z.number(),
        duration: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertWatchHistory({
          userId: ctx.user.id,
          mediaType: input.mediaType,
          mediaId: input.mediaId,
          progress: input.progress,
          duration: input.duration,
        });
        return { success: true };
      }),

    getWatchHistory: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWatchHistory(ctx.user.id);
    }),

    getContinueWatching: protectedProcedure.query(async ({ ctx }) => {
      return await db.getContinueWatching(ctx.user.id);
    }),
  }),

  // Satisfaction Survey routes
  survey: router({
    submit: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        overallRating: z.number().min(1).max(5),
        aiQualityRating: z.number().min(1).max(5).optional(),
        specialistRating: z.number().min(1).max(5).optional(),
        responseTimeRating: z.number().min(1).max(5).optional(),
        feedback: z.string().optional(),
        wouldRecommend: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify the consultation belongs to the user
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation || consultation.userId !== ctx.user.id) {
          throw new Error("Consultation not found or unauthorized");
        }

        // Check if survey already exists
        const existing = await db.getSatisfactionSurveyByConsultation(input.consultationId);
        if (existing) {
          throw new Error("Survey already submitted for this consultation");
        }

        const surveyId = await db.createSatisfactionSurvey({
          consultationId: input.consultationId,
          userId: ctx.user.id,
          overallRating: input.overallRating,
          aiQualityRating: input.aiQualityRating,
          specialistRating: input.specialistRating,
          responseTimeRating: input.responseTimeRating,
          feedback: input.feedback,
          wouldRecommend: input.wouldRecommend,
        });

        return { success: true, surveyId };
      }),

    getBySurvey: protectedProcedure
      .input(z.object({ consultationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSatisfactionSurveyByConsultation(input.consultationId);
      }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      // Only allow admins to view stats
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      return await db.getSatisfactionSurveyStats();
    }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      // Only allow admins to view all surveys
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      return await db.getAllSatisfactionSurveys();
    }),
  }),

  voiceTranscription: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.enum(["en", "ar"]).optional(),
        prompt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await transcribeAudio({
            audioUrl: input.audioUrl,
            language: input.language,
            prompt: input.prompt,
          });
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to transcribe audio',
          });
        }
      }),
  }),

  // Mind Map and Research routes
  research: router({
    // Generate or retrieve mind map for a consultation
    getMindMap: adminProcedure
      .input(z.object({ consultationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getResearchTopics(input.consultationId);
      }),

    // Generate new mind map for consultation
    generateMindMap: adminProcedure
      .input(z.object({ consultationId: z.number() }))
      .mutation(async ({ input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }

        // Import mind map generator
        const { generateResearchMindMap } = await import('./mindMapGenerator');
        
        const mindMapData = await generateResearchMindMap(
          consultation.symptoms,
          consultation.medicalHistory || undefined,
          consultation.aiAnalysis || "Pending analysis",
          consultation.preferredLanguage
        );

        // Store mind map topics in database
        await db.saveResearchTopics(input.consultationId, mindMapData.nodes);

        return { success: true, mindMap: mindMapData };
      }),

    // Trigger deep research on a specific topic
    performDeepResearch: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        topicId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }

        const topic = await db.getResearchTopicById(input.consultationId, input.topicId);
        if (!topic) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Research topic not found' });
        }

        // Perform deep research
        const { performDeepResearch } = await import('./mindMapGenerator');
        const researchContent = await performDeepResearch(
          topic.label,
          `Symptoms: ${consultation.symptoms}\nInitial Analysis: ${consultation.aiAnalysis || 'Pending'}`,
          consultation.preferredLanguage
        );

        // Update topic with research results
        await db.updateResearchTopic(input.consultationId, input.topicId, {
          researched: true,
          researchContent,
          researchedBy: ctx.user.id,
          researchedAt: new Date(),
        });

        // Trigger automatic material regeneration
        const { regenerateMaterialsAfterResearch } = await import('./materialRegenerationService');
        await regenerateMaterialsAfterResearch(input.consultationId);

        return { success: true, researchContent };
      }),

    // Get research results for a topic
    getResearchResults: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        topicId: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getResearchTopicById(input.consultationId, input.topicId);
      }),
  }),

  // Slide generation request routes
  slideGeneration: router({
    // Request slide generation for a consultation
    requestGeneration: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        }

        // Check if slide content is prepared
        if (!consultation.aiInfographicContent || !consultation.aiSlideDeckContent) {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'Slide content not yet prepared. Please wait for AI processing to complete.' 
          });
        }

        // Create slide generation request
        const { createSlideGenerationRequest } = await import('./db');
        const request = await createSlideGenerationRequest({
          consultationId: input.consultationId,
          requestedBy: ctx.user.id,
        });

        // Notify owner that slides need to be generated
        const { notifyOwner } = await import('./_core/notification');
        await notifyOwner({
          title: 'Slide Generation Requested',
          content: `Admin has requested slide generation for consultation #${input.consultationId}. Please generate slides using the agent.`,
        });

        return { success: true, requestId: request.id };
      }),

    // Get pending slide generation requests
    getPendingRequests: adminProcedure
      .query(async () => {
        const { getPendingSlideRequests } = await import('./db');
        return await getPendingSlideRequests();
      }),

    // Get request status
    getRequestStatus: adminProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getSlideRequestByConsultation } = await import('./db');
        return await getSlideRequestByConsultation(input.consultationId);
      }),
  }),

  // Blog routes
  blog: router({
    // Public routes
    getAllCategories: publicProcedure
      .query(async () => {
        const { getAllBlogCategories } = await import('./db');
        return await getAllBlogCategories();
      }),

    getAllPublishedPosts: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getAllPublishedBlogPosts } = await import('./db');
        return await getAllPublishedBlogPosts(input?.categoryId);
      }),

    getPostBySlug: publicProcedure
      .input(z.object({
        slug: z.string(),
        language: z.enum(['en', 'ar']),
      }))
      .query(async ({ input }) => {
        const { getBlogPostBySlug, incrementBlogPostViews } = await import('./db');
        const post = await getBlogPostBySlug(input.slug, input.language);
        
        if (post) {
          // Increment view count
          await incrementBlogPostViews(post.id);
        }
        
        return post;
      }),

    searchPosts: publicProcedure
      .input(z.object({
        query: z.string(),
        language: z.enum(['en', 'ar']),
      }))
      .query(async ({ input }) => {
        const { searchBlogPosts } = await import('./db');
        return await searchBlogPosts(input.query, input.language);
      }),

    // Admin routes
    getAllPosts: adminProcedure
      .query(async () => {
        const { getAllBlogPosts } = await import('./db');
        return await getAllBlogPosts(true); // Include unpublished
      }),

    createCategory: adminProcedure
      .input(z.object({
        nameEn: z.string(),
        nameAr: z.string(),
        slugEn: z.string(),
        slugAr: z.string(),
        descriptionEn: z.string().optional(),
        descriptionAr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createBlogCategory } = await import('./db');
        const id = await createBlogCategory(input);
        return { success: true, id };
      }),

    createPost: adminProcedure
      .input(z.object({
        categoryId: z.number(),
        titleEn: z.string(),
        titleAr: z.string(),
        slugEn: z.string(),
        slugAr: z.string(),
        excerptEn: z.string(),
        excerptAr: z.string(),
        contentEn: z.string(),
        contentAr: z.string(),
        metaDescriptionEn: z.string().optional(),
        metaDescriptionAr: z.string().optional(),
        metaKeywordsEn: z.string().optional(),
        metaKeywordsAr: z.string().optional(),
        featuredImage: z.string().optional(),
        featuredImageAlt: z.string().optional(),
        published: z.boolean().default(false),
        readingTimeMinutes: z.number().default(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createBlogPost } = await import('./db');
        const id = await createBlogPost({
          ...input,
          authorId: ctx.user.id,
          publishedAt: input.published ? new Date() : null,
        });
        return { success: true, id };
      }),

    updatePost: adminProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        titleEn: z.string().optional(),
        titleAr: z.string().optional(),
        slugEn: z.string().optional(),
        slugAr: z.string().optional(),
        excerptEn: z.string().optional(),
        excerptAr: z.string().optional(),
        contentEn: z.string().optional(),
        contentAr: z.string().optional(),
        metaDescriptionEn: z.string().optional(),
        metaDescriptionAr: z.string().optional(),
        metaKeywordsEn: z.string().optional(),
        metaKeywordsAr: z.string().optional(),
        featuredImage: z.string().optional(),
        featuredImageAlt: z.string().optional(),
        published: z.boolean().optional(),
        readingTimeMinutes: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateBlogPost } = await import('./db');
        const { id, ...updates } = input;
        
        // If publishing for the first time, set publishedAt
        if (updates.published) {
          const { getBlogPostById } = await import('./db');
          const post = await getBlogPostById(id);
          if (post && !post.publishedAt) {
            (updates as any).publishedAt = new Date();
          }
        }
        
        await updateBlogPost(id, updates);
        return { success: true };
      }),
  }),

  // Subscription / consultation purchase routes
  subscription: router({
    // Get current user's consultation balance and subscription info
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      return {
        consultationsRemaining: (user as any).consultations_remaining ?? ctx.user.consultationsRemaining ?? 0,
        subscriptionType: (user as any).subscription_type ?? ctx.user.subscriptionType ?? 'free',
        hasUsedFreeConsultation: Boolean((user as any).has_used_free_consultation ?? ctx.user.hasUsedFreeConsultation),
      };
    }),

    // Purchase additional consultations via PayPal
    purchaseConsultations: protectedProcedure
      .input(z.object({
        paypalOrderId: z.string(),
        paypalPayerId: z.string().optional(),
        plan: z.enum(['basic', 'standard', 'premium']), // all map to 1 consultation for $5
      }))
      .mutation(async ({ ctx, input }) => {
        // Pricing model: $5 = 1 consultation (flat rate, no bulk discounts)
        const planDetails: Record<string, { consultations: number; amount: number }> = {
          basic: { consultations: 1, amount: 5 },
          standard: { consultations: 1, amount: 5 },
          premium: { consultations: 1, amount: 5 },
        };
        const plan = planDetails[input.plan];

        // Check for duplicate payment
        const existing = await db.getRegistrationPaymentByOrderId(input.paypalOrderId);
        if (existing && existing.status === 'completed') {
          throw new TRPCError({ code: 'CONFLICT', message: 'Payment already processed' });
        }

        // Record payment
        if (!existing) {
          await db.createRegistrationPayment({
            userId: ctx.user.id,
            paypalOrderId: input.paypalOrderId,
            amount: plan.amount,
            currency: 'USD',
            status: 'completed',
            consultationsGranted: plan.consultations,
          });
        } else {
          await db.updateRegistrationPaymentStatus(input.paypalOrderId, 'completed', input.paypalPayerId);
        }

        // Grant consultations
        await db.grantConsultationsAfterPayment(ctx.user.id, plan.consultations);

        // Notify owner
        const { notifyOwner } = await import('./_core/notification');
        await notifyOwner({
          title: `New Consultation Purchase - ${ctx.user.name}`,
          content: `User ${ctx.user.name} purchased the ${input.plan} plan (${plan.consultations} consultations for $${plan.amount}).`,
        });

        return { success: true, consultationsGranted: plan.consultations, amount: plan.amount };
      }),
  }),

  // Personal medical profile routes
  profile: router({
    // Get full profile: user info + stats + consultation summary
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const consultationsList = await db.getConsultationsByUserId(ctx.user.id);
      const records = await db.getUserMedicalRecords(ctx.user.id);

      const totalConsultations = consultationsList.length;
      const completedConsultations = consultationsList.filter((c: any) => c.status === 'completed').length;
      const pendingConsultations = consultationsList.filter((c: any) =>
        ['submitted', 'ai_processing', 'specialist_review'].includes(c.status)
      ).length;

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          loginMethod: (user as any).login_method ?? user.loginMethod ?? 'oauth',
          subscriptionType: (user as any).subscription_type ?? user.subscriptionType ?? 'free',
          consultationsRemaining: (user as any).consultations_remaining ?? user.consultationsRemaining ?? 0,
          hasUsedFreeConsultation: Boolean((user as any).has_used_free_consultation ?? user.hasUsedFreeConsultation),
          avatarUrl: (user as any).avatar_url ?? user.avatarUrl ?? null,
          bio: (user as any).bio ?? null,
          createdAt: user.createdAt,
        },
        stats: {
          totalConsultations,
          completedConsultations,
          pendingConsultations,
          totalRecords: records.length,
        },
        consultations: consultationsList,
        records,
      };
    }),

    // Get user's medical records
    getRecords: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMedicalRecords(ctx.user.id);
    }),

    // Upload a new medical record
    uploadRecord: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64
        category: z.enum(['medical_report', 'lab_result', 'xray', 'prescription', 'other']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedTypes = [
          'application/pdf',
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedTypes.includes(input.fileType)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid file type. Only PDF, images, and Word documents are allowed.' });
        }

        const fileBuffer = Buffer.from(input.fileData, 'base64');
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileBuffer.length > maxSize) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'File too large. Maximum size is 10MB.' });
        }

        const ext = input.fileName.split('.').pop() || 'bin';
        const fileKey = `user-records/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.fileType);

        const recordId = await db.createUserMedicalRecord({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileUrl: url,
          fileKey,
          fileType: input.fileType,
          fileSize: fileBuffer.length,
          category: input.category,
          notes: input.notes,
        });

        return { success: true, recordId, fileUrl: url };
      }),

    // Delete a medical record
    deleteRecord: protectedProcedure
      .input(z.object({ recordId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await db.deleteUserMedicalRecord(input.recordId, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Record not found or not authorized' });
        }
        return { success: true };
      }),

    // ── Update Profile (bio + avatarUrl) ──
    updateProfile: protectedProcedure
      .input(z.object({
        bio: z.string().max(300).nullable().optional(),
        avatarUrl: z.string().url().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, {
          bio: input.bio,
          avatarUrl: input.avatarUrl,
        });
        return { success: true };
      }),

    // ── Upload Avatar (base64 → S3) ──
    uploadAvatar: protectedProcedure
      .input(z.object({
        fileData: z.string(), // base64
        fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (fileBuffer.length > maxSize) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Image too large. Maximum size is 5MB.' });
        }
        const ext = input.fileType.split('/')[1];
        const fileKey = `avatars/user-${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.fileType);
        // Persist the new avatar URL to the user record
        await db.updateUserProfile(ctx.user.id, { avatarUrl: url });
        return { url };
      }),

    // ── Admin: Get any user's full profile ──
    getProfileByUserId: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        const consultationsList = await db.getConsultationsByUserId(input.userId);
        const records = await db.getUserMedicalRecords(input.userId);
        const totalConsultations = consultationsList.length;
        const completedConsultations = consultationsList.filter((c: any) => c.status === 'completed').length;
        const pendingConsultations = consultationsList.filter((c: any) =>
          ['submitted', 'ai_processing', 'specialist_review'].includes(c.status)
        ).length;
        const freeTotal = (user as any).free_consultations_total ?? (user as any).freeConsultationsTotal ?? 0;
        const freeUsed = (user as any).free_consultations_used ?? (user as any).freeConsultationsUsed ?? 0;
        const consultationsRemaining = Math.max(0, freeTotal - freeUsed);
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            loginMethod: (user as any).login_method ?? user.loginMethod ?? 'oauth',
            subscriptionType: (user as any).subscription_type ?? user.subscriptionType ?? 'free',
            planType: (user as any).plan_type ?? 'free',
            consultationsRemaining,
            freeConsultationsTotal: freeTotal,
            freeConsultationsUsed: freeUsed,
            avatarUrl: (user as any).avatar_url ?? user.avatarUrl ?? null,
            bio: (user as any).bio ?? null,
            createdAt: user.createdAt,
          },
          stats: {
            totalConsultations,
            completedConsultations,
            pendingConsultations,
            totalRecords: records.length,
            consultationsRemaining,
          },
          consultations: consultationsList,
          records,
        };
      }),

    // ── Payment History ──
    // Returns all completed-payment consultations for the current user.
    getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const rows = await db.getUserPaymentHistory(ctx.user.id);
      return rows.map(r => ({
        consultationId: r.consultationId,
        patientName: r.patientName,
        // Truncate symptoms to a short preview
        symptomsPreview: r.symptoms.length > 80 ? r.symptoms.slice(0, 80) + '…' : r.symptoms,
        amount: r.amount,
        paymentStatus: r.paymentStatus,
        paymentId: r.paymentId,
        isFree: r.isFree,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    }),
  }),

  // ── External Upload Tokens ──
  uploadToken: router({
    // Admin: generate a single-use upload link for a specific consultation report
    generate: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        reportType: z.enum(['infographic', 'slides', 'pdf', 'mindmap', 'pptx']),
        expiresInHours: z.number().min(1).max(168).default(48),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        const { nanoid } = await import('nanoid');
        const token = nanoid(48);
        const expiresAt = Date.now() + input.expiresInHours * 60 * 60 * 1000;
        await db.insertUploadToken({
          token,
          consultationId: input.consultationId,
          patientName: consultation.patientName,
          reportType: input.reportType,
          createdByAdminId: ctx.user.id,
          createdByAdminName: ctx.user.name ?? 'Admin',
          expiresAt,
        });
        return { token, expiresAt };
      }),

    // Public: validate a token and return its metadata (no auth required)
    validate: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const record = await db.getUploadToken(input.token);
        if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired link' });
        if (record.usedAt) throw new TRPCError({ code: 'FORBIDDEN', message: 'This link has already been used' });
        if (Date.now() > record.expiresAt) throw new TRPCError({ code: 'FORBIDDEN', message: 'This link has expired' });
        return {
          consultationId: record.consultationId,
          patientName: record.patientName,
          reportType: record.reportType,
          expiresAt: record.expiresAt,
        };
      }),

    // Public: consume a token — upload file, save to DB, notify patient
    consume: publicProcedure
      .input(z.object({
        token: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const record = await db.getUploadToken(input.token);
        if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired link' });
        if (record.usedAt) throw new TRPCError({ code: 'FORBIDDEN', message: 'This link has already been used' });
        if (Date.now() > record.expiresAt) throw new TRPCError({ code: 'FORBIDDEN', message: 'This link has expired' });

        const { storagePut } = await import('./storage');
        const { nanoid } = await import('nanoid');
        const buffer = Buffer.from(input.fileBase64, 'base64');

        // Determine S3 key by report type
        const extMap: Record<string, string> = {
          'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
          'application/pdf': 'pdf',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        };
        const ext = extMap[input.mimeType] ?? 'bin';
        const key = `external-uploads/${record.reportType}-${record.consultationId}-${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);

        // Map reportType to DB column
        const colMap: Record<string, string> = {
          infographic: 'aiInfographicUrl',
          slides: 'aiSlideDeckUrl',
          pdf: 'aiReportUrl',
          mindmap: 'aiMindMapUrl',
          pptx: 'pptxReportUrl',
        };
        await db.updateConsultation(record.consultationId, { [colMap[record.reportType]]: url });
        await db.markTokenUsed(input.token, url);

        // Log the upload
        await db.insertReportLog({
          consultationId: record.consultationId,
          patientName: record.patientName,
          adminId: record.createdByAdminId,
          adminName: record.createdByAdminName,
          reportType: `upload_${record.reportType}` as any,
          action: 'upload',
          status: 'success',
          outputUrl: url,
        });

        // Notify patient if PPTX or infographic
        const consultation = await db.getConsultationById(record.consultationId);
        if (consultation) {
          const user = await db.getUserById(consultation.userId);
          if (user?.email && (record.reportType === 'pptx' || record.reportType === 'infographic' || record.reportType === 'slides')) {
            const { sendReportReadyNotification } = await import('./emailNotifications');
            await sendReportReadyNotification(
              user.email,
              user.name || consultation.patientName,
              record.consultationId,
              url,
              (consultation.preferredLanguage as 'en' | 'ar') ?? 'ar'
            ).catch(() => {});
          }
        }

        return { success: true, fileUrl: url };
      }),
  }),

  // ── Contact ──
  contact: router({
    sendMessage: publicProcedure
      .input(z.object({
        name: z.string().min(1, 'Name is required').max(100),
        email: z.string().email('Valid email required'),
        message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
      }))
      .mutation(async ({ input }) => {
        const { notifyOwner } = await import('./_core/notification');
        await notifyOwner({
          title: `New Contact Message from ${input.name}`,
          content: `Name: ${input.name}\nEmail: ${input.email}\n\nMessage:\n${input.message}`,
        });
        return { success: true };
      }),
  }),

  // ── Doctor AI Materials Review ─────────────────────────────────────────────
  doctorReview: router({
    // Approve all AI-generated materials and send to patient
    approveAIMaterials: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        doctorNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });

        // Mark all available materials as sent to patient
        const updates: Record<string, unknown> = {
          status: 'doctor_reviewed',
          specialistApprovalStatus: 'approved',
          doctorNotes: input.doctorNotes ?? null,
          doctorReviewedAt: new Date(),
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        };
        if (consultation.aiReportUrl) updates.sentPdfToPatient = true;
        if (consultation.aiInfographicUrl) updates.sentInfographicToPatient = true;
        if (consultation.aiSlideDeckUrl) updates.sentSlidesToPatient = true;
        if ((consultation as any).aiMindMapUrl) updates.sentMindMapToPatient = true;
        if ((consultation as any).pptxReportUrl) updates.sentPptxToPatient = true;
        updates.sentToPatientAt = new Date();
        updates.sentToPatientBy = ctx.user.id;

        await db.updateConsultation(input.consultationId, updates);

        // Notify patient
        const patient = await db.getUserById(consultation.userId);
        if (patient?.email) {
          const { sendReportReadyNotification } = await import('./emailNotifications');
          await sendReportReadyNotification(
            patient.email,
            patient.name || 'Patient',
            consultation.id,
            consultation.aiReportUrl ?? 'https://smartmedcon-jsnymp6w.manus.space/dashboard',
            (consultation.preferredLanguage ?? 'ar') as 'en' | 'ar'
          ).catch((err: unknown) => console.error('[Email] approveAIMaterials notification failed:', err));
        }

        return { success: true };
      }),

    // Edit notes and approve — updates doctorNotes then sends all materials
    editAndApprove: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        doctorNotes: z.string().min(1),
        overrideReportUrl: z.string().url().optional(),
        overrideInfographicUrl: z.string().url().optional(),
        overrideSlideDeckUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });

        const updates: Record<string, unknown> = {
          status: 'doctor_reviewed',
          specialistApprovalStatus: 'approved',
          doctorNotes: input.doctorNotes,
          doctorReviewedAt: new Date(),
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          sentToPatientAt: new Date(),
          sentToPatientBy: ctx.user.id,
        };
        // Apply URL overrides if provided
        if (input.overrideReportUrl) { updates.aiReportUrl = input.overrideReportUrl; updates.sentPdfToPatient = true; }
        else if (consultation.aiReportUrl) updates.sentPdfToPatient = true;
        if (input.overrideInfographicUrl) { updates.aiInfographicUrl = input.overrideInfographicUrl; updates.sentInfographicToPatient = true; }
        else if (consultation.aiInfographicUrl) updates.sentInfographicToPatient = true;
        if (input.overrideSlideDeckUrl) { updates.aiSlideDeckUrl = input.overrideSlideDeckUrl; updates.sentSlidesToPatient = true; }
        else if (consultation.aiSlideDeckUrl) updates.sentSlidesToPatient = true;

        await db.updateConsultation(input.consultationId, updates);

        // Notify patient
        const patient = await db.getUserById(consultation.userId);
        if (patient?.email) {
          const { sendReportReadyNotification } = await import('./emailNotifications');
          await sendReportReadyNotification(
            patient.email,
            patient.name || 'Patient',
            consultation.id,
            (updates.aiReportUrl as string | undefined) ?? consultation.aiReportUrl ?? 'https://smartmedcon-jsnymp6w.manus.space/dashboard',
            (consultation.preferredLanguage ?? 'ar') as 'en' | 'ar'
          ).catch((err: unknown) => console.error('[Email] editAndApprove notification failed:', err));
        }

        return { success: true };
      }),

    // Request revision — sends consultation back to patient for more info
    requestRevision: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        revisionReason: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });

        await db.updateConsultation(input.consultationId, {
          status: 'submitted',
          specialistApprovalStatus: 'needs_deep_analysis',
          specialistRejectionReason: input.revisionReason,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });

        // Notify patient
        const patient = await db.getUserById(consultation.userId);
        if (patient?.email) {
          const { notifyOwner } = await import('./_core/notification');
          await notifyOwner({
            title: `Revision Requested for Consultation #${consultation.id}`,
            content: `Doctor requested revision for ${consultation.patientName}. Reason: ${input.revisionReason}`,
          }).catch(() => {});
        }

        return { success: true };
      }),

    // Override with manual — doctor sets their own URLs for any material
    overrideWithManual: adminProcedure
      .input(z.object({
        consultationId: z.number(),
        manualReportUrl: z.string().url().optional(),
        manualInfographicUrl: z.string().url().optional(),
        manualSlideDeckUrl: z.string().url().optional(),
        doctorNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });

        const updates: Record<string, unknown> = {
          doctorNotes: input.doctorNotes ?? null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        };
        if (input.manualReportUrl) updates.aiReportUrl = input.manualReportUrl;
        if (input.manualInfographicUrl) updates.aiInfographicUrl = input.manualInfographicUrl;
        if (input.manualSlideDeckUrl) updates.aiSlideDeckUrl = input.manualSlideDeckUrl;

        await db.updateConsultation(input.consultationId, updates);
        return { success: true, updatedFields: Object.keys(updates) };
      }),

    // Bulk approve all consultations that are in ai_processing_complete or specialist_review
    generatePDF: adminProcedure
      .input(z.object({ consultationId: z.number() }))
      .mutation(async ({ input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        const pdfUrl = await generateConsultationPDF({
          id: consultation.id,
          patientName: consultation.patientName,
          patientEmail: consultation.patientEmail,
          symptoms: consultation.symptoms,
          medicalHistory: consultation.medicalHistory,
          priority: consultation.priority,
          status: consultation.status,
          createdAt: consultation.createdAt,
          updatedAt: consultation.updatedAt,
          aiReportUrl: consultation.aiReportUrl,
          aiInfographicUrl: consultation.aiInfographicUrl,
          aiSlideDeckUrl: consultation.aiSlideDeckUrl,
          aiConfidence: consultation.aiConfidence,
          aiConfidenceLabel: consultation.aiConfidenceLabel,
          aiRequiresHumanReview: consultation.aiRequiresHumanReview,
          aiDisclaimer: consultation.aiDisclaimer,
          doctorNotes: consultation.doctorNotes,
        });
        return { success: true, pdfUrl };
      }),

    bulkApproveAll: adminProcedure
      .mutation(async ({ ctx }) => {
        // Get all consultations pending review
        const all = await db.getAllConsultations();
        const pending = all.filter((c: any) =>
          c.status === 'ai_processing_complete' || c.status === 'specialist_review'
        );
        let approved = 0;
        for (const c of pending) {
          const updates: Record<string, unknown> = {
            status: 'doctor_reviewed',
            specialistApprovalStatus: 'approved',
            sentPdfToPatient: true,
            sentInfographicToPatient: true,
            sentSlidesToPatient: true,
            doctorReviewedAt: new Date(),
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
          };
          await db.updateConsultation(c.id, updates);
          approved++;
        }
        return { success: true, approvedCount: approved };
      }),
  }),

  // ── Medical History Collection ──────────────────────────────────────────────
  symptomChecker: router({
    chat: publicProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).max(20),
        language: z.enum(["en", "ar"]).default("en"),
        turnCount: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        const { invokeMedGemmaLLM } = await import('./medgemmaLLM');
        const isArabic = input.language === "ar";
        const specialtySchema = '{"specialty":"general|cardiology|neurology|orthopedics|ophthalmology|pediatrics|internal|pharmacy|emergency","specialtyAr":"Arabic name","confidence":"high|medium|low","reason":"reason","icon":"heart|brain|eye|bone|baby|stethoscope|pill|activity|zap"}';
        const lang = isArabic ? 'Arabic' : 'English';
        const systemPrompt = `Ask 2-4 targeted questions about symptoms then recommend the appropriate specialty. When ready, append: [SPECIALTY_RESULT]` + specialtySchema + `[/SPECIALTY_RESULT] Do NOT diagnose, only guide to the right specialty. Respond in ` + lang + `.`;
        const messages: any[] = [
          { role: "system", content: systemPrompt },
          ...input.history.slice(-10),
        ];
        const medGemmaResponse = await invokeMedGemmaLLM(
          messages,
          { language: input.language }
        );
        return { reply: medGemmaResponse.content };
      }),
  }),

  medicalHistory: router({
    /**
     * Start or resume a medical history collection session.
     * Returns the session ID and the first AI question.
     */
    startSession: protectedProcedure
      .input(z.object({
        language: z.enum(['en', 'ar']).default('en'),
        resumeSessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import('./_core/llm');

        // Resume existing session if requested
        if (input.resumeSessionId) {
          const existing = await db.getMedicalHistorySession(input.resumeSessionId);
          if (existing && existing.userId === ctx.user.id && !existing.isComplete) {
            const messages = JSON.parse(existing.patientMessages || '[]') as any[];
            const aiMsgs = JSON.parse(existing.aiQuestions || '[]') as any[];
            return {
              sessionId: existing.id,
              messages: [...aiMsgs, ...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
              isComplete: false,
              turnCount: existing.turnCount,
            };
          }
        }

        // Create new session
        const sessionId = await db.createMedicalHistorySession(ctx.user.id, input.language);

        const isArabic = input.language === 'ar';
        const systemPrompt = isArabic
          ? `أنت مساعد طبي متخصص في جمع التاريخ الطبي للمرضى. مهمتك هي طرح أسئلة واضحة ومحددة لجمع معلومات طبية شاملة. اسأل سؤالاً واحداً في كل مرة. ابدأ بالأعراض الرئيسية، ثم انتقل إلى التاريخ الطبي، الأدوية، الحساسية، والتاريخ العائلي. كن متعاطفاً ومهنياً. عندما تجمع معلومات كافية (عادةً بعد 5-8 أسئلة)، أخبر المريض أن المعلومات كافية وأنه يمكنه المراجعة والتأكيد.`
          : `You are a medical assistant specialized in collecting patient medical history. Your task is to ask clear, specific questions to gather comprehensive medical information. Ask one question at a time. Start with the main symptoms, then move to medical history, medications, allergies, and family history. Be empathetic and professional. When you have gathered sufficient information (usually after 5-8 questions), let the patient know the information is sufficient and they can review and confirm.`;

        const openingMessage = isArabic
          ? 'مرحباً! أنا هنا لمساعدتك في جمع تاريخك الطبي بشكل شامل. سأطرح عليك بعض الأسئلة لفهم حالتك الصحية بشكل أفضل.\n\nما هي الأعراض الرئيسية التي تعاني منها حالياً؟'
          : 'Hello! I\'m here to help you collect your medical history comprehensively. I\'ll ask you a few questions to better understand your health situation.\n\nWhat are the main symptoms you are currently experiencing?';

        // Store the opening AI message
        const aiMsgs = [{ role: 'assistant', content: openingMessage, timestamp: Date.now() }];
        await db.updateMedicalHistorySession(sessionId, {
          aiQuestions: JSON.stringify(aiMsgs),
          detectedLanguage: input.language,
        });

        return {
          sessionId,
          messages: aiMsgs,
          isComplete: false,
          turnCount: 0,
        };
      }),

    /**
     * Send a patient message and receive the next AI follow-up question.
     */
    sendMessage: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        message: z.string().min(1).max(2000),
        language: z.enum(['en', 'ar']).default('en'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeMedGemmaLLM } = await import('./medgemmaLLM');

        const session = await db.getMedicalHistorySession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        if (session.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        if (session.isComplete) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is already complete' });

        const patientMsgs: any[] = JSON.parse(session.patientMessages || '[]');
        const aiMsgs: any[] = JSON.parse(session.aiQuestions || '[]');
        const newTurnCount = session.turnCount + 1;

        // Add patient message
        const patientMsg = { role: 'user', content: input.message, timestamp: Date.now() };
        patientMsgs.push(patientMsg);

        // Detect language from content
        const detectedLang = /[\u0600-\u06FF]/.test(input.message) ? 'ar' : (input.language || 'en');

        const isArabic = detectedLang === 'ar';

        // Build conversation history for LLM
        const conversationHistory = [...aiMsgs, ...patientMsgs]
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        const systemPrompt = isArabic
          ? `اطرح سؤالاً واحداً محدداً في كل مرة لجمع التاريخ الطبي. المعلومات المطلوبة: الأعراض الرئيسية، المدة، التاريخ الطبي السابق، الأدوية الحالية، الحساسية، التاريخ العائلي، الحالة الاجتماعية. بعد ${Math.max(5, newTurnCount)} أسئلة أو عندما تكون المعلومات كافية، أضف في نهاية ردك: [HISTORY_COMPLETE] ثم ملخصاً للمعلومات المجمعة.`
          : `Ask one specific question at a time to collect patient medical history. Required information: main symptoms, duration, previous medical history, current medications, allergies, family history, social history. After ${Math.max(5, newTurnCount)} questions or when information is sufficient, add at the end of your response: [HISTORY_COMPLETE] followed by a summary of collected information.`;

        const medGemmaResponse = await invokeMedGemmaLLM(
          [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
          ],
          { language: detectedLang as 'en' | 'ar' }
        );

        const aiContent: string = medGemmaResponse.content;
        const isComplete = aiContent.includes('[HISTORY_COMPLETE]') || newTurnCount >= 12;

        // Extract summary if complete
        let collectedHistory = session.collectedHistory;
        let displayContent = aiContent;

        if (isComplete) {
          const summaryMatch = aiContent.split('[HISTORY_COMPLETE]');
          displayContent = summaryMatch[0]?.trim() || aiContent;
          if (summaryMatch[1]) {
            collectedHistory = summaryMatch[1].trim();
          } else {
            // Generate a summary
            const allPatientText = patientMsgs.map(m => m.content).join(' | ');
            collectedHistory = allPatientText;
          }
          if (!displayContent) {
            displayContent = isArabic
              ? 'شكراً لك! لقد جمعنا معلومات كافية عن تاريخك الطبي. يمكنك الآن مراجعة المعلومات والتأكيد للمتابعة.'
              : 'Thank you! We have gathered sufficient information about your medical history. You can now review the information and confirm to proceed.';
          }
        }

        const aiMsg = { role: 'assistant', content: displayContent, timestamp: Date.now() + 1 };
        aiMsgs.push(aiMsg);

        await db.updateMedicalHistorySession(input.sessionId, {
          patientMessages: JSON.stringify(patientMsgs),
          aiQuestions: JSON.stringify(aiMsgs),
          detectedLanguage: detectedLang,
          turnCount: newTurnCount,
          isComplete,
          completionReason: isComplete ? (newTurnCount >= 12 ? 'max_turns' : 'sufficient_info') : undefined,
          collectedHistory: collectedHistory ?? undefined,
        });

        // Build full sorted message list for client
        const allMessages = [...aiMsgs, ...patientMsgs]
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

        return {
          sessionId: input.sessionId,
          aiMessage: displayContent,
          messages: allMessages,
          isComplete,
          turnCount: newTurnCount,
          collectedHistory: isComplete ? collectedHistory : undefined,
        };
      }),

    /**
     * Get the current state of a session (for page refresh recovery).
     */
    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getMedicalHistorySession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND' });
        if (session.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const patientMsgs: any[] = JSON.parse(session.patientMessages || '[]');
        const aiMsgs: any[] = JSON.parse(session.aiQuestions || '[]');
        const allMessages = [...aiMsgs, ...patientMsgs]
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

        return {
          sessionId: session.id,
          messages: allMessages,
          isComplete: session.isComplete,
          turnCount: session.turnCount,
          collectedHistory: session.collectedHistory,
          detectedLanguage: session.detectedLanguage,
        };
      }),

    /**
     * Confirm completion and get the collected history summary for use in consultation.
     */
    confirmComplete: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        editedHistory: z.string().optional(), // patient may edit the summary
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getMedicalHistorySession(input.sessionId);
        if (!session) throw new TRPCError({ code: 'NOT_FOUND' });
        if (session.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const finalHistory = input.editedHistory ?? session.collectedHistory ?? '';
        await db.updateMedicalHistorySession(input.sessionId, {
          isComplete: true,
          completionReason: 'user_confirmed',
          collectedHistory: finalHistory,
        });

        return {
          success: true,
          collectedHistory: finalHistory,
          sessionId: input.sessionId,
        };
      }),

    /**
     * Check if the current user has an active (incomplete) session to offer resume.
     */
    getActiveSession: protectedProcedure
      .query(async ({ ctx }) => {
        const session = await db.getActiveMedicalHistorySessionForUser(ctx.user.id);
        if (!session) return null;
        const patientMsgs: any[] = JSON.parse(session.patientMessages || '[]');
        const aiMsgs: any[] = JSON.parse(session.aiQuestions || '[]');
        const allMessages = [...aiMsgs, ...patientMsgs]
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
        return {
          sessionId: session.id,
          turnCount: session.turnCount,
          detectedLanguage: session.detectedLanguage,
          messages: allMessages,
          createdAt: session.createdAt,
        };
      }),

    /**
     * Get the AI-collected history session linked to a consultation (for admin view).
     */
    getSessionByConsultation: protectedProcedure
      .input(z.object({ consultationId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db2 = await (await import('./db')).getDb();
        if (!db2) return null;
        const { medicalHistorySessions } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const rows = await db2.select().from(medicalHistorySessions)
          .where(eq(medicalHistorySessions.consultationId, input.consultationId))
          .orderBy(desc(medicalHistorySessions.createdAt))
          .limit(1);
        if (!rows[0]) return null;
        const session = rows[0];
        const patientMsgs: any[] = JSON.parse(session.patientMessages || '[]');
        const aiMsgs: any[] = JSON.parse(session.aiQuestions || '[]');
        return {
          sessionId: session.id,
          turnCount: session.turnCount,
          detectedLanguage: session.detectedLanguage,
          collectedHistory: session.collectedHistory,
          messageCount: patientMsgs.length + aiMsgs.length,
          createdAt: session.createdAt,
        };
      }),

    // ── Trigger AI processing from collected medical history ──────────────────
    processHistory: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Allow admin OR the consultation owner
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
        if (ctx.user.role !== 'admin' && consultation.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        // Get the latest completed history session for this consultation
        const db2 = await (await import('./db')).getDb();
        if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { medicalHistorySessions } = await import('../drizzle/schema');
        const { eq, desc, and } = await import('drizzle-orm');
        const rows = await db2.select().from(medicalHistorySessions)
          .where(and(
            eq(medicalHistorySessions.consultationId, input.consultationId),
            eq(medicalHistorySessions.isComplete, true),
          ))
          .orderBy(desc(medicalHistorySessions.createdAt))
          .limit(1);

        const session = rows[0];
        const medicalHistory = session?.collectedHistory || consultation.medicalHistory || consultation.symptoms;
        if (!medicalHistory) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No medical history available to process' });

        const lang = (consultation.preferredLanguage as 'en' | 'ar') || 'en';

        // Fire-and-forget: start processing asynchronously
        const { processHistoryWithAI } = await import('./medicalHistoryAIProcessor');
        processHistoryWithAI(
          input.consultationId,
          medicalHistory,
          consultation.patientName,
          consultation.symptoms,
          lang,
        ).catch(err => console.error('[processHistory] background error:', err));

        // Immediately mark as processing
        await db.updateConsultation(input.consultationId, {
          status: 'ai_processing',
        });

        return { started: true, message: 'AI processing started' };
      }),

    // ── Get AI outputs for a consultation ─────────────────────────────────────
    getAIOutputs: protectedProcedure
      .input(z.object({ consultationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const consultation = await db.getConsultationById(input.consultationId);
        if (!consultation) throw new TRPCError({ code: 'NOT_FOUND' });
        if (ctx.user.role !== 'admin' && consultation.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return {
          consultationId: consultation.id,
          status: consultation.status,
          specialistApprovalStatus: consultation.specialistApprovalStatus,
          aiAnalysis: consultation.aiAnalysis,
          aiReportUrl: consultation.aiReportUrl,
          aiInfographicUrl: consultation.aiInfographicUrl,
          aiSlideDeckUrl: consultation.aiSlideDeckUrl,
          aiMindMapUrl: consultation.aiMindMapUrl,
          aiLastProcessedAt: consultation.aiLastProcessedAt,
          aiProcessingAttempts: consultation.aiProcessingAttempts,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;;

