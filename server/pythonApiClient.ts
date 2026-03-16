/**
 * Python API Client
 * Calls the deployed Python FastAPI backend for AI-powered content generation.
 * Endpoints:
 *   POST /generate/infographic  → SVG infographic (base64)
 *   POST /generate/slides       → PPTX slide deck (base64)
 *   GET  /health                → Health check
 *
 * Key design: We use invokeLLM to parse the raw AI analysis text into the
 * structured PatientData schema that the Python API requires:
 *   { name, symptoms[], diagnosis, recommendations[], tests[], urgency }
 * This ensures the Python backend receives clean, structured data and can
 * generate genuinely visual content (charts, icons, colour-coded sections).
 */

import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ─── Python API Schema ────────────────────────────────────────────────────────

/** Matches the PatientData Pydantic model in the Python API */
interface PatientData {
  name: string;
  symptoms: string[];
  diagnosis: string;
  recommendations: string[];
  tests: string[];
  urgency: "low" | "medium" | "high";
  medical_history?: string | null;
}

interface PythonApiResponse {
  success: boolean;
  data?: string; // base64-encoded file
  file_type?: string;
  size_bytes?: number;
  error?: string;
}

// ─── Structured Data Extraction ───────────────────────────────────────────────

/**
 * Use Claude/Gemini to parse the raw AI analysis text into the structured
 * PatientData object that the Python API requires.
 * Falls back to a minimal object if parsing fails.
 */
async function parseAnalysisToPatientData(consultation: {
  patientName: string;
  symptoms: string;
  medicalHistory?: string | null;
  aiAnalysis?: string | null;
  preferredLanguage: string;
}): Promise<PatientData> {
  const lang = consultation.preferredLanguage === "ar" ? "Arabic" : "English";
  const rawAnalysis = consultation.aiAnalysis || "";
  const rawSymptoms = consultation.symptoms || "";

  // If no AI analysis yet, build a minimal object from symptoms
  if (!rawAnalysis.trim()) {
    return {
      name: consultation.patientName,
      symptoms: rawSymptoms
        .split(/[,،\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      diagnosis: lang === "Arabic" ? "قيد التقييم" : "Pending evaluation",
      recommendations: [lang === "Arabic" ? "مراجعة طبيب متخصص" : "Consult a specialist"],
      tests: [],
      urgency: "medium",
      medical_history: consultation.medicalHistory || null,
    };
  }

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a medical data extraction assistant. Extract structured information from the medical analysis text. 
Return ONLY valid JSON matching the schema. All text values must be in ${lang}.
Keep each item concise (max 15 words per item). Extract up to 8 symptoms, 6 recommendations, 6 tests.
For urgency: use "high" if emergency/urgent, "medium" if needs attention soon, "low" if routine follow-up.`,
        },
        {
          role: "user",
          content: `Patient name: ${consultation.patientName}
Reported symptoms: ${rawSymptoms}
${consultation.medicalHistory ? `Medical history: ${consultation.medicalHistory}` : ""}

AI Medical Analysis:
${rawAnalysis}

Extract the structured data from this analysis.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "patient_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              symptoms: {
                type: "array",
                items: { type: "string" },
                description: "List of patient symptoms (concise, in target language)",
              },
              diagnosis: {
                type: "string",
                description: "Primary diagnosis or assessment (1-2 sentences)",
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Treatment/lifestyle recommendations (concise action items)",
              },
              tests: {
                type: "array",
                items: { type: "string" },
                description: "Recommended medical tests or investigations",
              },
              urgency: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Urgency level of the condition",
              },
            },
            required: ["symptoms", "diagnosis", "recommendations", "tests", "urgency"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Empty LLM response");
    }

    const parsed = JSON.parse(content);

    return {
      name: consultation.patientName,
      symptoms: Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0
        ? parsed.symptoms.slice(0, 8)
        : rawSymptoms.split(/[,،\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 8),
      diagnosis: parsed.diagnosis || (lang === "Arabic" ? "قيد التقييم" : "Pending evaluation"),
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 6) : [],
      tests: Array.isArray(parsed.tests) ? parsed.tests.slice(0, 6) : [],
      urgency: (["low", "medium", "high"].includes(parsed.urgency) ? parsed.urgency : "medium") as "low" | "medium" | "high",
      medical_history: consultation.medicalHistory || null,
    };
  } catch (err: any) {
    console.error("[PythonAPI] Failed to parse analysis with LLM:", err.message);
    // Fallback: extract symptoms from raw text
    return {
      name: consultation.patientName,
      symptoms: rawSymptoms
        .split(/[,،\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      diagnosis: lang === "Arabic" ? "راجع التقرير الطبي الكامل" : "See full medical report",
      recommendations: [lang === "Arabic" ? "مراجعة طبيب متخصص" : "Consult a specialist"],
      tests: [],
      urgency: "medium",
      medical_history: consultation.medicalHistory || null,
    };
  }
}

// ─── Infographic Generation ───────────────────────────────────────────────────

/**
 * Generate an SVG infographic via the Python API.
 * Returns the S3 URL of the uploaded SVG, or null on failure.
 */
export async function generateInfographicViaPython(
  consultation: {
    id: number;
    patientName: string;
    symptoms: string;
    medicalHistory?: string | null;
    aiAnalysis?: string | null;
    preferredLanguage: string;
  },
  customPrompt?: string
): Promise<string | null> {
  const baseUrl = ENV.pythonApiUrl;
  const lang = consultation.preferredLanguage === "ar" ? "ar" : "en";

  console.log(`[PythonAPI] Parsing analysis for infographic #${consultation.id}...`);
  const patientData = await parseAnalysisToPatientData(consultation);
  console.log(`[PythonAPI] Structured data: diagnosis="${patientData.diagnosis}", symptoms=${patientData.symptoms.length}, urgency=${patientData.urgency}`);

  // Build a rich visual prompt if no custom prompt is provided
  const urgencyColor = patientData.urgency === "high" ? "#EF4444" : patientData.urgency === "medium" ? "#F59E0B" : "#10B981";
  const defaultPrompt = customPrompt || (
    lang === "ar"
      ? `أنشئ إنفوغرافيك طبي بصري عالي الجودة بتنسيق SVG بالمواصفات التالية:
- حجم 800×1200 بكسل
- خلفية بيضاء نظيفة مع ألوان قسم واضحة
- قسم رأس بلون ${urgencyColor} يحتوي على اسم المريض ومستوى الإلحاح بشكل بارز
- قسم الأعراض: مربعات ملونة لكل عرض مع أيقونة بسيطة
- قسم التشخيص: خلفية ملونة واضحة مع نص كبير
- قسم التوصيات: قائمة مرقمة مع أيقونات ملونة لكل توصية
- قسم الفحوصات: شبكة من البطاقات الملونة
- مؤشر بصري لمستوى الإلحاح (${patientData.urgency === "high" ? "عالي - أحمر" : patientData.urgency === "medium" ? "متوسط - برتقالي" : "منخفض - أخضر"})
- خط عربي واضح، اتجاه RTL
- تذييل يحتوي على اسم المنصة
- استخدم أشكال هندسية وألوان متناسقة لجعله جذاباً بصرياً`
      : `Create a high-quality visual medical infographic in SVG format with these specifications:
- Size 800×1200 pixels
- Clean white background with clear section colors
- Header section in ${urgencyColor} with patient name and urgency level prominently displayed
- Symptoms section: colored cards for each symptom with simple icons
- Diagnosis section: clear colored background with large text
- Recommendations section: numbered list with colored icons for each item
- Tests section: grid of colored cards
- Visual urgency indicator (${patientData.urgency === "high" ? "HIGH - red" : patientData.urgency === "medium" ? "MEDIUM - orange" : "LOW - green"})
- Clear readable font, professional layout
- Footer with platform name
- Use geometric shapes and harmonious colors to make it visually appealing`
  );

  try {
    const response = await fetch(`${baseUrl}/generate/infographic`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        patient_data: patientData,
        language: lang,
        custom_prompt: defaultPrompt,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PythonAPI] Infographic HTTP ${response.status}: ${errText}`);
      return null;
    }

    const result: PythonApiResponse = await response.json();

    if (!result.success || !result.data) {
      console.error(`[PythonAPI] Infographic generation failed: ${result.error}`);
      return null;
    }

    // Post-process SVG: inject Arabic Google Font and fix font-family for Arabic text
    let svgContent = Buffer.from(result.data, "base64").toString("utf-8");
    
    // Inject Google Fonts Arabic font (Cairo for Arabic, Roboto for Latin)
    const fontImport = `<defs>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&amp;family=Roboto:wght@400;700&amp;display=swap');
    text { font-family: 'Cairo', 'Roboto', Arial, sans-serif !important; }
  </style>
</defs>`;
    
    // Replace font-family="Arial" with Cairo (supports Arabic)
    svgContent = svgContent.replace(/font-family="Arial"/g, 'font-family="Cairo, Arial, sans-serif"');
    svgContent = svgContent.replace(/font-family='Arial'/g, "font-family='Cairo, Arial, sans-serif'");
    
    // Inject defs after opening <svg tag
    if (!svgContent.includes('<defs>')) {
      svgContent = svgContent.replace(/(<svg[^>]*>)/, `$1\n${fontImport}`);
    } else {
      svgContent = svgContent.replace('<defs>', `<defs>\n  <style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&amp;display=swap'); text { font-family: 'Cairo', Arial, sans-serif !important; }</style>`);
    }
    
    const fileBuffer = Buffer.from(svgContent, "utf-8");
    const fileKey = `infographics/consultation-${consultation.id}-${nanoid(8)}.svg`;
    const { url } = await storagePut(fileKey, fileBuffer, result.file_type || "image/svg+xml");

    console.log(`[PythonAPI] Infographic uploaded to S3: ${url}`);
    return url;
  } catch (error: any) {
    console.error(`[PythonAPI] Infographic error for consultation #${consultation.id}:`, error.message);
    return null;
  }
}

// ─── PPTX Slide Deck Generation ───────────────────────────────────────────────

/**
 * Generate a PPTX slide deck via the Python API.
 * Returns the S3 URL of the uploaded PPTX, or null on failure.
 */
export async function generatePptxViaPython(
  consultation: {
    id: number;
    patientName: string;
    symptoms: string;
    medicalHistory?: string | null;
    aiAnalysis?: string | null;
    preferredLanguage: string;
  }
): Promise<string | null> {
  const baseUrl = ENV.pythonApiUrl;
  const lang = consultation.preferredLanguage === "ar" ? "ar" : "en";

  console.log(`[PythonAPI] Parsing analysis for PPTX #${consultation.id}...`);
  const patientData = await parseAnalysisToPatientData(consultation);
  console.log(`[PythonAPI] Structured data: diagnosis="${patientData.diagnosis}", recommendations=${patientData.recommendations.length}, tests=${patientData.tests.length}`);

  try {
    const response = await fetch(`${baseUrl}/generate/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        patient_data: patientData,
        consultation_id: consultation.id,
        language: lang,
      }),
      // 180-second timeout (PPTX generation can take 2-3 minutes)
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PythonAPI] PPTX HTTP ${response.status}: ${errText}`);
      return null;
    }

    const result: PythonApiResponse = await response.json();

    if (!result.success || !result.data) {
      console.error(`[PythonAPI] PPTX generation failed: ${result.error}`);
      return null;
    }

    const fileBuffer = Buffer.from(result.data, "base64");
    const fileKey = `slides/consultation-${consultation.id}-${nanoid(8)}.pptx`;
    const { url } = await storagePut(
      fileKey,
      fileBuffer,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    console.log(`[PythonAPI] PPTX uploaded to S3: ${url}`);
    return url;
  } catch (error: any) {
    console.error(`[PythonAPI] PPTX error for consultation #${consultation.id}:`, error.message);
    return null;
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

/**
 * Health check for the Python API.
 */
export async function checkPythonApiHealth(): Promise<{
  healthy: boolean;
  anthropicConfigured: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${ENV.pythonApiUrl}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { healthy: false, anthropicConfigured: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return {
      healthy: data.status === "healthy",
      anthropicConfigured: Boolean(data.anthropic_configured),
    };
  } catch (error: any) {
    return { healthy: false, anthropicConfigured: false, error: error.message };
  }
}
