/**
 * Medical History AI Processor
 * Takes completed medical history from the history-collection chat and generates:
 *   1. SBAR medical report brief (Situation, Background, Assessment, Recommendation)
 *   2. Medical infographic (HTML → stored as JSON content in S3)
 *   3. Medical slide deck (5-7 slides stored as JSON content in S3)
 */

import { invokeMedGemmaStructured, invokeMedGemmaLLM } from "./medgemmaLLM";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as db from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SBARReport {
  situation: string;       // Current patient situation / chief complaint
  background: string;      // Relevant medical history, medications, allergies
  assessment: string;      // AI assessment of likely diagnoses / risk factors
  recommendation: string;  // Recommended next steps / investigations
  urgencyLevel: "low" | "medium" | "high" | "critical";
  keyFindings: string[];
  language: "en" | "ar";
}

export interface InfographicContent {
  title: string;
  patientName: string;
  date: string;
  sections: InfographicSection[];
  language: "en" | "ar";
}

export interface InfographicSection {
  heading: string;
  items: string[];
  color: string; // hex color
  icon: string;  // emoji or icon name
}

export interface SlideDeckContent {
  title: string;
  patientName: string;
  date: string;
  slides: SlideContent[];
  language: "en" | "ar";
}

export interface SlideContent {
  slideNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  notes?: string;
  type: "title" | "findings" | "assessment" | "recommendations" | "summary";
}

export interface AIProcessingResult {
  success: boolean;
  sbarReport?: SBARReport;
  sbarReportUrl?: string;
  infographicUrl?: string;
  slideDeckUrl?: string;
  error?: string;
  confidence?: number;
  confidenceLabel?: string;
  requiresHumanReview?: boolean;
  disclaimer?: string;
}

// ─── SBAR Report Generator ────────────────────────────────────────────────────

async function generateSBARReport(
  medicalHistory: string,
  patientName: string,
  symptoms: string,
  language: "en" | "ar"
): Promise<SBARReport> {
  const isAr = language === "ar";

  const systemPrompt = `Generate a structured SBAR medical report brief from the patient-provided history.

IMPORTANT:
- Be concise, clinical, and evidence-based
- Urgency levels: low (routine), medium (needs attention within days), high (needs attention within 24h), critical (emergency)
- Do NOT diagnose — provide differential assessment and recommendations
- Respond ONLY in valid JSON matching the schema below
- Language: ${isAr ? "Arabic (العربية)" : "English"}

JSON Schema:
{
  "situation": "string - current chief complaint in 1-2 sentences",
  "background": "string - relevant medical history, medications, allergies, lifestyle factors",
  "assessment": "string - AI assessment of likely conditions, risk factors, differential diagnoses",
  "recommendation": "string - recommended next steps, investigations, referrals",
  "urgencyLevel": "low|medium|high|critical",
  "keyFindings": ["array of 3-6 key clinical findings as strings"]
}`;

  const userPrompt = `Patient: ${patientName}

Chief Symptoms: ${symptoms}

Collected Medical History:
${medicalHistory}

Generate the SBAR report brief now.`;

  const result = await invokeMedGemmaStructured<Omit<SBARReport, 'language' | 'patientName'>>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      language,
      clinicalContext: `Patient: ${patientName}. Chief symptoms: ${symptoms}`,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sbar_report",
          strict: true,
          schema: {
            type: "object",
            properties: {
              situation: { type: "string" },
              background: { type: "string" },
              assessment: { type: "string" },
              recommendation: { type: "string" },
              urgencyLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
              keyFindings: { type: "array", items: { type: "string" } },
            },
            required: ["situation", "background", "assessment", "recommendation", "urgencyLevel", "keyFindings"],
            additionalProperties: false,
          },
        },
      },
    }
  );

  // Store confidence metadata on the SBAR object for use in the orchestrator
  const sbar = { ...result.content, language, patientName } as SBARReport;
  (sbar as any)._confidence = result.confidence;
  (sbar as any)._confidenceLabel = result.confidenceLabel;
  (sbar as any)._requiresHumanReview = result.requiresHumanReview;
  (sbar as any)._disclaimer = result.disclaimer;
  return sbar;
}

// ─── Infographic Content Generator ───────────────────────────────────────────

async function generateInfographicContent(
  sbar: SBARReport,
  patientName: string,
  language: "en" | "ar"
): Promise<InfographicContent> {
  const isAr = language === "ar";

  const systemPrompt = `Generate structured medical infographic content from an SBAR medical report.
The infographic should be visual, clear, and suitable for a medical professional.
Respond ONLY in valid JSON.

JSON Schema:
{
  "title": "string",
  "sections": [
    {
      "heading": "string",
      "items": ["array of 2-4 concise bullet points"],
      "color": "#hexcolor",
      "icon": "emoji"
    }
  ]
}

Use 4-5 sections. Suggested sections: Chief Complaint, Key History, Risk Factors, Assessment, Next Steps.
Color palette: use medical blues (#1a73e8), greens (#34a853), ambers (#fbbc04), reds (#ea4335), purples (#9c27b0).
Language: ${isAr ? "Arabic" : "English"}`;

  const userPrompt = `Patient: ${patientName}
Urgency: ${sbar.urgencyLevel}

SBAR:
Situation: ${sbar.situation}
Background: ${sbar.background}
Assessment: ${sbar.assessment}
Recommendation: ${sbar.recommendation}
Key Findings: ${sbar.keyFindings.join(", ")}

Generate the infographic content now.`;

  const result = await invokeMedGemmaStructured<{ title: string; sections: InfographicSection[] }>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      language,
      clinicalContext: `Patient: ${patientName}. Urgency: ${sbar.urgencyLevel}`,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "infographic_content",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    heading: { type: "string" },
                    items: { type: "array", items: { type: "string" } },
                    color: { type: "string" },
                    icon: { type: "string" },
                  },
                  required: ["heading", "items", "color", "icon"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "sections"],
            additionalProperties: false,
          },
        },
      },
    }
  );

  return {
    ...result.content,
    patientName,
    date: new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US"),
    language,
  };
}

// ─── Slide Deck Content Generator ────────────────────────────────────────────

async function generateSlideDeckContent(
  sbar: SBARReport,
  patientName: string,
  language: "en" | "ar"
): Promise<SlideDeckContent> {
  const isAr = language === "ar";

  const systemPrompt = `Generate a 6-slide medical presentation deck for doctor review from an SBAR medical report.
Each slide should be concise and suitable for a 5-minute case presentation.
Respond ONLY in valid JSON.

JSON Schema:
{
  "title": "string - deck title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "string",
      "subtitle": "string or null",
      "bulletPoints": ["array of 3-5 bullet points"],
      "notes": "string - speaker notes for the doctor",
      "type": "title|findings|assessment|recommendations|summary"
    }
  ]
}

Slide structure:
1. Title slide (type: title) - patient overview, date, urgency badge
2. Chief Complaint & Symptoms (type: findings)
3. Medical History & Background (type: findings)
4. Key Clinical Findings (type: findings)
5. Assessment & Differential Diagnosis (type: assessment)
6. Recommendations & Next Steps (type: recommendations)

Language: ${isAr ? "Arabic" : "English"}`;

  const userPrompt = `Patient: ${patientName}
Urgency: ${sbar.urgencyLevel}

SBAR:
Situation: ${sbar.situation}
Background: ${sbar.background}
Assessment: ${sbar.assessment}
Recommendation: ${sbar.recommendation}
Key Findings: ${sbar.keyFindings.join(", ")}

Generate the 6-slide deck now.`;

  const result = await invokeMedGemmaStructured<{ title: string; slides: SlideContent[] }>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      language,
      clinicalContext: `Patient: ${patientName}. Urgency: ${sbar.urgencyLevel}`,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "slide_deck",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              slides: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    slideNumber: { type: "integer" },
                    title: { type: "string" },
                    subtitle: { type: ["string", "null"] },
                    bulletPoints: { type: "array", items: { type: "string" } },
                    notes: { type: ["string", "null"] },
                    type: { type: "string", enum: ["title", "findings", "assessment", "recommendations", "summary"] },
                  },
                  required: ["slideNumber", "title", "subtitle", "bulletPoints", "notes", "type"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "slides"],
            additionalProperties: false,
          },
        },
      },
    }
  );

  // Placeholder to satisfy original return shape
  const content = JSON.stringify(result.content);
  if (!content) throw new Error("No slide deck response from AI");

  return {
    ...result.content,
    patientName,
    date: new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US"),
    language,
  };
}

// ─── HTML Infographic Builder ─────────────────────────────────────────────────

function buildInfographicHTML(infographic: InfographicContent, sbar: SBARReport): string {
  const isAr = infographic.language === "ar";
  const urgencyColors: Record<string, string> = {
    low: "#34a853",
    medium: "#fbbc04",
    high: "#ea4335",
    critical: "#b71c1c",
  };
  const urgencyLabels: Record<string, string> = {
    low: isAr ? "منخفض" : "Low",
    medium: isAr ? "متوسط" : "Medium",
    high: isAr ? "عالٍ" : "High",
    critical: isAr ? "حرج" : "Critical",
  };

  const sectionsHTML = infographic.sections.map(section => `
    <div class="section" style="border-left: 4px solid ${section.color}; ${isAr ? 'border-left: none; border-right: 4px solid ' + section.color + ';' : ''}">
      <div class="section-header" style="color: ${section.color};">
        <span class="icon">${section.icon}</span>
        <span class="heading">${section.heading}</span>
      </div>
      <ul class="items">
        ${section.items.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${infographic.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${isAr ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Arial, sans-serif"};
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header .meta { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .urgency-badge {
      background: ${urgencyColors[sbar.urgencyLevel]};
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 16px;
    }
    .section {
      background: white;
      border-radius: 10px;
      padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      font-weight: 700;
      font-size: 15px;
    }
    .icon { font-size: 18px; }
    .items { list-style: none; padding: 0; }
    .items li {
      font-size: 13px;
      color: #374151;
      padding: 5px 0;
      border-bottom: 1px solid #f1f5f9;
      line-height: 1.5;
    }
    .items li:last-child { border-bottom: none; }
    .items li::before { content: "• "; color: #94a3b8; }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${infographic.title}</h1>
      <div class="meta">
        ${isAr ? "المريض" : "Patient"}: ${infographic.patientName} &nbsp;|&nbsp; ${infographic.date}
      </div>
    </div>
    <div class="urgency-badge">
      ${isAr ? "الأولوية" : "Urgency"}: ${urgencyLabels[sbar.urgencyLevel]}
    </div>
  </div>
  <div class="grid">
    ${sectionsHTML}
  </div>
  <div class="footer">
    ${isAr
      ? "تم إنشاء هذا التقرير بمساعدة الذكاء الاصطناعي — يتطلب مراجعة طبية متخصصة"
      : "AI-generated report — requires specialist medical review"}
  </div>
</body>
</html>`;
}

// ─── HTML Slide Deck Builder ──────────────────────────────────────────────────

function buildSlideDeckHTML(deck: SlideDeckContent, sbar: SBARReport): string {
  const isAr = deck.language === "ar";
  const urgencyColors: Record<string, string> = {
    low: "#34a853", medium: "#fbbc04", high: "#ea4335", critical: "#b71c1c",
  };

  const slidesHTML = deck.slides.map((slide, i) => {
    const isTitle = slide.type === "title";
    const bgColor = isTitle ? "#1a73e8" : "#ffffff";
    const textColor = isTitle ? "#ffffff" : "#1e293b";

    return `
    <div class="slide" id="slide-${i + 1}" style="background: ${bgColor}; color: ${textColor};">
      <div class="slide-number">${i + 1} / ${deck.slides.length}</div>
      ${isTitle ? `
        <div class="title-slide-content">
          <div class="title-badge" style="background: ${urgencyColors[sbar.urgencyLevel]}">
            ${isAr ? "الأولوية" : "Urgency"}: ${sbar.urgencyLevel.toUpperCase()}
          </div>
          <h1>${slide.title}</h1>
          ${slide.subtitle ? `<p class="subtitle">${slide.subtitle}</p>` : ""}
          <div class="title-meta">
            <span>${isAr ? "المريض" : "Patient"}: ${deck.patientName}</span>
            <span>${deck.date}</span>
          </div>
        </div>
      ` : `
        <div class="content-slide">
          <h2 class="slide-title">${slide.title}</h2>
          ${slide.subtitle ? `<p class="slide-subtitle">${slide.subtitle}</p>` : ""}
          <ul class="bullets">
            ${slide.bulletPoints.map(bp => `<li>${bp}</li>`).join("")}
          </ul>
          ${slide.notes ? `<div class="notes">${isAr ? "ملاحظات" : "Notes"}: ${slide.notes}</div>` : ""}
        </div>
      `}
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <title>${deck.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${isAr ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Arial, sans-serif"};
      background: #e2e8f0;
      padding: 20px;
    }
    .deck-title {
      text-align: center;
      font-size: 14px;
      color: #64748b;
      margin-bottom: 16px;
    }
    .slide {
      width: 100%;
      max-width: 800px;
      min-height: 450px;
      margin: 0 auto 24px;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .slide-number {
      position: absolute;
      top: 14px;
      right: 18px;
      font-size: 12px;
      opacity: 0.5;
    }
    /* Title slide */
    .title-slide-content { text-align: center; }
    .title-badge {
      display: inline-block;
      color: white;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .title-slide-content h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; }
    .subtitle { font-size: 16px; opacity: 0.85; margin-bottom: 24px; }
    .title-meta { font-size: 13px; opacity: 0.7; display: flex; gap: 24px; justify-content: center; }
    /* Content slides */
    .content-slide {}
    .slide-title { font-size: 22px; font-weight: 700; color: #1a73e8; margin-bottom: 8px; }
    .slide-subtitle { font-size: 14px; color: #64748b; margin-bottom: 20px; }
    .bullets { list-style: none; padding: 0; }
    .bullets li {
      font-size: 15px;
      color: #374151;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      line-height: 1.6;
      padding-${isAr ? "right" : "left"}: 20px;
      position: relative;
    }
    .bullets li::before {
      content: "▸";
      color: #1a73e8;
      position: absolute;
      ${isAr ? "right" : "left"}: 0;
    }
    .bullets li:last-child { border-bottom: none; }
    .notes {
      margin-top: 20px;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 6px;
      font-size: 12px;
      color: #64748b;
      border-${isAr ? "right" : "left"}: 3px solid #1a73e8;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="deck-title">${deck.title} — ${deck.patientName}</div>
  ${slidesHTML}
  <div class="footer">
    ${isAr
      ? "تم إنشاء هذا العرض بمساعدة الذكاء الاصطناعي — يتطلب مراجعة طبية متخصصة"
      : "AI-generated presentation — requires specialist medical review"}
  </div>
</body>
</html>`;
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function processHistoryWithAI(
  consultationId: number,
  medicalHistory: string,
  patientName: string,
  symptoms: string,
  language: "en" | "ar"
): Promise<AIProcessingResult> {
  try {
    console.log(`[HistoryAI] Starting AI processing for consultation #${consultationId}`);

    // 1. Generate SBAR report
    console.log(`[HistoryAI] Generating SBAR report...`);
    const sbar = await generateSBARReport(medicalHistory, patientName, symptoms, language);

    // 2. Generate infographic content
    console.log(`[HistoryAI] Generating infographic content...`);
    const infographicContent = await generateInfographicContent(sbar, patientName, language);

    // 3. Generate slide deck content
    console.log(`[HistoryAI] Generating slide deck content...`);
    const slideDeckContent = await generateSlideDeckContent(sbar, patientName, language);

    // 4. Build HTML for infographic and store
    const infographicHTML = buildInfographicHTML(infographicContent, sbar);
    const infographicKey = `infographics/consultation-${consultationId}-${nanoid(8)}.html`;
    const { url: infographicUrl } = await storagePut(
      infographicKey,
      Buffer.from(infographicHTML, "utf-8"),
      "text/html"
    );

    // 5. Build HTML for slide deck and store
    const slideDeckHTML = buildSlideDeckHTML(slideDeckContent, sbar);
    const slideDeckKey = `slide-decks/consultation-${consultationId}-${nanoid(8)}.html`;
    const { url: slideDeckUrl } = await storagePut(
      slideDeckKey,
      Buffer.from(slideDeckHTML, "utf-8"),
      "text/html"
    );

    // 6. Build SBAR report HTML and store
    const isAr = language === "ar";
    const sbarHTML = buildSBARReportHTML(sbar, patientName, consultationId);
    const sbarKey = `reports/sbar-${consultationId}-${nanoid(8)}.html`;
    const { url: sbarReportUrl } = await storagePut(
      sbarKey,
      Buffer.from(sbarHTML, "utf-8"),
      "text/html"
    );

    // 7. Extract confidence from SBAR result
    const confidence = (sbar as any)._confidence ?? 0.7;
    const confidenceLabel = (sbar as any)._confidenceLabel ?? "moderate";
    const requiresHumanReview = (sbar as any)._requiresHumanReview ?? false;
    const disclaimer = (sbar as any)._disclaimer ?? "AI-generated — requires specialist review";

    // 8. Update consultation record (including confidence metadata)
    await db.updateConsultation(consultationId, {
      aiInfographicUrl: infographicUrl,
      aiInfographicContent: JSON.stringify(infographicContent),
      aiSlideDeckUrl: slideDeckUrl,
      aiSlideDeckContent: JSON.stringify(slideDeckContent),
      aiAnalysis: [
        `**SBAR Report**`,
        `**Situation:** ${sbar.situation}`,
        `**Background:** ${sbar.background}`,
        `**Assessment:** ${sbar.assessment}`,
        `**Recommendation:** ${sbar.recommendation}`,
        `**Urgency:** ${sbar.urgencyLevel.toUpperCase()}`,
        `**Key Findings:** ${sbar.keyFindings.join(" | ")}`,
      ].join("\n\n"),
      aiReportUrl: sbarReportUrl,
      aiLastProcessedAt: new Date(),
      status: "specialist_review",
      specialistApprovalStatus: "pending_review",
      aiConfidence: String(confidence),
      aiConfidenceLabel: confidenceLabel,
      aiRequiresHumanReview: requiresHumanReview,
      aiDisclaimer: disclaimer,
    });

    console.log(`[HistoryAI] Processing complete for consultation #${consultationId}`);

    return {
      success: true,
      sbarReport: sbar,
      sbarReportUrl,
      infographicUrl,
      slideDeckUrl,
      confidence,
      confidenceLabel,
      requiresHumanReview,
      disclaimer,
    };

  } catch (error: any) {
    console.error(`[HistoryAI] Error processing consultation #${consultationId}:`, error);
    return {
      success: false,
      error: error?.message || "AI processing failed",
    };
  }
}

// ─── SBAR HTML Builder ────────────────────────────────────────────────────────

function buildSBARReportHTML(sbar: SBARReport, patientName: string, consultationId: number): string {
  const isAr = sbar.language === "ar";
  const urgencyColors: Record<string, string> = {
    low: "#34a853", medium: "#fbbc04", high: "#ea4335", critical: "#b71c1c",
  };
  const urgencyBg: Record<string, string> = {
    low: "#e8f5e9", medium: "#fffde7", high: "#ffebee", critical: "#fce4ec",
  };

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <title>SBAR Report - ${patientName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: ${isAr ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Arial, sans-serif"};
      background: #f8fafc;
      color: #1e293b;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #1a73e8, #0d47a1);
      color: white;
      padding: 28px 32px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
    .header .meta { font-size: 13px; opacity: 0.85; }
    .urgency-banner {
      background: ${urgencyBg[sbar.urgencyLevel]};
      border: 2px solid ${urgencyColors[sbar.urgencyLevel]};
      border-radius: 8px;
      padding: 12px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .urgency-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${urgencyColors[sbar.urgencyLevel]};
      flex-shrink: 0;
    }
    .urgency-text { font-weight: 700; color: ${urgencyColors[sbar.urgencyLevel]}; font-size: 15px; }
    .sbar-section {
      background: white;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      border-${isAr ? "right" : "left"}: 4px solid #1a73e8;
    }
    .sbar-section h2 {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1a73e8;
      margin-bottom: 10px;
    }
    .sbar-section p { font-size: 14px; line-height: 1.7; color: #374151; }
    .key-findings {
      background: white;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .key-findings h2 {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #374151;
      margin-bottom: 12px;
    }
    .findings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }
    .finding-item {
      background: #f1f5f9;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      color: #374151;
    }
    .finding-item::before { content: "✓ "; color: #34a853; font-weight: 700; }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${isAr ? "تقرير SBAR الطبي" : "SBAR Medical Report Brief"}</h1>
    <div class="meta">
      ${isAr ? "المريض" : "Patient"}: ${patientName} &nbsp;|&nbsp;
      ${isAr ? "رقم الاستشارة" : "Consultation"}: #${consultationId} &nbsp;|&nbsp;
      ${new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US")}
    </div>
  </div>

  <div class="urgency-banner">
    <div class="urgency-dot"></div>
    <div>
      <span class="urgency-text">${isAr ? "مستوى الأولوية" : "Urgency Level"}: ${sbar.urgencyLevel.toUpperCase()}</span>
    </div>
  </div>

  <div class="sbar-section">
    <h2>${isAr ? "S — الوضع الحالي" : "S — Situation"}</h2>
    <p>${sbar.situation}</p>
  </div>

  <div class="sbar-section">
    <h2>${isAr ? "B — الخلفية الطبية" : "B — Background"}</h2>
    <p>${sbar.background}</p>
  </div>

  <div class="sbar-section">
    <h2>${isAr ? "A — التقييم" : "A — Assessment"}</h2>
    <p>${sbar.assessment}</p>
  </div>

  <div class="sbar-section">
    <h2>${isAr ? "R — التوصيات" : "R — Recommendation"}</h2>
    <p>${sbar.recommendation}</p>
  </div>

  <div class="key-findings">
    <h2>${isAr ? "النتائج الرئيسية" : "Key Clinical Findings"}</h2>
    <div class="findings-grid">
      ${sbar.keyFindings.map(f => `<div class="finding-item">${f}</div>`).join("")}
    </div>
  </div>

  <div class="footer">
    ${isAr
      ? "تم إنشاء هذا التقرير بمساعدة الذكاء الاصطناعي — يتطلب مراجعة من طبيب متخصص ولا يُعدّ تشخيصاً نهائياً"
      : "AI-generated report — requires specialist medical review and does not constitute a final diagnosis"}
  </div>
</body>
</html>`;
}
