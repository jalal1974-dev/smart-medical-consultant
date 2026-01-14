import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { sendConsultationReceipt, sendConsultationStatusUpdate } from "./emailNotifications";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

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
  }),

  // File upload route
  upload: router({
    file: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64 encoded file data
        category: z.enum(['medical_report', 'lab_result', 'xray', 'other']),
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
          ];

          if (!allowedTypes.includes(input.fileType)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid file type. Only PDF, images, and Word documents are allowed.',
            });
          }

          // Convert base64 to buffer
          const fileBuffer = Buffer.from(input.fileData, 'base64');

          // Validate file size (max 10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (fileBuffer.length > maxSize) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'File size exceeds 10MB limit.',
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
        patientName: z.string().min(1),
        patientEmail: z.string().email(),
        patientPhone: z.string().optional(),
        symptoms: z.string().min(10),
        medicalHistory: z.string().optional(),
        medicalReports: z.array(z.string()).optional(), // Array of file URLs
        labResults: z.array(z.string()).optional(),
        xrayImages: z.array(z.string()).optional(),
        otherDocuments: z.array(z.string()).optional(),
        preferredLanguage: z.enum(["en", "ar"]),
        isFree: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        // Check if trying to use free consultation but already used
        if (input.isFree && user.hasUsedFreeConsultation) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Free consultation already used' 
          });
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
          status: 'submitted',
          isFree: input.isFree,
          amount: input.isFree ? 0 : 5, // Consultation fee $5
          paymentStatus: input.isFree ? "completed" : "pending",
        });

        // Mark free consultation as used
        if (input.isFree) {
          await db.markFreeConsultationUsed(ctx.user.id);
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
  }),
});

export type AppRouter = typeof appRouter;
