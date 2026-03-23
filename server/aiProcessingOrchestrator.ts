/**
 * AI Processing Orchestrator
 * Handles the complete AI analysis and content generation workflow
 */

import * as db from "./db";
import { analyzeMedicalConsultation, ConsultationData } from "./aiMedicalAnalysis";
import { generateAllContent } from "./contentGeneration";

/**
 * Process a consultation with AI analysis and content generation
 * This is the main orchestrator function that ties everything together
 */
export async function processConsultationWithAI(consultationId: number): Promise<void> {
  try {
    console.log(`Starting AI processing for consultation #${consultationId}...`);

    // Get consultation data
    const consultation = await db.getConsultationById(consultationId);
    if (!consultation) {
      console.error(`Consultation #${consultationId} not found`);
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
