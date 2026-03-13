/**
 * Content Generation Pipeline
 * ===========================
 * Generates PPTX presentations and SVG infographics via the Python FastAPI backend
 * (ultimate_server.py) which uses Claude AI.
 *
 * PDF reports, audio summaries, and mind maps are generated directly in Node.js.
 *
 * Brand colors: #06B6D4 (cyan) | #10B981 (green)
 * Language policy: pure Arabic OR pure English — never mixed.
 */

import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { MedicalAnalysisResult } from "./aiMedicalAnalysis";
import { invokeLLM } from "./_core/llm";

// ─── Python API config ────────────────────────────────────────────────────────
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GeneratedContent {
  reportPdfUrl?: string;
  infographicUrl?: string;
  slideDeckUrl?: string;
  mindMapUrl?: string;
}

interface PythonApiResponse {
  success: boolean;
  data?: string;          // base64-encoded file content
  file_type?: string;     // MIME type
  size_bytes?: number;
  error?: string;
}

interface PatientDataPayload {
  name: string;
  symptoms: string[];
  medical_history?: string;
  diagnosis: string;
  recommendations: string[];
  tests: string[];
  urgency: "low" | "medium" | "high";
}

// ─── Helper: build PatientDataPayload from analysis result ───────────────────
function buildPatientPayload(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  symptoms: string,
  language: "en" | "ar"
): PatientDataPayload {
  // Map urgency levels — Python API only accepts low/medium/high
  const urgencyMap: Record<string, "low" | "medium" | "high"> = {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "high",
  };
  const urgency = urgencyMap[analysisResult.urgencyLevel ?? "medium"] ?? "medium";

  // Split free-text symptoms into an array (max 8 items)
  const symptomsArray = symptoms
    .split(/[,،\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  // Use the AI-generated summary as the diagnosis field
  const diagnosis =
    analysisResult.summary ||
    (language === "ar" ? "يتطلب تقييم طبي" : "Requires medical evaluation");

  return {
    name: patientName,
    symptoms: symptomsArray.length > 0 ? symptomsArray : [symptoms.slice(0, 200)],
    diagnosis,
    recommendations: (analysisResult.recommendations ?? []).slice(0, 6),
    tests: (analysisResult.keyFindings ?? []).slice(0, 6),
    urgency,
  };
}

// ─── PPTX generation via Python API ──────────────────────────────────────────
async function generatePPTXViaPython(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  consultationId: number,
  symptoms: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    console.log(`[PPTX] Calling Python API for consultation #${consultationId}`);

    const payload = {
      patient_data: buildPatientPayload(analysisResult, patientName, symptoms, language),
      consultation_id: consultationId,
      language,
    };

    const res = await fetch(`${PYTHON_API_URL}/generate/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 90-second timeout for large PPTX generation
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[PPTX] Python API HTTP ${res.status}: ${text}`);
      return null;
    }

    const result: PythonApiResponse = await res.json();

    if (!result.success || !result.data) {
      console.error(`[PPTX] Python API error: ${result.error}`);
      return null;
    }

    // Decode base64 → Buffer and upload to S3 as .pptx
    const pptxBuffer = Buffer.from(result.data, "base64");
    const fileName = `slides-${consultationId}-${nanoid()}.pptx`;
    const { url } = await storagePut(
      `slides/${fileName}`,
      pptxBuffer,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    console.log(`[PPTX] ✅ Generated ${pptxBuffer.length} bytes → ${url}`);
    return url;
  } catch (error) {
    console.error("[PPTX] Generation failed:", error);
    return null;
  }
}

// ─── Infographic (SVG) generation via Python API ─────────────────────────────
async function generateInfographicViaPython(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  consultationId: number,
  symptoms: string,
  language: "en" | "ar",
  customPrompt?: string
): Promise<string | null> {
  try {
    console.log(`[Infographic] Calling Python API for consultation #${consultationId}`);

    const payload = {
      patient_data: buildPatientPayload(analysisResult, patientName, symptoms, language),
      language,
      custom_prompt: customPrompt ?? null,
    };

    const res = await fetch(`${PYTHON_API_URL}/generate/infographic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Infographic] Python API HTTP ${res.status}: ${text}`);
      return null;
    }

    const result: PythonApiResponse = await res.json();

    if (!result.success || !result.data) {
      console.error(`[Infographic] Python API error: ${result.error}`);
      return null;
    }

    // Decode base64 SVG → Buffer and upload to S3
    const svgBuffer = Buffer.from(result.data, "base64");
    const fileName = `infographic-${consultationId}-${nanoid()}.svg`;
    const { url } = await storagePut(
      `infographics/${fileName}`,
      svgBuffer,
      "image/svg+xml"
    );

    console.log(`[Infographic] ✅ Generated ${svgBuffer.length} bytes → ${url}`);
    return url;
  } catch (error) {
    console.error("[Infographic] Generation failed:", error);
    return null;
  }
}

// ─── PDF report (Node.js, no Python dependency) ──────────────────────────────
async function generatePDFReport(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  consultationId: number,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    const isAr = language === "ar";
    const dir = isAr ? 'rtl' : 'ltr';
    const urgencyColors: Record<string, string> = {
      low: "#d4edda",
      medium: "#fff3cd",
      high: "#f8d7da",
      critical: "#f5c6cb",
    };
    const urgencyTextColors: Record<string, string> = {
      low: "#155724",
      medium: "#856404",
      high: "#721c24",
      critical: "#721c24",
    };
    const urgency = analysisResult.urgencyLevel ?? "medium";
    const bgColor = urgencyColors[urgency] ?? "#fff3cd";
    const textColor = urgencyTextColors[urgency] ?? "#856404";

    const htmlContent = `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.7; color: #1e293b; }
    h1 { color: #06B6D4; border-bottom: 3px solid #06B6D4; padding-bottom: 10px; }
    h2 { color: #164E63; margin-top: 28px; }
    .header { text-align: center; margin-bottom: 40px; }
    .brand { color: #10B981; font-weight: bold; font-size: 14px; }
    .urgency { padding: 10px 16px; border-radius: 6px; font-weight: bold; display: inline-block; background: ${bgColor}; color: ${textColor}; }
    ul { margin: 10px 0; padding-${isAr ? 'right' : 'left'}: 20px; }
    li { margin: 6px 0; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${isAr ? 'تقرير التحليل الطبي' : 'Medical Analysis Report'}</h1>
    <p class="brand">مستشارك الطبي الذكي | Smart Medical Consultant</p>
    <p><strong>${isAr ? 'المريض' : 'Patient'}:</strong> ${patientName}</p>
    <p><strong>${isAr ? 'رقم الاستشارة' : 'Consultation ID'}:</strong> #${consultationId}</p>
    <p><strong>${isAr ? 'التاريخ' : 'Date'}:</strong> ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
  </div>

  <div>
    <span class="urgency">${isAr ? 'مستوى الأولوية' : 'Urgency'}: ${urgency.toUpperCase()}</span>
  </div>

  <h2>${isAr ? 'ملخص تنفيذي' : 'Executive Summary'}</h2>
  <p>${analysisResult.summary ?? ''}</p>

  <h2>${isAr ? 'النتائج الرئيسية' : 'Key Findings'}</h2>
  <ul>${(analysisResult.keyFindings ?? []).map((f) => `<li>${f}</li>`).join('')}</ul>

  <h2>${isAr ? 'التوصيات' : 'Recommendations'}</h2>
  <ul>${(analysisResult.recommendations ?? []).map((r) => `<li>${r}</li>`).join('')}</ul>

  <h2>${isAr ? 'التحليل التفصيلي' : 'Detailed Analysis'}</h2>
  <p>${(analysisResult.analysis ?? '').replace(/\n/g, '<br>')}</p>

  <div class="footer">
    <p><strong>${isAr ? 'تنويه' : 'Disclaimer'}:</strong> ${isAr
      ? 'هذا التحليل تم إنشاؤه بمساعدة الذكاء الاصطناعي ويتطلب مراجعة من قبل طبيب متخصص.'
      : 'This analysis was generated with AI assistance and requires review by a medical specialist.'
    }</p>
  </div>
</body>
</html>`;

    const htmlBuffer = Buffer.from(htmlContent, "utf-8");
    const fileName = `report-${consultationId}-${nanoid()}.html`;
    const { url } = await storagePut(`reports/${fileName}`, htmlBuffer, "text/html");
    return url;
  } catch (error) {
    console.error("[PDF Report] Generation failed:", error);
    return null;
  }
}

// ─── Mind map (Node.js, no Python dependency) ────────────────────────────────
async function generateMindMap(
  analysisResult: MedicalAnalysisResult,
  symptoms: string,
  language: "en" | "ar"
): Promise<string | null> {
  try {
    const isAr = language === "ar";
    const mindMap = {
      root: isAr ? "التحليل الطبي" : "Medical Analysis",
      branches: [
        {
          label: isAr ? "الأعراض" : "Symptoms",
          children: symptoms.split(/[,،\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 6),
        },
        {
          label: isAr ? "النتائج الرئيسية" : "Key Findings",
          children: (analysisResult.keyFindings ?? []).slice(0, 5),
        },
        {
          label: isAr ? "التوصيات" : "Recommendations",
          children: (analysisResult.recommendations ?? []).slice(0, 5),
        },
        {
          label: isAr ? "مستوى الأولوية" : "Urgency",
          children: [analysisResult.urgencyLevel ?? "medium"],
        },
      ],
    };

    const fileName = `mindmap-${nanoid()}.json`;
    const buf = Buffer.from(JSON.stringify(mindMap, null, 2), "utf-8");
    const { url } = await storagePut(`mindmaps/${fileName}`, buf, "application/json");
    return url;
  } catch (error) {
    console.error("[MindMap] Generation failed:", error);
    return null;
  }
}

// ─── Exported: regenerate infographic for a single consultation ───────────────
export async function regenerateInfographicForConsultation(
  consultationId: number,
  aiAnalysis: string,
  patientName: string,
  language: "en" | "ar",
  customPrompt?: string
): Promise<string | null> {
  try {
    console.log(`[Infographic Regen] Starting for consultation #${consultationId}`);
    const analysisResult: MedicalAnalysisResult = JSON.parse(aiAnalysis);
    const symptoms = (analysisResult.keyFindings ?? []).join(", ");
    return await generateInfographicViaPython(
      analysisResult,
      patientName,
      consultationId,
      symptoms,
      language,
      customPrompt
    );
  } catch (error) {
    console.error(`[Infographic Regen] Error for #${consultationId}:`, error);
    return null;
  }
}

// ─── Main export: generate all content in parallel ───────────────────────────
export async function generateAllContent(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  consultationId: number,
  symptoms: string,
  language: "en" | "ar"
): Promise<GeneratedContent> {
  console.log(`[Content Generation] 🚀 Starting for consultation #${consultationId} [${language}]`);

  const [reportPdfUrl, infographicUrl, slideDeckUrl, mindMapUrl] = await Promise.all([
    generatePDFReport(analysisResult, patientName, consultationId, language),
    generateInfographicViaPython(analysisResult, patientName, consultationId, symptoms, language),
    generatePPTXViaPython(analysisResult, patientName, consultationId, symptoms, language),
    generateMindMap(analysisResult, symptoms, language),
  ]);

  console.log(`[Content Generation] ✅ Done for #${consultationId}`, {
    reportPdfUrl: !!reportPdfUrl,
    infographicUrl: !!infographicUrl,
    slideDeckUrl: !!slideDeckUrl,
    mindMapUrl: !!mindMapUrl,
  });

  return {
    reportPdfUrl: reportPdfUrl ?? undefined,
    infographicUrl: infographicUrl ?? undefined,
    slideDeckUrl: slideDeckUrl ?? undefined,
    mindMapUrl: mindMapUrl ?? undefined,
  };
}
