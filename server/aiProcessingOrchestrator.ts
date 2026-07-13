/**
 * AI Processing Orchestrator
 * Handles the complete AI analysis and content generation workflow
 *
 * Retry contract:
 * - Max 3 attempts per consultation (enforced by MAX_AI_ATTEMPTS)
 * - On failure: status reverts to 'submitted' so admin can retry manually
 * - On max-attempts exceeded: status set to 'ai_failed' (permanent, requires admin intervention)
 * - Run-once guard: AI_SKIP_STATUSES prevents re-triggering on downstream statuses
 * - Content generation failures are non-fatal: analysis is saved even if infographic/slides fail
 */

import * as db from "./db";
import { analyzeMedicalConsultation, ConsultationData } from "./aiMedicalAnalysis";
import { generateAllContent } from "./contentGeneration";

// Statuses from which AI processing must NOT be re-triggered (already downstream)
const AI_SKIP_STATUSES = [
  'ai_processing', 'ai_processing_complete', 'specialist_review',
  'doctor_reviewed', 'completed', 'ai_failed',
];

// Maximum number of AI processing attempts before marking as permanently failed
const MAX_AI_ATTEMPTS = 3;

/**
 * Process a consultation with AI analysis and content generation.
 * Idempotent: skips if the consultation is already in a downstream status.
 */
export async function processConsultationWithAI(consultationId: number): Promise<void> {
  try {
    console.log(`[AI Orchestrator] Starting for consultation #${consultationId}...`);

    // Get consultation data
    const consultation = await db.getConsultationById(consultationId);
    if (!consultation) {
      console.error(`[AI Orchestrator] Consultation #${consultationId} not found`);
      return;
    }

    // Run-once guard — skip if already in a downstream status
    if (AI_SKIP_STATUSES.includes(consultation.status)) {
      console.log(`[AI Orchestrator] Skipping #${consultationId} — already in status '${consultation.status}'`);
      return;
    }

    // Max-attempts guard — prevent infinite retry loops
    const attempts = consultation.aiProcessingAttempts || 0;
    if (attempts >= MAX_AI_ATTEMPTS) {
      console.error(`[AI Orchestrator] #${consultationId} exceeded max attempts (${MAX_AI_ATTEMPTS}). Marking as ai_failed.`);
      await db.updateConsultation(consultationId, {
        status: 'ai_failed' as any,
        aiLastProcessedAt: new Date(),
      });
      return;
    }

    // Update status to ai_processing
    await db.updateConsultationStatus(consultationId, "ai_processing");

    // Prepare consultation data for AI analysis
    const consultationData: ConsultationData = {
      consultationId,
      patientName: consultation.patientName,
      patientEmail: consultation.patientEmail,
      symptoms: consultation.symptoms,
      medicalHistory: consultation.medicalHistory,
      medicalReports: consultation.medicalReports ? JSON.parse(consultation.medicalReports) : null,
      labResults: consultation.labResults ? JSON.parse(consultation.labResults) : null,
      xrayImages: consultation.xrayImages ? JSON.parse(consultation.xrayImages) : null,
      preferredLanguage: consultation.preferredLanguage,
      isDeepAnalysis: (consultation.aiProcessingAttempts || 0) > 0, // Deep analysis on retry
      specialistFeedback: consultation.specialistRejectionReason || null,
    };

    // Run AI analysis
    console.log(`Running AI medical analysis for consultation #${consultationId}...`);
    const analysisResult = await analyzeMedicalConsultation(consultationData);

    if (!analysisResult.success) {
      console.error(`AI analysis failed for consultation #${consultationId}:`, analysisResult.error);
      await db.updateConsultationStatus(consultationId, "submitted"); // Revert status
      return;
    }

    // Generate all content (infographic, slides, mind map) — non-fatal
    // PDF is NOT generated here; it is admin-triggered via admin.generatePptxReport
    console.log(`[AI Orchestrator] Generating content for consultation #${consultationId}...`);
    let generatedContent: { reportPdfUrl?: string; infographicUrl?: string; slideDeckUrl?: string; mindMapUrl?: string } = {};
    try {
      generatedContent = await generateAllContent(
        analysisResult,
        consultation.patientName,
        consultationId,
        consultation.symptoms,
        consultation.preferredLanguage
      );
    } catch (contentErr) {
      // Content generation failure is non-fatal — analysis is still saved
      console.error(`[AI Orchestrator] Content generation failed for #${consultationId} (non-fatal):`, contentErr);
    }

    // Update consultation with AI results
    await db.updateConsultation(consultationId, {
      aiAnalysis: analysisResult.analysis,
      aiReportUrl: generatedContent.reportPdfUrl || null,
      aiInfographicUrl: generatedContent.infographicUrl || null,
      aiSlideDeckUrl: generatedContent.slideDeckUrl || null,
      aiMindMapUrl: generatedContent.mindMapUrl || null,
      aiProcessingAttempts: attempts + 1,
      aiLastProcessedAt: new Date(),
      status: "specialist_review",
      specialistApprovalStatus: "pending_review",
    });

    console.log(`[AI Orchestrator] Processing complete for #${consultationId} (attempt ${attempts + 1}/${MAX_AI_ATTEMPTS})`);

  } catch (error) {
    console.error(`[AI Orchestrator] Fatal error for #${consultationId}:`, error);
    // Revert to submitted so admin can retry manually (unless max attempts reached)
    const currentAttempts = (await db.getConsultationById(consultationId))?.aiProcessingAttempts || 0;
    if (currentAttempts >= MAX_AI_ATTEMPTS) {
      await db.updateConsultation(consultationId, { status: 'ai_failed' as any });
    } else {
      await db.updateConsultationStatus(consultationId, "submitted");
    }
  }
}

/**
 * Trigger AI reprocessing after specialist rejection
 */
export async function reprocessConsultationAfterRejection(
  consultationId: number,
  rejectionReason: string
): Promise<void> {
  try {
    console.log(`Reprocessing consultation #${consultationId} after specialist rejection...`);

    // Update rejection reason
    await db.updateConsultation(consultationId, {
      specialistRejectionReason: rejectionReason,
      specialistApprovalStatus: "needs_deep_analysis",
      status: "ai_processing",
    });

    // Trigger AI processing again (will use deep analysis mode)
    await processConsultationWithAI(consultationId);

  } catch (error) {
    console.error(`Error reprocessing consultation #${consultationId}:`, error);
  }
}
