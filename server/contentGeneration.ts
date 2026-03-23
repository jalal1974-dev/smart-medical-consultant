/**
 * Content Generation Pipeline
 * Generates infographics, audio, video, slides, and mind maps from medical analysis
 */

import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { MedicalAnalysisResult, generateSlideDeckContent, generateMindMapData } from "./aiMedicalAnalysis";
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
 * Generate PDF report from medical analysis
 */
async function generatePDFReport(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  consultationId: number,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 40px; }
    .section { margin: 20px 0; }
    .urgency { padding: 10px; border-radius: 5px; font-weight: bold; }
    .urgency-low { background: #d4edda; color: #155724; }
    .urgency-medium { background: #fff3cd; color: #856404; }
    .urgency-high { background: #f8d7da; color: #721c24; }
    .urgency-critical { background: #f5c6cb; color: #721c24; }
    ul { margin: 10px 0; }
    li { margin: 5px 0; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${language === 'ar' ? 'تقرير التحليل الطبي' : 'Medical Analysis Report'}</h1>
    <p><strong>${language === 'ar' ? 'المريض' : 'Patient'}:</strong> ${patientName}</p>
    <p><strong>${language === 'ar' ? 'رقم الاستشارة' : 'Consultation ID'}:</strong> #${consultationId}</p>
    <p><strong>${language === 'ar' ? 'التاريخ' : 'Date'}:</strong> ${new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
  </div>

  <div class="section">
    <div class="urgency urgency-${analysisResult.urgencyLevel}">
      ${language === 'ar' ? 'مستوى الأولوية' : 'Urgency Level'}: ${analysisResult.urgencyLevel?.toUpperCase()}
    </div>
  </div>

  <div class="section">
    <h2>${language === 'ar' ? 'ملخص تنفيذي' : 'Executive Summary'}</h2>
    <p>${analysisResult.summary}</p>
  </div>

  <div class="section">
    <h2>${language === 'ar' ? 'النتائج الرئيسية' : 'Key Findings'}</h2>
    <ul>
      ${analysisResult.keyFindings?.map(finding => `<li>${finding}</li>`).join('') || ''}
    </ul>
  </div>

  <div class="section">
    <h2>${language === 'ar' ? 'التوصيات' : 'Recommendations'}</h2>
    <ul>
      ${analysisResult.recommendations?.map(rec => `<li>${rec}</li>`).join('') || ''}
    </ul>
  </div>

  <div class="section">
    <h2>${language === 'ar' ? 'التحليل التفصيلي' : 'Detailed Analysis'}</h2>
    <p>${analysisResult.analysis?.replace(/\n/g, '<br>')}</p>
  </div>

  <div class="footer">
    <p><strong>${language === 'ar' ? 'تنويه' : 'Disclaimer'}:</strong> ${language === 'ar' ? 'هذا التحليل تم إنشاؤه بمساعدة الذكاء الاصطناعي ويتطلب مراجعة من قبل طبيب متخصص. لا يجب اعتباره تشخيصاً نهائياً أو بديلاً عن الاستشارة الطبية المباشرة.' : 'This analysis was generated with AI assistance and requires review by a medical specialist. It should not be considered a final diagnosis or substitute for direct medical consultation.'}</p>
  </div>
</body>
</html>
    `;

    // Save HTML to file temporarily
    const htmlFileName = `consultation-${consultationId}-${nanoid()}.html`;
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
    const { url: htmlUrl } = await storagePut(
      `reports/${htmlFileName}`,
      htmlBuffer,
      "text/html"
    );

    // Note: In production, you would convert HTML to PDF using a service like Puppeteer or WeasyPrint
    // For now, we'll return the HTML URL as the "PDF" URL
    // TODO: Implement actual PDF conversion
    return htmlUrl;

  } catch (error) {
    console.error("Error generating PDF report:", error);
    return null;
  }
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

    const result = await generateImage({ prompt });
    
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
    const slideContent = await generateSlideDeckContent(analysisResult, patientName, language);
    
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
