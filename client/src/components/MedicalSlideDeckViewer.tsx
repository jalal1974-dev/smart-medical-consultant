/**
 * MedicalSlideDeckViewer
 * Displays an AI-generated medical slide deck (HTML, PDF, or PPTX URL) with:
 *   - Paginated navigation for HTML slide decks (scrolls to each slide)
 *   - Fullscreen mode
 *   - Download button
 *   - Bilingual label support
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Download,
  ExternalLink, Presentation, FileText,
} from "lucide-react";

interface MedicalSlideDeckViewerProps {
  url: string;
  title?: string;
  slideCount?: number;
  generatedAt?: Date | string | null;
  language?: "en" | "ar";
  compact?: boolean;
}

export function MedicalSlideDeckViewer({
  url,
  title,
  slideCount,
  generatedAt,
  language = "en",
  compact = false,
}: MedicalSlideDeckViewerProps) {
  const isAr = language === "ar";
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPDF = /\.pdf(\?|$)/i.test(url);
  const isPPTX = /\.pptx?(\?|$)/i.test(url);
  const isHTML = !isPDF && !isPPTX;

  const totalSlides = slideCount || 6; // default for AI-generated decks

  const displayTitle = title || (isAr ? "العرض التقديمي الطبي" : "Medical Slide Deck");

  const scrollToSlide = useCallback((slideNum: number) => {
    if (!iframeRef.current || !isHTML) return;
    try {
      const iframeDoc = iframeRef.current.contentDocument;
      if (!iframeDoc) return;
      const slideEl = iframeDoc.getElementById(`slide-${slideNum}`);
      if (slideEl) {
        slideEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      // cross-origin iframe — can't scroll programmatically, use hash
      iframeRef.current.src = `${url}#slide-${slideNum}`;
    }
  }, [url, isHTML]);

  const goToSlide = (n: number) => {
    const clamped = Math.max(1, Math.min(n, totalSlides));
    setCurrentSlide(clamped);
    scrollToSlide(clamped);
  };

  const handleDownload = useCallback(() => {
    const ext = isPDF ? "pdf" : isPPTX ? "pptx" : "html";
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-slides-${Date.now()}.${ext}`;
    a.target = "_blank";
    a.click();
  }, [url, isPDF, isPPTX]);

  const toolbar = (
    <div className={`flex items-center gap-1.5 flex-wrap ${isAr ? "flex-row-reverse" : ""}`}>
      <Badge variant="outline" className="text-xs gap-1">
        {isPDF ? <FileText className="h-3 w-3" /> : <Presentation className="h-3 w-3" />}
        {isPDF ? "PDF" : isPPTX ? "PPTX" : (isAr ? "شرائح" : "Slides")}
      </Badge>
      {generatedAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(generatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
        </span>
      )}
      <div className="flex-1" />

      {/* Slide navigation (only for HTML decks) */}
      {isHTML && (
        <div className="flex items-center gap-1">
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide <= 1}
          >
            {isAr ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
          <span className="text-xs text-muted-foreground min-w-[48px] text-center">
            {currentSlide} / {totalSlides}
          </span>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide >= totalSlides}
          >
            {isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsFullscreen(f => !f)} title="Fullscreen">
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} title="Download">
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Open in new tab">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );

  // Slide dot navigation
  const dotNav = isHTML && (
    <div className="flex items-center justify-center gap-1 pt-1 flex-wrap">
      {Array.from({ length: totalSlides }, (_, i) => (
        <button
          key={i + 1}
          onClick={() => goToSlide(i + 1)}
          className={`rounded-full transition-all ${
            currentSlide === i + 1
              ? "w-4 h-2 bg-primary"
              : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
          }`}
          title={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );

  const viewer = (
    <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: isFullscreen ? "calc(100vh - 140px)" : "480px" }}>
      {isPDF ? (
        <iframe
          src={`${url}#toolbar=1&navpanes=1`}
          title={displayTitle}
          className="w-full h-full border-0"
        />
      ) : isPPTX ? (
        /* PPTX: use Office Online viewer as fallback */
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <Presentation className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "ملف PowerPoint — انقر لفتحه أو تنزيله"
              : "PowerPoint file — click to open or download"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              {isAr ? "تنزيل" : "Download"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                {isAr ? "فتح" : "Open"}
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={url}
          title={displayTitle}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
        />
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4 gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base flex-1">{displayTitle}</h3>
          {toolbar}
        </div>
        {viewer}
        {dotNav}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? "" : "p-4 rounded-xl border bg-card shadow-sm"}`}>
      <div className="flex items-center gap-2">
        <h3 className={`font-semibold text-sm flex-1 ${isAr ? "text-right" : ""}`}>{displayTitle}</h3>
      </div>
      {toolbar}
      {viewer}
      {dotNav}
    </div>
  );
}
