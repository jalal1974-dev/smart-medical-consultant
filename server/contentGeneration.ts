/**
 * Content Generation Pipeline
 * Generates infographics, audio, video, slides, and mind maps from medical analysis
 */

import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { MedicalAnalysisResult, generateSlideDeckContent, generateMindMapData } from "./aiMedicalAnalysis";
// NOTE: nanoid is still used by generateInfographic (re-upload to S3)
import { generateImage } from "./_core/imageGeneration";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";

export interface GeneratedContent {
  reportPdfUrl?: string;
  infographicUrl?: string;
  slideDeckUrl?: string;
  mindMapUrl?: string;
}

/**
 * REAL_PDF: Auto-processing path does NOT generate a PDF.
 * The real PDF is generated on-demand by the admin via:
 *   server/consultationPDFGenerator.ts → generateConsultationPDF()
 *   routers.ts → admin.generatePptxReport (PPTX) or admin.generateConsultationPDF (PDFKit)
 *
 * This stub returns null so the orchestrator stores no reportPdfUrl for auto-processed
 * consultations. The admin triggers PDF generation explicitly after specialist review.
 */
async function generatePDFReport(
  _analysisResult: MedicalAnalysisResult,
  _patientName: string,
  consultationId: number,
  _language: "en" | "ar"
): Promise<string | null> {
  // Intentionally returns null — real PDF is admin-triggered via consultationPDFGenerator
  console.log(`[ContentGen] PDF generation skipped for #${consultationId} — use admin.generatePptxReport or admin.generateConsultationPDF`);
  return null;
}

/**
 * Timeout wrapper — rejects after `ms` milliseconds
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }).catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/**
 * Generate infographic image from medical analysis
 */
async function generateInfographic(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  language: "en" | "ar",
  customPrompt?: string
): Promise<string | null> {
  try {
    let prompt: string;
    
    if (language === 'ar') {
      // Arabic-only prompt
      prompt = `أنشئ إنفوجرافيك طبي احترافي ونظيف يحتوي على:
- المريض: ${patientName}
- مستوى الأولوية: ${analysisResult.urgencyLevel}
- النتائج الرئيسية: ${analysisResult.keyFindings?.slice(0, 3).join("، ")}
- التوصيات الرئيسية: ${analysisResult.recommendations?.slice(0, 3).join("، ")}

الأسلوب: إنفوجرافيك طبي حديث مع أيقونات، أقسام واضحة، نظام ألوان احترافي (أزرق وأخضر)، تصميم سهل القراءة.
اللغة: جميع النصوص يجب أن تكون بالعربية فقط، بدون أي كلمات إنجليزية.${
        customPrompt ? `\n\nتعليمات إضافية من المسؤول: ${customPrompt}` : ''
      }`;
    } else {
      // English-only prompt  
      prompt = `Create a clean, professional medical infographic showing:
- Patient: ${patientName}
- Urgency: ${analysisResult.urgencyLevel}
- Key Findings: ${analysisResult.keyFindings?.slice(0, 3).join(", ")}
- Top Recommendations: ${analysisResult.recommendations?.slice(0, 3).join(", ")}

Style: Modern medical infographic with icons, clear sections, professional color scheme (blues and greens), easy to read layout.
Language: All text must be in English only, no Arabic words.${
        customPrompt ? `\n\nAdditional instructions from admin: ${customPrompt}` : ''
      }`;
    }

    const result = await withTimeout(generateImage({ prompt }), 90_000, 'generateImage');
    
    if (!result.url) {
      return null;
    }

    // Download the generated image and re-upload to our S3
    const response = await fetch(result.url);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    const fileName = `infographic-${nanoid()}.png`;
    const { url } = await storagePut(
      `infographics/${fileName}`,
      imageBuffer,
      "image/png"
    );

    return url;

  } catch (error) {
    console.error("Error generating infographic:", error);
    return null;
  }
}

/**
 * Regenerate infographic for a consultation (exported for manual regeneration)
 */
export async function regenerateInfographicForConsultation(
  consultationId: number,
  aiAnalysis: string,
  patientName: string,
  language: "en" | "ar",
  customPrompt?: string
): Promise<string | null> {
  try {
    console.log(`[Infographic Regeneration] Starting for consultation #${consultationId}`);
    
    // Parse AI analysis to extract key information
    const analysisResult: MedicalAnalysisResult = JSON.parse(aiAnalysis);
    
    // Generate new infographic
    const infographicUrl = await generateInfographic(
      analysisResult,
      patientName,
      language,
      customPrompt
    );
    
    if (!infographicUrl) {
      console.error(`[Infographic Regeneration] Failed for consultation #${consultationId}`);
      return null;
    }
    
    console.log(`[Infographic Regeneration] Success for consultation #${consultationId}`);
    return infographicUrl;
  } catch (error) {
    console.error(`[Infographic Regeneration] Error for consultation #${consultationId}:`, error);
    return null;
  }
}

/**
 * Generate audio summary using text-to-speech
 */
async function generateAudioSummary(
  analysisResult: MedicalAnalysisResult,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    // Create script for audio
    const script = `${language === 'ar' ? 'ملخص التحليل الطبي' : 'Medical Analysis Summary'}.
    
${analysisResult.summary}

${language === 'ar' ? 'النتائج الرئيسية' : 'Key Findings'}:
${analysisResult.keyFindings?.join(". ") || ''}

${language === 'ar' ? 'التوصيات' : 'Recommendations'}:
${analysisResult.recommendations?.join(". ") || ''}`;

    // Note: The built-in transcribeAudio is for speech-to-text, not text-to-speech
    // For TTS, we would need a different service like Google Cloud TTS or ElevenLabs
    // For now, we'll create a placeholder
    // TODO: Implement actual TTS service
    
    const audioFileName = `audio-summary-${nanoid()}.txt`;
    const audioBuffer = Buffer.from(script, 'utf-8');
    const { url } = await storagePut(
      `audio/${audioFileName}`,
      audioBuffer,
      "text/plain"
    );

    return url;

  } catch (error) {
    console.error("Error generating audio summary:", error);
    return null;
  }
}

/**
 * Generate video summary (placeholder - would need video generation service)
 */
async function generateVideoSummary(
  analysisResult: MedicalAnalysisResult,
  infographicUrl: string | null,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    // Note: Video generation requires specialized services
    // This is a placeholder that would integrate with services like:
    // - Synthesia for AI avatars
    // - D-ID for talking head videos
    // - Custom video rendering with FFmpeg
    
    // For now, return null to indicate video generation is not yet implemented
    // TODO: Implement video generation service
    return null;

  } catch (error) {
    console.error("Error generating video summary:", error);
    return null;
  }
}

/**
 * Generate slide deck as HTML/JSON
 */
async function generateSlides(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    const slideContent = await withTimeout(
      generateSlideDeckContent(analysisResult, patientName, language),
      60_000,
      'generateSlideDeckContent'
    );
    
    if (!slideContent.success || !slideContent.slides) {
      return null;
    }

    // Save slides as JSON
    const slidesData = {
      title: language === 'ar' ? 'تقرير التحليل الطبي' : 'Medical Analysis Report',
      patient: patientName,
      slides: slideContent.slides
    };

    const fileName = `slides-${nanoid()}.json`;
    const slidesBuffer = Buffer.from(JSON.stringify(slidesData, null, 2), 'utf-8');
    const { url } = await storagePut(
      `slides/${fileName}`,
      slidesBuffer,
      "application/json"
    );

    return url;

  } catch (error) {
    console.error("Error generating slides:", error);
    return null;
  }
}

/**
 * Generate mind map as JSON
 */
async function generateMindMap(
  analysisResult: MedicalAnalysisResult,
  symptoms: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    const mindMapContent = await generateMindMapData(analysisResult, symptoms, language);
    
    if (!mindMapContent.success || !mindMapContent.mindMap) {
      return null;
    }

    const fileName = `mindmap-${nanoid()}.json`;
    const mindMapBuffer = Buffer.from(JSON.stringify(mindMapContent.mindMap, null, 2), 'utf-8');
    const { url } = await storagePut(
      `mindmaps/${fileName}`,
      mindMapBuffer,
      "application/json"
    );

    return url;

  } catch (error) {
    console.error("Error generating mind map:", error);
    return null;
  }
}

/**
 * Regenerate PDF report for a consultation (exported for manual regeneration)
 */
export async function regeneratePdfForConsultation(
  consultationId: number,
  aiAnalysis: string,
  patientName: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    console.log(`[PDF Regeneration] Starting for consultation #${consultationId}`);
    const analysisResult: MedicalAnalysisResult = JSON.parse(aiAnalysis);
    const pdfUrl = await generatePDFReport(analysisResult, patientName, consultationId, language);
    console.log(`[PDF Regeneration] ${pdfUrl ? 'Success' : 'Failed'} for consultation #${consultationId}`);
    return pdfUrl;
  } catch (error) {
    console.error(`[PDF Regeneration] Error for consultation #${consultationId}:`, error);
    return null;
  }
}

/**
 * Regenerate slide deck for a consultation (exported for manual regeneration)
 */
export async function regenerateSlidesForConsultation(
  consultationId: number,
  aiAnalysis: string,
  patientName: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    console.log(`[Slides Regeneration] Starting for consultation #${consultationId}`);
    const analysisResult: MedicalAnalysisResult = JSON.parse(aiAnalysis);
    const slidesUrl = await generateSlides(analysisResult, patientName, language);
    console.log(`[Slides Regeneration] ${slidesUrl ? 'Success' : 'Failed'} for consultation #${consultationId}`);
    return slidesUrl;
  } catch (error) {
    console.error(`[Slides Regeneration] Error for consultation #${consultationId}:`, error);
    return null;
  }
}

/**
 * Regenerate mind map for a consultation (exported for manual regeneration)
 */
export async function regenerateMindMapForConsultation(
  consultationId: number,
  aiAnalysis: string,
  symptoms: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    console.log(`[MindMap Regeneration] Starting for consultation #${consultationId}`);
    const analysisResult: MedicalAnalysisResult = JSON.parse(aiAnalysis);
    const mindMapUrl = await generateMindMap(analysisResult, symptoms, language);
    console.log(`[MindMap Regeneration] ${mindMapUrl ? 'Success' : 'Failed'} for consultation #${consultationId}`);
    return mindMapUrl;
  } catch (error) {
    console.error(`[MindMap Regeneration] Error for consultation #${consultationId}:`, error);
    return null;
  }
}

/**
 * Main function to generate all content types
 */
export async function generateAllContent(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  consultationId: number,
  symptoms: string,
  language: "en" | "ar"
): Promise<GeneratedContent> {
  console.log(`Starting content generation for consultation #${consultationId}...`);

  // Generate all content in parallel for efficiency
  const [
    reportPdfUrl,
    infographicUrl,
    slideDeckUrl,
    mindMapUrl
  ] = await Promise.all([
    generatePDFReport(analysisResult, patientName, consultationId, language),
    generateInfographic(analysisResult, patientName, language),
    generateSlides(analysisResult, patientName, language),
    generateMindMap(analysisResult, symptoms, language)
  ]);

  console.log(`Content generation completed for consultation #${consultationId}`);

  return {
    reportPdfUrl: reportPdfUrl || undefined,
    infographicUrl: infographicUrl || undefined,
    slideDeckUrl: slideDeckUrl || undefined,
    mindMapUrl: mindMapUrl || undefined
  };
}
