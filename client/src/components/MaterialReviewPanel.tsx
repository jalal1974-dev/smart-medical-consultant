/**
 * MaterialReviewPanel
 *
 * Renders three material rows (Report, Infographic, Slide Deck) for a consultation.
 * Each row shows:
 *   - Current status (approved / pending / missing)
 *   - View / Download button (if URL exists)
 *   - Approve button (sends patient email + marks approved)
 *   - Replace button (upload a new file, resets approval)
 *   - Patient-page visibility indicator
 *   - Regenerate button for infographic and slide deck
 */

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, XCircle, Download, Eye, RefreshCw, Upload, Brain } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Consultation = {
  id: number;
  patientName: string;
  preferredLanguage: string;
  aiReportUrl?: string | null;
  aiInfographicUrl?: string | null;
  aiSlideDeckUrl?: string | null;
  reportApproved?: boolean;
  infographicApproved?: boolean;
  slideDeckApproved?: boolean;
  reportApprovedAt?: Date | string | null;
  infographicApprovedAt?: Date | string | null;
  slideDeckApprovedAt?: Date | string | null;
};

type Material = "report" | "infographic" | "slideDeck";

interface MaterialRowProps {
  label: string;
  icon: string;
  url?: string | null;
  approved?: boolean;
  approvedAt?: Date | string | null;
  consultationId: number;
  material: Material;
  onApproved: () => void;
  onReplaced: () => void;
  /** Extra action button (e.g. Regenerate) */
  extraAction?: React.ReactNode;
}

function MaterialRow({
  label,
  icon,
  url,
  approved,
  approvedAt,
  consultationId,
  material,
  onApproved,
  onReplaced,
  extraAction,
}: MaterialRowProps) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);

  const approveMutation = trpc.admin.approveMaterial.useMutation({
    onSuccess: () => {
      toast.success(`${label} approved — patient notified by email.`);
      onApproved();
      utils.admin.consultations.invalidate();
    },
    onError: (err) => toast.error(`Approval failed: ${err.message}`),
  });

  const replaceMutation = trpc.admin.replaceMaterial.useMutation({
    onSuccess: (data) => {
      toast.success(`${label} replaced. Approval reset — please review and re-approve.`);
      onReplaced();
      utils.admin.consultations.invalidate();
    },
    onError: (err) => toast.error(`Replace failed: ${err.message}`),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 20 MB
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 20 MB.");
      return;
    }

    setReplacing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = (ev.target?.result as string).split(",")[1];
        await replaceMutation.mutateAsync({
          consultationId,
          material,
          fileBase64: base64Data,
          fileName: file.name,
          mimeType: file.type,
        });
        setReplacing(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file.");
        setReplacing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setReplacing(false);
    }
  };

  const statusBadge = approved ? (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Approved
    </Badge>
  ) : url ? (
    <Badge variant="outline" className="flex items-center gap-1 text-amber-700 border-amber-400">
      <Clock className="h-3 w-3" />
      Pending Review
    </Badge>
  ) : (
    <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
      <XCircle className="h-3 w-3" />
      Not Generated
    </Badge>
  );

  // Patient-page visibility: visible if approved AND url exists
  const patientCanSee = approved && !!url;

  return (
    <div className="p-3 bg-background rounded-lg border space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
          {statusBadge}
          {/* Patient visibility indicator */}
          <span
            title={patientCanSee ? "Visible on patient record page" : "Not yet visible to patient"}
            className={`text-xs px-1.5 py-0.5 rounded-full border ${
              patientCanSee
                ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {patientCanSee ? "👁 Patient can see" : "🔒 Hidden from patient"}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {/* View / Download */}
          {url && (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <a
                href={url}
                target={url.endsWith(".pptx") || url.endsWith(".pdf") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                download={url.endsWith(".pptx") || url.endsWith(".pdf")}
              >
                {url.endsWith(".pptx") || url.endsWith(".pdf") ? (
                  <><Download className="h-3 w-3 mr-1" />Download</>
                ) : (
                  <><Eye className="h-3 w-3 mr-1" />View</>
                )}
              </a>
            </Button>
          )}

          {/* Approve */}
          {url && !approved && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs bg-green-600 hover:bg-green-700"
              disabled={approveMutation.isPending}
              onClick={() => {
                if (confirm(`Approve this ${label} and notify the patient by email?`)) {
                  approveMutation.mutate({ consultationId, material });
                }
              }}
            >
              {approveMutation.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Approving...</>
              ) : (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Approve & Notify</>
              )}
            </Button>
          )}

          {/* Re-approve after replacement */}
          {url && approved && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700 border-green-400"
              disabled={approveMutation.isPending}
              onClick={() => {
                if (confirm(`Re-send approval notification to patient for ${label}?`)) {
                  approveMutation.mutate({ consultationId, material });
                }
              }}
            >
              {approveMutation.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending...</>
              ) : (
                <><RefreshCw className="h-3 w-3 mr-1" />Re-notify</>
              )}
            </Button>
          )}

          {/* Replace */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={replacing || replaceMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            title="Upload a replacement file (resets approval)"
          >
            {replacing || replaceMutation.isPending ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="h-3 w-3 mr-1" />Replace</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={
              material === "report"
                ? ".pdf,.doc,.docx"
                : material === "infographic"
                ? ".svg,.png,.jpg,.jpeg,.webp"
                : ".pptx,.ppt,.pdf"
            }
            onChange={handleFileSelect}
          />

          {/* Extra action (e.g. Regenerate) */}
          {extraAction}
        </div>
      </div>

      {approved && approvedAt && (
        <p className="text-xs text-muted-foreground">
          Approved {new Date(approvedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

interface MaterialReviewPanelProps {
  consultation: Consultation;
}

export function MaterialReviewPanel({ consultation }: MaterialReviewPanelProps) {
  const utils = trpc.useUtils();

  const generatePptx = trpc.admin.generatePptx.useMutation({
    onSuccess: () => {
      toast.success("PPTX slide deck generated successfully!");
      utils.admin.consultations.invalidate();
    },
    onError: (err) => toast.error(`Failed to generate PPTX: ${err.message}`),
  });

  const regenerateInfographic = trpc.admin.regenerateInfographic.useMutation({
    onSuccess: () => {
      toast.success("Infographic regenerated!");
      utils.admin.consultations.invalidate();
    },
    onError: (err) => toast.error(`Failed to regenerate: ${err.message}`),
  });

  const refresh = () => utils.admin.consultations.invalidate();

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        📋 Materials Review
        <span className="text-xs font-normal text-muted-foreground">
          — Approve each item separately to notify the patient
        </span>
      </h4>

      {/* Medical Report */}
      <MaterialRow
        label="Medical Report"
        icon="📄"
        url={consultation.aiReportUrl}
        approved={consultation.reportApproved}
        approvedAt={consultation.reportApprovedAt}
        consultationId={consultation.id}
        material="report"
        onApproved={refresh}
        onReplaced={refresh}
      />

      {/* Infographic */}
      <MaterialRow
        label="Medical Infographic"
        icon="📊"
        url={consultation.aiInfographicUrl}
        approved={consultation.infographicApproved}
        approvedAt={consultation.infographicApprovedAt}
        consultationId={consultation.id}
        material="infographic"
        onApproved={refresh}
        onReplaced={refresh}
        extraAction={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={regenerateInfographic.isPending}
            onClick={() => regenerateInfographic.mutate({ consultationId: consultation.id })}
            title="Regenerate infographic using AI"
          >
            {regenerateInfographic.isPending ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Regenerating...</>
            ) : (
              <><Brain className="h-3 w-3 mr-1" />Regen</>
            )}
          </Button>
        }
      />

      {/* Slide Deck */}
      <MaterialRow
        label="Slide Deck (PPTX)"
        icon="📽️"
        url={consultation.aiSlideDeckUrl}
        approved={consultation.slideDeckApproved}
        approvedAt={consultation.slideDeckApprovedAt}
        consultationId={consultation.id}
        material="slideDeck"
        onApproved={refresh}
        onReplaced={refresh}
        extraAction={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={generatePptx.isPending}
            onClick={() => generatePptx.mutate({ consultationId: consultation.id })}
            title="Generate / regenerate PPTX via Python API"
          >
            {generatePptx.isPending ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</>
            ) : (
              <><Brain className="h-3 w-3 mr-1" />{consultation.aiSlideDeckUrl ? "Regen" : "Generate"} PPTX</>
            )}
          </Button>
        }
      />
    </div>
  );
}
