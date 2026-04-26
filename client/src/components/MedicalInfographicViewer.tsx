/**
 * MedicalInfographicViewer
 * Displays an AI-generated medical infographic (HTML or image URL) with:
 *   - Zoom in/out controls
 *   - Fullscreen mode
 *   - Download button
 *   - Bilingual label support
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, Download, ExternalLink,
  ImageIcon, RotateCcw,
} from "lucide-react";

interface MedicalInfographicViewerProps {
  url: string;
  title?: string;
  description?: string;
  generatedAt?: Date | string | null;
  language?: "en" | "ar";
  /** If true the component renders in a compact card (no fullscreen overlay) */
  compact?: boolean;
}

export function MedicalInfographicViewer({
  url,
  title,
  description,
  generatedAt,
  language = "en",
  compact = false,
}: MedicalInfographicViewerProps) {
  const isAr = language === "ar";
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHTML = url.endsWith(".html") || url.includes("text/html") || url.includes(".html?");
  const isImage = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url);

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-infographic-${Date.now()}.${isHTML ? "html" : "png"}`;
    a.target = "_blank";
    a.click();
  }, [url, isHTML]);

  const displayTitle = title || (isAr ? "الإنفوجرافيك الطبي" : "Medical Infographic");

  const toolbar = (
    <div className={`flex items-center gap-1.5 flex-wrap ${isAr ? "flex-row-reverse" : ""}`}>
      <Badge variant="outline" className="text-xs gap-1">
        <ImageIcon className="h-3 w-3" />
        {isAr ? "إنفوجرافيك" : "Infographic"}
      </Badge>
      {generatedAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(generatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
        </span>
      )}
      <div className="flex-1" />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} title="Zoom out">
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomIn} title="Zoom in">
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetZoom} title="Reset zoom">
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
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

  const viewer = (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border bg-muted/30"
      style={{ maxHeight: isFullscreen ? "calc(100vh - 120px)" : "480px" }}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
          width: `${100 / zoom}%`,
          transition: "transform 0.15s ease",
        }}
      >
        {isHTML ? (
          <iframe
            src={url}
            title={displayTitle}
            className="w-full border-0"
            style={{ minHeight: "420px", height: "520px" }}
            sandbox="allow-same-origin"
          />
        ) : isImage ? (
          <img
            src={url}
            alt={displayTitle}
            className="w-full object-contain"
            style={{ maxHeight: "520px" }}
          />
        ) : (
          /* Fallback: treat as iframe */
          <iframe
            src={url}
            title={displayTitle}
            className="w-full border-0"
            style={{ minHeight: "420px", height: "520px" }}
          />
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4 gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base flex-1">{displayTitle}</h3>
          {toolbar}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="flex-1 overflow-auto">
          {viewer}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? "" : "p-4 rounded-xl border bg-card shadow-sm"}`}>
      <div className="flex items-center gap-2">
        <h3 className={`font-semibold text-sm flex-1 ${isAr ? "text-right" : ""}`}>{displayTitle}</h3>
      </div>
      {toolbar}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {viewer}
    </div>
  );
}
