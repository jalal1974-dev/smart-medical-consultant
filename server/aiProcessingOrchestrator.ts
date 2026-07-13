/**
 * AI Processing Orchestrator
 * Handles the complete AI analysis and content generation workflow
 */

import * as db from "./db";
import { analyzeMedicalConsultation, ConsultationData } from "./aiMedicalAnalysis";
import { generateAllContent } from "./contentGeneration";

// Statuses from which AI processing must NOT be re-triggered (already downstream)
const AI_SKIP_STATUSES = [
  'ai_processing', 'ai_processing_complete', 'specialist_review',
  'doctor_reviewed', 'completed',
];

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

    // Generate all content (PDF, infographic, slides, mind map)
    console.log(`Generating content for consultation #${consultationId}...`);
    const generatedContent = await generateAllContent(
      analysisResult,
      consultation.patientName,
      consultationId,
      consultation.symptoms,
      consultation.preferredLanguage
    );

    // Update consultation with AI results
    await db.updateConsultation(consultationId, {
      aiAnalysis: analysisResult.analysis,
      aiReportUrl: generatedContent.reportPdfUrl || null,
      aiInfographicUrl: generatedContent.infographicUrl || null,
      aiSlideDeckUrl: generatedContent.slideDeckUrl || null,
      aiMindMapUrl: generatedContent.mindMapUrl || null,
      aiProcessingAttempts: (consultation.aiProcessingAttempts || 0) + 1,
      aiLastProcessedAt: new Date(),
      status: "specialist_review",
      specialistApprovalStatus: "pending_review",
    });

    console.log(`AI processing completed successfully for consultation #${consultationId}`);

  } catch (error) {
    console.error(`Error in AI processing for consultation #${consultationId}:`, error);
    // Update status back to submitted so it can be retried
    await db.updateConsultationStatus(consultationId, "submitted");
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
