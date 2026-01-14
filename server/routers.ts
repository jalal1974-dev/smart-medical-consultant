import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

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

  consultation: router({
    // Create a new consultation
    create: protectedProcedure
      .input(z.object({
        patientName: z.string().min(1),
        patientEmail: z.string().email(),
        patientPhone: z.string().optional(),
        description: z.string().min(10),
        language: z.enum(["en", "ar"]),
        scheduledAt: z.string().optional(),
        isFree: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        // Check if trying to book free consultation but already used
        if (input.isFree && user.hasUsedFreeConsultation) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Free consultation already used' 
          });
        }

        const consultation = await db.createConsultation({
          userId: ctx.user.id,
          patientName: input.patientName,
          patientEmail: input.patientEmail,
          patientPhone: input.patientPhone || null,
          description: input.description,
          language: input.language,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          isFree: input.isFree,
          amount: input.isFree ? "0.00" : "50.00", // Default consultation fee
          paymentStatus: input.isFree ? "completed" : "pending",
        });

        // Mark free consultation as used
        if (input.isFree) {
          await db.markFreeConsultationUsed(ctx.user.id);
        }

        return { success: true, consultationId: Number(consultation[0]?.insertId || 0) };
      }),

    // Get user's consultations
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getConsultationsByUserId(ctx.user.id);
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

        return consultation;
      }),

    // Update payment status (called after PayPal payment)
    updatePayment: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        transactionId: z.string(),
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
          input.transactionId
        );

        return { success: true };
      }),
  }),

  media: router({
    // Get published videos
    videos: publicProcedure.query(async () => {
      return await db.getPublishedMedia("video");
    }),

    // Get published podcasts
    podcasts: publicProcedure.query(async () => {
      return await db.getPublishedMedia("podcast");
    }),

    // Get single media item
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const media = await db.getMediaById(input.id);
        if (!media || !media.isPublished) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return media;
      }),

    // Increment view count
    incrementViews: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementMediaViews(input.id);
        return { success: true };
      }),
  }),

  admin: router({
    // Get all consultations
    consultations: adminProcedure.query(async () => {
      return await db.getAllConsultations();
    }),

    // Update consultation status
    updateConsultationStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateConsultationStatus(input.id, input.status, input.adminNotes);
        return { success: true };
      }),

    // Get all users
    users: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    // Get all media (including unpublished)
    allMedia: adminProcedure.query(async () => {
      return await db.getAllMedia();
    }),

    // Create media content
    createMedia: adminProcedure
      .input(z.object({
        type: z.enum(["video", "podcast"]),
        titleEn: z.string().min(1),
        titleAr: z.string().min(1),
        descriptionEn: z.string().optional(),
        descriptionAr: z.string().optional(),
        mediaUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        duration: z.number().optional(),
        language: z.enum(["en", "ar", "both"]),
        isPublished: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createMediaContent({
          type: input.type,
          titleEn: input.titleEn,
          titleAr: input.titleAr,
          descriptionEn: input.descriptionEn || null,
          descriptionAr: input.descriptionAr || null,
          mediaUrl: input.mediaUrl,
          thumbnailUrl: input.thumbnailUrl || null,
          duration: input.duration || null,
          language: input.language,
          isPublished: input.isPublished,
        });
        return { success: true, mediaId: Number(result[0]?.insertId || 0) };
      }),

    // Update media content
    updateMedia: adminProcedure
      .input(z.object({
        id: z.number(),
        titleEn: z.string().optional(),
        titleAr: z.string().optional(),
        descriptionEn: z.string().optional(),
        descriptionAr: z.string().optional(),
        mediaUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        duration: z.number().optional(),
        language: z.enum(["en", "ar", "both"]).optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateMediaContent(id, updates);
        return { success: true };
      }),

    // Delete media content
    deleteMedia: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMediaContent(input.id);
        return { success: true };
      }),

    // Get dashboard stats
    stats: adminProcedure.query(async () => {
      const users = await db.getAllUsers();
      const consultationStats = await db.getConsultationStats();
      
      return {
        totalUsers: users.length,
        totalConsultations: consultationStats.total,
        pendingConsultations: consultationStats.pending,
        confirmedConsultations: consultationStats.confirmed,
        completedConsultations: consultationStats.completed,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
