/**
 * Python API Client
 * Calls the deployed Python FastAPI backend for AI-powered content generation.
 * Endpoints:
 *   POST /generate/infographic  → SVG infographic (base64)
 *   POST /generate/slides       → PPTX slide deck (base64)
 *   GET  /health                → Health check
 */

import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

interface PatientData {
  name: string;
  symptoms: string[];
  medical_history?: string | null;
  diagnosis: string;
  recommendations: string[];
  tests: string[];
  urgency?: "low" | "medium" | "high";
}

interface PythonApiResponse {
  success: boolean;
  data?: string; // base64-encoded file
  file_type?: string;
  size_bytes?: number;
  error?: string;
}

/**
 * Build PatientData from a consultation record and its parsed AI analysis.
 */
export function buildPatientData(consultation: {
  patientName: string;
  symptoms: string;
  medicalHistory?: string | null;
  aiAnalysis?: string | null;
}): PatientData {
  // Parse symptoms into an array (comma or newline separated)
  const symptomsArray = consultation.symptoms
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 8);

  // Try to extract structured info from AI analysis
  let diagnosis = "Requires specialist evaluation";
  let recommendations: string[] = ["Consult a specialist", "Follow up regularly"];
  let tests: string[] = ["Complete blood count", "General examination"];
  let urgency: "low" | "medium" | "high" = "medium";

  if (consultation.aiAnalysis) {
    const analysis = consultation.aiAnalysis;

    // Extract urgency
    const urgencyMatch = analysis.match(/urgency[:\s]+(\w+)/i);
    if (urgencyMatch) {
      const u = urgencyMatch[1].toLowerCase();
      if (u === "low") urgency = "low";
      else if (u === "high" || u === "critical") urgency = "high";
      else urgency = "medium";
    }

    // Extract diagnosis (first line after "diagnosis:" keyword)
    const diagMatch = analysis.match(/(?:diagnosis|تشخيص)[:\s]+([^\n]+)/i);
    if (diagMatch) diagnosis = diagMatch[1].trim().slice(0, 200);

    // Extract recommendations (lines after "recommendations:" keyword)
    const recMatch = analysis.match(
      /(?:recommendations|توصيات)[:\s]+([\s\S]*?)(?:\n\n|(?:tests|فحوصات|$))/i
    );
    if (recMatch) {
      recommendations = recMatch[1]
        .split(/\n|•|-|[0-9]+\./)
        .map((r) => r.trim())
        .filter((r) => r.length > 5)
        .slice(0, 5);
    }

    // Extract tests
    const testsMatch = analysis.match(
      /(?:tests|examinations|فحوصات)[:\s]+([\s\S]*?)(?:\n\n|$)/i
    );
    if (testsMatch) {
      tests = testsMatch[1]
        .split(/\n|•|-|[0-9]+\./)
        .map((t) => t.trim())
        .filter((t) => t.length > 3)
        .slice(0, 5);
    }
  }

  return {
    name: consultation.patientName,
    symptoms: symptomsArray.length > 0 ? symptomsArray : [consultation.symptoms.slice(0, 100)],
    medical_history: consultation.medicalHistory || null,
    diagnosis,
    recommendations,
    tests,
    urgency,
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
  const language = (consultation.preferredLanguage === "ar" ? "ar" : "en") as "ar" | "en";
  const patientData = buildPatientData(consultation);

  console.log(`[PythonAPI] Generating infographic for consultation #${consultation.id}...`);

  try {
    const response = await fetch(`${baseUrl}/generate/infographic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_data: patientData,
        language,
        custom_prompt: customPrompt || null,
      }),
      // 90-second timeout
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
    const ext = result.file_type === "image/svg+xml" ? "svg" : "svg";
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
  const language = (consultation.preferredLanguage === "ar" ? "ar" : "en") as "ar" | "en";
  const patientData = buildPatientData(consultation);

  console.log(`[PythonAPI] Generating PPTX for consultation #${consultation.id}...`);

  try {
    const response = await fetch(`${baseUrl}/generate/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_data: patientData,
        consultation_id: consultation.id,
        language,
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
