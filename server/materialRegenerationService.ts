import * as db from './db';
import { generateInfographicContent, generateSlideDeckContent } from './slideContentGenerator';
import { generateAllContent } from './contentGeneration';
import { MedicalAnalysisResult } from './aiMedicalAnalysis';

/**
 * Regenerates consultation materials after deep research is completed
 * This function is triggered automatically when admin completes deep research on a topic
 */
export async function regenerateMaterialsAfterResearch(consultationId: number) {
  try {
    console.log(`[Material Regeneration] Starting regeneration for consultation ${consultationId}`);

    // Get consultation details
    const consultation = await db.getConsultationById(consultationId);
    if (!consultation) {
      console.error(`[Material Regeneration] Consultation ${consultationId} not found`);
      return;
    }

    // Get all researched topics for this consultation
    const researchedTopics = await db.getAllResearchedTopics(consultationId);
    if (researchedTopics.length === 0) {
      console.log(`[Material Regeneration] No researched topics found for consultation ${consultationId}`);
      return;
    }

    // Compile all research findings
    const researchFindings = researchedTopics
      .map(topic => `## ${topic.label}\n\n${topic.researchContent || 'No content'}`)
      .join('\n\n');

    console.log(`[Material Regeneration] Compiled research from ${researchedTopics.length} topics`);

        // Regenerate slide content (infographic and slide deck) with research findings
    const updatedAnalysis = `${consultation.aiAnalysis || ''}

## Deep Research Findings

${researchFindings}`;
    
    const consultationData = {
      patientName: consultation.patientName,
      symptoms: consultation.symptoms,
      medicalHistory: consultation.medicalHistory || '',
      preferredLanguage: consultation.preferredLanguage,
    };

    const infographicContent = generateInfographicContent(consultationData, updatedAnalysis);
    const slideDeckContent = generateSlideDeckContent(consultationData, updatedAnalysis);

    console.log(`[Material Regeneration] Generated updated slide content`);

    // Note: Report URL regeneration would require full AI analysis
    // For now, we only regenerate slide content which can be done synchronously

    console.log(`[Material Regeneration] Generated updated slide content`);

    // Update consultation with regenerated materials
    await db.regenerateConsultationMaterials(consultationId, {
      aiInfographicContent: JSON.stringify(infographicContent),
      aiSlideDeckContent: JSON.stringify(slideDeckContent),
    });

    // Reset specialist approval status to require re-review
    await db.updateConsultation(consultationId, {
      specialistApprovalStatus: 'pending_review',
      specialistNotes: `Materials regenerated after deep research on ${researchedTopics.length} topic(s). Please review updated content.`,
    });

    console.log(`[Material Regeneration] Successfully regenerated materials for consultation ${consultationId}`);
    console.log(`[Material Regeneration] Specialist approval status reset to pending_review`);

  } catch (error) {
    console.error(`[Material Regeneration] Error regenerating materials for consultation ${consultationId}:`, error);
    throw error;
  }
}
