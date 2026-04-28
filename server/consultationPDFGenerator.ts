/**
 * consultationPDFGenerator.ts
 * Server-side PDF generation for consultation export using PDFKit.
 * Produces a structured multi-section PDF:
 *   1. Cover page (patient info, consultation metadata, urgency badge)
 *   2. SBAR Medical Report (parsed from stored HTML/JSON or raw text)
 *   3. AI Confidence & Disclaimer section
 *   4. Infographic reference (URL + QR-style note)
 *   5. Slide Deck reference (URL + download note)
 *   6. Doctor Notes (if present)
 *   7. Footer with timestamp and disclaimer
 */

import PDFDocument from "pdfkit";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { consultations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsultationForPDF {
  id: number;
  patientName: string;
  patientEmail?: string | null;
  symptoms: string;
  medicalHistory?: string | null;
  priority?: string | null;
  status: string;
  createdAt: Date | number;
  updatedAt?: Date | number | null;
  aiReportUrl?: string | null;
  aiInfographicUrl?: string | null;
  aiSlideDeckUrl?: string | null;
  aiConfidence?: string | null;
  aiConfidenceLabel?: string | null;
  aiRequiresHumanReview?: boolean | null;
  aiDisclaimer?: string | null;
  doctorNotes?: string | null;
  specialistName?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: Date | number | null | undefined): string {
  if (!ts) return "N/A";
  const d = typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceColor(label: string | null | undefined): string {
  switch ((label ?? "").toLowerCase()) {
    case "high":      return "#16a34a"; // green-600
    case "moderate":  return "#ca8a04"; // yellow-600
    case "low":       return "#ea580c"; // orange-600
    case "uncertain": return "#dc2626"; // red-600
    default:          return "#6b7280"; // gray-500
  }
}

function priorityLabel(p: string | null | undefined): string {
  switch ((p ?? "routine").toLowerCase()) {
    case "critical": return "🔴 CRITICAL";
    case "urgent":   return "🟠 URGENT";
    case "moderate": return "🟡 MODERATE";
    default:         return "🔵 ROUTINE";
  }
}

/**
 * Strip HTML tags from a string for plain-text embedding in PDF.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Fetch SBAR report text from a URL (S3 HTML or plain text).
 * Returns stripped plain text or a fallback message.
 */
async function fetchReportText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return `[Could not load report: HTTP ${res.status}]`;
    const text = await res.text();
    // If it looks like HTML, strip tags
    if (text.trim().startsWith("<")) return stripHtml(text);
    // If it looks like JSON, try to extract content
    if (text.trim().startsWith("{")) {
      const json = JSON.parse(text);
      const content =
        json.content ?? json.report ?? json.text ?? json.sbar ?? JSON.stringify(json, null, 2);
      return typeof content === "string" ? stripHtml(content) : JSON.stringify(content, null, 2);
    }
    return text;
  } catch {
    return "[Report content could not be loaded — please use the online viewer]";
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate a PDF for the given consultation and upload it to S3.
 * Returns the public S3 URL of the generated PDF.
 */
export async function generateConsultationPDF(
  consultation: ConsultationForPDF
): Promise<string> {
  // Fetch SBAR report text if available
  let reportText = "";
  if (consultation.aiReportUrl) {
    reportText = await fetchReportText(consultation.aiReportUrl);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: {
        Title: `Medical Consultation Report — ${consultation.patientName}`,
        Author: "Smart Medical Consultant",
        Subject: "AI-Generated Medical Consultation Report",
        Creator: "Smart Medical Consultant Platform",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const key = `reports/consultation-${consultation.id}-${Date.now()}.pdf`;
        const { url } = await storagePut(key, pdfBuffer, "application/pdf");
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });

    // ── Color palette ──────────────────────────────────────────────────────
    const PRIMARY   = "#0f4c81"; // deep medical blue
    const ACCENT    = "#10b981"; // emerald
    const LIGHT_BG  = "#f0f7ff";
    const GRAY      = "#6b7280";
    const TEXT      = "#1f2937";
    const WHITE     = "#ffffff";

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const marginL = 60;
    const marginR = 60;
    const contentW = pageW - marginL - marginR;

    // ── Helper: section header ─────────────────────────────────────────────
    function sectionHeader(title: string) {
      doc.moveDown(0.5);
      doc
        .rect(marginL, doc.y, contentW, 22)
        .fill(PRIMARY);
      doc
        .fillColor(WHITE)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(title, marginL + 8, doc.y - 18, { width: contentW - 16 });
      doc.fillColor(TEXT).font("Helvetica").fontSize(10);
      doc.moveDown(0.8);
    }

    // ── Helper: key-value row ──────────────────────────────────────────────
    function kvRow(key: string, value: string, color?: string) {
      const y = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(GRAY)
        .text(key.toUpperCase(), marginL, y, { width: 130, continued: false });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(color ?? TEXT)
        .text(value, marginL + 140, y, { width: contentW - 140 });
      doc.moveDown(0.4);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1 — COVER
    // ─────────────────────────────────────────────────────────────────────────

    // Header band
    doc.rect(0, 0, pageW, 90).fill(PRIMARY);
    doc
      .fillColor(WHITE)
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("Smart Medical Consultant", marginL, 22, { width: contentW });
    doc
      .fontSize(11)
      .font("Helvetica")
      .text("AI-Powered Medical Consultation Report", marginL, 52, { width: contentW });

    // Consultation ID badge
    doc
      .rect(pageW - marginR - 120, 18, 120, 52)
      .fill("#1e6bb8");
    doc
      .fillColor(WHITE)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("CONSULTATION ID", pageW - marginR - 115, 24, { width: 110, align: "center" });
    doc
      .fontSize(16)
      .text(`#${consultation.id}`, pageW - marginR - 115, 36, { width: 110, align: "center" });

    doc.moveDown(3);

    // Light blue info card
    doc
      .rect(marginL, doc.y, contentW, 130)
      .fill(LIGHT_BG);

    const cardY = doc.y + 12;
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(14)
      .text(consultation.patientName, marginL + 12, cardY, { width: contentW - 24 });

    doc.font("Helvetica").fontSize(10).fillColor(GRAY)
      .text(consultation.patientEmail ?? "", marginL + 12, cardY + 22, { width: contentW - 24 });

    // Priority badge
    const pLabel = priorityLabel(consultation.priority);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT)
      .text(`Priority: ${pLabel}`, marginL + 12, cardY + 42, { width: contentW - 24 });

    doc.font("Helvetica").fontSize(10).fillColor(GRAY)
      .text(`Submitted: ${formatDate(consultation.createdAt)}`, marginL + 12, cardY + 62, { width: contentW - 24 })
      .text(`Status: ${consultation.status.replace(/_/g, " ").toUpperCase()}`, marginL + 12, cardY + 80, { width: contentW - 24 });

    doc.y = cardY + 130;
    doc.moveDown(1);

    // ── Symptoms ──────────────────────────────────────────────────────────
    sectionHeader("SYMPTOMS & CHIEF COMPLAINT");
    doc.font("Helvetica").fontSize(10).fillColor(TEXT)
      .text(consultation.symptoms || "Not provided", marginL, doc.y, { width: contentW });
    doc.moveDown(0.8);

    // ── Medical History ───────────────────────────────────────────────────
    if (consultation.medicalHistory) {
      sectionHeader("MEDICAL HISTORY");
      doc.font("Helvetica").fontSize(10).fillColor(TEXT)
        .text(consultation.medicalHistory, marginL, doc.y, { width: contentW });
      doc.moveDown(0.8);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2 — SBAR MEDICAL REPORT
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();

    // Page header
    doc.rect(0, 0, pageW, 40).fill(PRIMARY);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(13)
      .text("SBAR Medical Report", marginL, 13, { width: contentW });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(`Generated: ${formatDate(consultation.updatedAt ?? consultation.createdAt)}  |  Consultation #${consultation.id}`,
        marginL, 26, { width: contentW });

    doc.moveDown(2);

    if (reportText) {
      // Try to split into SBAR sections
      const sbarSections = ["Situation", "Background", "Assessment", "Recommendation"];
      let remaining = reportText;

      for (const section of sbarSections) {
        const regex = new RegExp(`(${section}[:\\s])`, "i");
        const match = remaining.match(regex);
        if (match && match.index !== undefined) {
          const before = remaining.slice(0, match.index).trim();
          if (before) {
            doc.font("Helvetica").fontSize(10).fillColor(TEXT)
              .text(before, marginL, doc.y, { width: contentW });
            doc.moveDown(0.5);
          }
          remaining = remaining.slice(match.index);

          // Find next section start
          let end = remaining.length;
          for (const next of sbarSections) {
            if (next === section) continue;
            const nMatch = remaining.slice(section.length).search(new RegExp(`(${next}[:\\s])`, "i"));
            if (nMatch !== -1 && nMatch + section.length < end) {
              end = nMatch + section.length;
            }
          }

          const sectionContent = remaining.slice(0, end);
          remaining = remaining.slice(end);

          // Check page space
          if (doc.y > pageH - 120) doc.addPage();

          // Section label
          doc.rect(marginL, doc.y, 4, 16).fill(ACCENT);
          doc.font("Helvetica-Bold").fontSize(12).fillColor(PRIMARY)
            .text(section.toUpperCase(), marginL + 10, doc.y - 14, { width: contentW - 10 });
          doc.moveDown(0.3);
          doc.font("Helvetica").fontSize(10).fillColor(TEXT)
            .text(sectionContent.replace(regex, "").trim(), marginL, doc.y, { width: contentW });
          doc.moveDown(0.8);
        }
      }

      // Any remaining text
      if (remaining.trim()) {
        if (doc.y > pageH - 120) doc.addPage();
        doc.font("Helvetica").fontSize(10).fillColor(TEXT)
          .text(remaining.trim(), marginL, doc.y, { width: contentW });
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(GRAY)
        .text("No SBAR report has been generated yet for this consultation.", marginL, doc.y, { width: contentW });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 3 — AI CONFIDENCE + MATERIALS LINKS + DOCTOR NOTES
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();

    doc.rect(0, 0, pageW, 40).fill(PRIMARY);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(13)
      .text("AI Analysis Metadata & Generated Materials", marginL, 13, { width: contentW });

    doc.moveDown(2);

    // AI Confidence
    sectionHeader("AI CONFIDENCE ASSESSMENT");
    if (consultation.aiConfidenceLabel) {
      const confScore = consultation.aiConfidence
        ? ` (${Math.round(parseFloat(consultation.aiConfidence) * 100)}%)`
        : "";
      const confColor = confidenceColor(consultation.aiConfidenceLabel);
      kvRow("Confidence Level", `${consultation.aiConfidenceLabel.toUpperCase()}${confScore}`, confColor);
      if (consultation.aiRequiresHumanReview) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#dc2626")
          .text("⚠  Human specialist review is required for this consultation.", marginL, doc.y, { width: contentW });
        doc.moveDown(0.5);
      }
      if (consultation.aiDisclaimer) {
        doc.font("Helvetica").fontSize(9).fillColor(GRAY)
          .text(consultation.aiDisclaimer, marginL, doc.y, { width: contentW });
        doc.moveDown(0.5);
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(GRAY)
        .text("AI processing has not been run for this consultation.", marginL, doc.y, { width: contentW });
    }

    doc.moveDown(0.5);

    // Generated Materials
    sectionHeader("GENERATED MATERIALS");
    doc.font("Helvetica").fontSize(10).fillColor(TEXT)
      .text("The following AI-generated materials are available online. Click the links below or scan the QR code to access them:", marginL, doc.y, { width: contentW });
    doc.moveDown(0.5);

    if (consultation.aiReportUrl) {
      kvRow("SBAR Report (HTML)", consultation.aiReportUrl);
    }
    if (consultation.aiInfographicUrl) {
      kvRow("Medical Infographic", consultation.aiInfographicUrl);
    }
    if (consultation.aiSlideDeckUrl) {
      kvRow("Slide Deck", consultation.aiSlideDeckUrl);
    }
    if (!consultation.aiReportUrl && !consultation.aiInfographicUrl && !consultation.aiSlideDeckUrl) {
      doc.font("Helvetica").fontSize(10).fillColor(GRAY)
        .text("No AI-generated materials are available yet.", marginL, doc.y, { width: contentW });
    }

    doc.moveDown(0.8);

    // Doctor Notes
    if (consultation.doctorNotes) {
      sectionHeader("SPECIALIST DOCTOR NOTES");
      doc.font("Helvetica").fontSize(10).fillColor(TEXT)
        .text(consultation.doctorNotes, marginL, doc.y, { width: contentW });
      doc.moveDown(0.8);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FOOTER on all pages
    // ─────────────────────────────────────────────────────────────────────────
    const totalPages = (doc as any).bufferedPageRange?.()?.count ?? 3;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc
        .rect(0, pageH - 36, pageW, 36)
        .fill("#f3f4f6");
      doc
        .fillColor(GRAY)
        .font("Helvetica")
        .fontSize(7)
        .text(
          "DISCLAIMER: This report is AI-generated for informational purposes only and does not constitute medical advice. " +
          "Always consult a qualified healthcare professional for diagnosis and treatment decisions.",
          marginL, pageH - 28, { width: contentW - 80 }
        );
      doc
        .fillColor(GRAY)
        .fontSize(7)
        .text(
          `Page ${i + 1} of ${totalPages}  |  Smart Medical Consultant  |  ${formatDate(new Date())}`,
          pageW - marginR - 120, pageH - 28, { width: 120, align: "right" }
        );
    }

    doc.end();
  });
}

// ─── DB helper: save PDF URL back to consultation ─────────────────────────────

export async function saveConsultationPDFUrl(
  consultationId: number,
  pdfUrl: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(consultations)
    .set({ aiReportUrl: pdfUrl, updatedAt: new Date() })
    .where(eq(consultations.id, consultationId));
}
