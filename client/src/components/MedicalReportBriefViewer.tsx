/**
 * MedicalReportBriefViewer
 * Displays an AI-generated SBAR medical report brief with:
 *   - Structured SBAR section rendering (if JSON available)
 *   - Fallback iframe for HTML report URL
 *   - Print button
 *   - Download button
 *   - Generation timestamp and AI model badge
 *   - Bilingual label support
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer, Download, ExternalLink, FileBarChart2,
  Maximize2, Minimize2, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── SBAR Structured Data (optional) ─────────────────────────────────────────

interface SBARData {
  situation?: string;
  background?: string;
  assessment?: string;
  recommendation?: string;
  urgencyLevel?: "low" | "medium" | "high" | "critical";
  keyFindings?: string[];
}

interface MedicalReportBriefViewerProps {
  /** URL to the HTML report stored in S3 */
  url: string;
  /** Optional parsed SBAR data for structured rendering */
  sbarData?: SBARData | null;
  /** Plain-text analysis from consultation.aiAnalysis */
  analysisText?: string | null;
  title?: string;
  generatedAt?: Date | string | null;
  language?: "en" | "ar";
  compact?: boolean;
}

const URGENCY_CONFIG = {
  low:      { label: { en: "Low",      ar: "منخفض"  }, bg: "bg-green-100  dark:bg-green-950",  text: "text-green-700  dark:text-green-300",  border: "border-green-300  dark:border-green-700"  },
  medium:   { label: { en: "Medium",   ar: "متوسط"  }, bg: "bg-amber-100  dark:bg-amber-950",  text: "text-amber-700  dark:text-amber-300",  border: "border-amber-300  dark:border-amber-700"  },
  high:     { label: { en: "High",     ar: "عالٍ"   }, bg: "bg-red-100    dark:bg-red-950",    text: "text-red-700    dark:text-red-300",    border: "border-red-300    dark:border-red-700"    },
  critical: { label: { en: "Critical", ar: "حرج"    }, bg: "bg-red-200    dark:bg-red-900",    text: "text-red-900    dark:text-red-100",    border: "border-red-500    dark:border-red-400"    },
};

const SBAR_LABELS = {
  situation:      { en: "S — Situation",      ar: "S — الوضع الحالي"   },
  background:     { en: "B — Background",     ar: "B — الخلفية الطبية" },
  assessment:     { en: "A — Assessment",     ar: "A — التقييم"        },
  recommendation: { en: "R — Recommendation", ar: "R — التوصيات"       },
  keyFindings:    { en: "Key Clinical Findings", ar: "النتائج الرئيسية" },
};

export function MedicalReportBriefViewer({
  url,
  sbarData,
  analysisText,
  title,
  generatedAt,
  language = "en",
  compact = false,
}: MedicalReportBriefViewerProps) {
  const isAr = language === "ar";
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [useIframe, setUseIframe] = useState(false);

  const displayTitle = title || (isAr ? "ملخص التقرير الطبي (SBAR)" : "Medical Report Brief (SBAR)");

  const handlePrint = useCallback(() => {
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => win.print();
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `sbar-report-${Date.now()}.html`;
    a.target = "_blank";
    a.click();
  }, [url]);

  const urgency = sbarData?.urgencyLevel;
  const urgencyCfg = urgency ? URGENCY_CONFIG[urgency] : null;

  const toolbar = (
    <div className={`flex items-center gap-1.5 flex-wrap ${isAr ? "flex-row-reverse" : ""}`}>
      <Badge variant="outline" className="text-xs gap-1">
        <FileBarChart2 className="h-3 w-3" />
        SBAR
      </Badge>
      <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
        AI Generated
      </Badge>
      {urgencyCfg && (
        <Badge className={`text-xs ${urgencyCfg.bg} ${urgencyCfg.text} ${urgencyCfg.border} border`}>
          {isAr ? "الأولوية" : "Urgency"}: {urgencyCfg.label[isAr ? "ar" : "en"]}
        </Badge>
      )}
      {generatedAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(generatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
        </span>
      )}
      <div className="flex-1" />
      {sbarData && (
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setUseIframe(f => !f)} title="Toggle view">
          <FileBarChart2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePrint} title="Print">
        <Printer className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} title="Download">
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Open in new tab">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsFullscreen(f => !f)} title="Fullscreen">
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );

  // ── Structured SBAR renderer ───────────────────────────────────────────────
  const structuredView = sbarData && !useIframe ? (
    <div className={`space-y-3 ${isAr ? "text-right" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {urgencyCfg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${urgencyCfg.bg} ${urgencyCfg.border}`}>
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${urgencyCfg.text.replace("text-", "bg-")}`} />
          <span className={`text-sm font-semibold ${urgencyCfg.text}`}>
            {isAr ? "مستوى الأولوية" : "Urgency Level"}: {urgencyCfg.label[isAr ? "ar" : "en"].toUpperCase()}
          </span>
        </div>
      )}

      {(["situation", "background", "assessment", "recommendation"] as const).map(key => {
        const val = sbarData[key];
        if (!val) return null;
        return (
          <div key={key} className={`p-3 rounded-lg bg-card border border-l-4 border-l-primary ${isAr ? "border-l-0 border-r-4 border-r-primary" : ""}`}>
            <h4 className="text-xs font-bold uppercase tracking-wide text-primary mb-1.5">
              {SBAR_LABELS[key][isAr ? "ar" : "en"]}
            </h4>
            <p className="text-sm text-foreground leading-relaxed">{val}</p>
          </div>
        );
      })}

      {sbarData.keyFindings && sbarData.keyFindings.length > 0 && (
        <div className="p-3 rounded-lg bg-card border">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            {SBAR_LABELS.keyFindings[isAr ? "ar" : "en"]}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sbarData.keyFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-sm">
                <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw analysis toggle */}
      {analysisText && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setShowRaw(r => !r)}
          >
            <span>{isAr ? "عرض التحليل الكامل" : "View Full Analysis"}</span>
            {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showRaw && (
            <div className="px-3 pb-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border-t bg-muted/20">
              {analysisText}
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  // ── Iframe fallback ────────────────────────────────────────────────────────
  const iframeView = (
    <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: isFullscreen ? "calc(100vh - 140px)" : "480px" }}>
      <iframe
        src={url}
        title={displayTitle}
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );

  const content = (
    <div className="space-y-3">
      {toolbar}
      <div style={{ maxHeight: isFullscreen ? "calc(100vh - 140px)" : "520px", overflowY: "auto" }}>
        {structuredView || iframeView}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4 gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base flex-1">{displayTitle}</h3>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? "" : "p-4 rounded-xl border bg-card shadow-sm"}`}>
      <h3 className={`font-semibold text-sm ${isAr ? "text-right" : ""}`}>{displayTitle}</h3>
      {content}
    </div>
  );
}
