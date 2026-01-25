/**
 * AI Medical Analysis Service
 * Uses Google Gemini to analyze patient consultations and generate comprehensive medical reports
 */

import { invokeLLM } from "./_core/llm";

export interface ConsultationData {
  consultationId: number;
  patientName: string;
  patientEmail: string;
  symptoms: string;
  medicalHistory?: string | null;
  medicalReports?: string[] | null; // File URLs
  labResults?: string[] | null; // File URLs
  xrayImages?: string[] | null; // File URLs
  preferredLanguage: "en" | "ar";
  isDeepAnalysis?: boolean; // True if this is a re-analysis after rejection
  specialistFeedback?: string | null; // Feedback from specialist if rejected
}

export interface MedicalAnalysisResult {
  success: boolean;
  analysis?: string; // Comprehensive medical analysis text
  summary?: string; // Executive summary
  keyFindings?: string[]; // Key medical findings
  recommendations?: string[]; // Medical recommendations
  urgencyLevel?: "low" | "medium" | "high" | "critical";
  error?: string;
}

/**
 * Analyze consultation data using AI and generate comprehensive medical report
 */
export async function analyzeMedicalConsultation(
  data: ConsultationData
): Promise<MedicalAnalysisResult> {
  try {
    const isDeepAnalysis = data.isDeepAnalysis || false;
    const analysisDepth = isDeepAnalysis ? "DEEP" : "STANDARD";
    
    // Build the prompt for AI analysis
    const systemPrompt = `You are an expert medical AI assistant helping doctors analyze patient cases. 
Your role is to provide comprehensive medical analysis based on patient symptoms, medical history, and available test results.

IMPORTANT GUIDELINES:
- Provide thorough, evidence-based medical analysis
- Identify key symptoms and possible diagnoses
- Suggest relevant tests or examinations if needed
- Highlight any urgent or concerning findings
- Use clear, professional medical terminology
- Always include disclaimers that this is AI-assisted analysis requiring physician review
- ${isDeepAnalysis ? 'This is a DEEP ANALYSIS - provide more detailed differential diagnoses, consider rare conditions, and explore alternative explanations.' : 'Provide standard comprehensive analysis.'}

${data.specialistFeedback ? `SPECIALIST FEEDBACK TO ADDRESS:\n${data.specialistFeedback}\n\nPlease incorporate this feedback and provide improved analysis.` : ''}

Language: ${data.preferredLanguage === "ar" ? "Arabic (العربية)" : "English"}`;

    const userPrompt = `Please analyze the following patient consultation:

PATIENT INFORMATION:
- Name: ${data.patientName}
- Email: ${data.patientEmail}

CHIEF COMPLAINTS / SYMPTOMS:
${data.symptoms}

${data.medicalHistory ? `MEDICAL HISTORY:\n${data.medicalHistory}\n` : ''}

${data.medicalReports && data.medicalReports.length > 0 ? `MEDICAL REPORTS AVAILABLE: ${data.medicalReports.length} document(s)\n` : ''}
${data.labResults && data.labResults.length > 0 ? `LAB RESULTS AVAILABLE: ${data.labResults.length} document(s)\n` : ''}
${data.xrayImages && data.xrayImages.length > 0 ? `X-RAY/IMAGING AVAILABLE: ${data.xrayImages.length} image(s)\n` : ''}

Please provide a comprehensive medical analysis including:
1. Summary of presenting symptoms
2. Possible diagnoses (differential diagnosis)
3. Recommended tests or examinations
4. Urgency assessment
5. General recommendations for the treating physician

Analysis Depth: ${analysisDepth}`;

    // Call Gemini AI
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    });

    const analysisContent = response.choices[0]?.message?.content;
    const analysisText = typeof analysisContent === 'string' ? analysisContent : JSON.stringify(analysisContent);
    
    if (!analysisText) {
      return {
        success: false,
        error: "AI did not return analysis content"
      };
    }

    // Extract key information using structured follow-up
    const structuredResponse = await invokeLLM({
      messages: [
        { role: "system", content: "You are a medical data extraction assistant. Extract structured information from medical analysis." },
        { role: "user", content: `From the following medical analysis, extract:
1. A brief executive summary (2-3 sentences)
2. Key findings (list of 3-5 main points)
3. Recommendations (list of 3-5 actionable items)
4. Urgency level (low/medium/high/critical)

Medical Analysis:
${analysisText}

Provide response in JSON format with keys: summary, keyFindings (array), recommendations (array), urgencyLevel` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "medical_analysis_structured",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              keyFindings: { 
                type: "array",
                items: { type: "string" }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              },
              urgencyLevel: { 
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              }
            },
            required: ["summary", "keyFindings", "recommendations", "urgencyLevel"],
            additionalProperties: false
          }
        }
      }
    });

    const structuredContent = structuredResponse.choices[0]?.message?.content;
    const structuredStr = typeof structuredContent === 'string' ? structuredContent : JSON.stringify(structuredContent);
    const structuredData = JSON.parse(structuredStr || "{}");

    return {
      success: true,
      analysis: analysisText,
      summary: structuredData.summary,
      keyFindings: structuredData.keyFindings,
      recommendations: structuredData.recommendations,
      urgencyLevel: structuredData.urgencyLevel
    };

  } catch (error) {
    console.error("Error in AI medical analysis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Generate slide deck content from medical analysis
 */
export async function generateSlideDeckContent(
  analysisResult: MedicalAnalysisResult,
  patientName: string,
  language: "en" | "ar"
): Promise<{ success: boolean; slides?: any[]; error?: string }> {
  try {
    const prompt = `Create a medical presentation slide deck based on this analysis.
Generate 5-7 slides with titles and bullet points.

Patient: ${patientName}
Language: ${language === "ar" ? "Arabic" : "English"}

Analysis Summary:
${analysisResult.summary}

Key Findings:
${analysisResult.keyFindings?.join("\n")}

Recommendations:
${analysisResult.recommendations?.join("\n")}

Provide slides in JSON format with structure:
[
  { "title": "Slide Title", "content": ["Bullet 1", "Bullet 2", ...] }
]`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "slide_deck",
          strict: true,
          schema: {
            type: "object",
            properties: {
              slides: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["title", "content"],
                  additionalProperties: false
                }
              }
            },
            required: ["slides"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const slideData = JSON.parse(contentStr || "{}");
    
    return {
      success: true,
      slides: slideData.slides
    };
  } catch (error) {
    console.error("Error generating slide deck:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Generate mind map structure from medical analysis
 */
export async function generateMindMapData(
  analysisResult: MedicalAnalysisResult,
  symptoms: string,
  language: "en" | "ar"
): Promise<{ success: boolean; mindMap?: any; error?: string }> {
  try {
    const prompt = `Create a medical mind map structure for this case.
The mind map should show relationships between symptoms, findings, and recommendations.

Symptoms: ${symptoms}
Key Findings: ${analysisResult.keyFindings?.join(", ")}
Recommendations: ${analysisResult.recommendations?.join(", ")}

Language: ${language === "ar" ? "Arabic" : "English"}

Provide a hierarchical mind map in JSON format:
{
  "central": "Main Topic",
  "branches": [
    {
      "label": "Branch Name",
      "children": ["Child 1", "Child 2"]
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mind_map",
          strict: true,
          schema: {
            type: "object",
            properties: {
              central: { type: "string" },
              branches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    children: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["label", "children"],
                  additionalProperties: false
                }
              }
            },
            required: ["central", "branches"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const mindMapData = JSON.parse(contentStr || "{}");
    
    return {
      success: true,
      mindMap: mindMapData
    };
  } catch (error) {
    console.error("Error generating mind map:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
