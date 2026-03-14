/**
 * Python API Client
 * Calls the deployed Python FastAPI backend for AI-powered content generation.
 * Endpoints:
 *   POST /generate/infographic  → SVG infographic (base64)
 *   POST /generate/slides       → PPTX slide deck (base64)
 *   GET  /health                → Health check
 *
 * Key design decision: We pass the FULL raw AI analysis text to the Python API
 * rather than pre-parsed fragments. This lets the Python backend (Claude) extract
 * and format content in the correct language, avoiding the ????? encoding issue
 * that occurred when English fallback strings were sent with language="ar".
 */

import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

interface PatientData {
  name: string;
  /** Raw symptoms text as entered by the patient */
  symptoms_raw: string;
  /** Full AI analysis text — let the Python backend parse this */
  ai_analysis_raw?: string | null;
  medical_history?: string | null;
  preferred_language: "en" | "ar";
}

interface PythonApiResponse {
  success: boolean;
  data?: string; // base64-encoded file
  file_type?: string;
  size_bytes?: number;
  error?: string;
}

/**
 * Build PatientData from a consultation record.
 * We deliberately pass raw text so the Python backend can parse it
 * in the correct language using Claude.
 */
export function buildPatientData(consultation: {
  patientName: string;
  symptoms: string;
  medicalHistory?: string | null;
  aiAnalysis?: string | null;
  preferredLanguage: string;
}): PatientData {
  return {
    name: consultation.patientName,
    symptoms_raw: consultation.symptoms,
    ai_analysis_raw: consultation.aiAnalysis || null,
    medical_history: consultation.medicalHistory || null,
    preferred_language: consultation.preferredLanguage === "ar" ? "ar" : "en",
  };
}

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
  const patientData = buildPatientData(consultation);

  console.log(`[PythonAPI] Generating infographic for consultation #${consultation.id} (lang: ${patientData.preferred_language})...`);

  try {
    const response = await fetch(`${baseUrl}/generate/infographic`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        patient_data: patientData,
        language: patientData.preferred_language,
        custom_prompt: customPrompt || null,
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

    // Decode base64 and upload to S3
    const fileBuffer = Buffer.from(result.data, "base64");
    const ext = "svg";
    const fileKey = `infographics/consultation-${consultation.id}-${nanoid(8)}.${ext}`;
    const { url } = await storagePut(fileKey, fileBuffer, result.file_type || "image/svg+xml");

    console.log(`[PythonAPI] Infographic uploaded to S3: ${url}`);
    return url;
  } catch (error: any) {
    console.error(`[PythonAPI] Infographic error for consultation #${consultation.id}:`, error.message);
    return null;
  }
}

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
  const patientData = buildPatientData(consultation);

  console.log(`[PythonAPI] Generating PPTX for consultation #${consultation.id} (lang: ${patientData.preferred_language})...`);

  try {
    const response = await fetch(`${baseUrl}/generate/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        patient_data: patientData,
        consultation_id: consultation.id,
        language: patientData.preferred_language,
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

    // Decode base64 and upload to S3
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
