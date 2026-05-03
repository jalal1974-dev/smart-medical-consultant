import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Users, FileText, Video, BarChart3, Plus, Upload, Loader2, Brain, ExternalLink, Search, FileDown } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { MindMapVisualization } from "@/components/MindMapVisualization";
import { RegenerateInfographicButton } from "@/components/RegenerateInfographicButton";
import { RegenerateSlidesButton } from "@/components/RegenerateSlidesButton";
import { Link2, Copy, Check, Send, SendHorizonal, MessageSquare, ChevronDown, ChevronUp, RefreshCw, Cpu, FileBarChart2, ImageIcon, PresentationIcon } from "lucide-react";
import { MedicalInfographicViewer } from "@/components/MedicalInfographicViewer";
import { MedicalSlideDeckViewer } from "@/components/MedicalSlideDeckViewer";
import { MedicalReportBriefViewer } from "@/components/MedicalReportBriefViewer";

// ─── AI Processing Section ───────────────────────────────────────────────────
function AIProcessingSection({ consultation }: { consultation: any }) {
  const utils = trpc.useUtils();
  const [isPolling, setIsPolling] = useState(false);

  const processHistoryMutation = trpc.medicalHistory.processHistory.useMutation({
    onSuccess: () => {
      toast.success('AI processing started — this takes 30–60 seconds');
      setIsPolling(true);
      // Poll every 5 seconds for up to 2 minutes
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await utils.admin.consultations.invalidate();
        if (attempts >= 24) {
          clearInterval(interval);
          setIsPolling(false);
        }
      }, 5000);
    },
    onError: (err) => toast.error(err.message || 'Failed to start AI processing'),
  });

  const isProcessing = consultation.status === 'ai_processing' || isPolling;
  const hasOutputs = consultation.aiReportUrl || consultation.aiInfographicUrl || consultation.aiSlideDeckUrl;

  // Only show for consultations that have some data to process
  const canProcess = ['submitted', 'specialist_review', 'needs_deep_analysis'].includes(consultation.status) ||
    (consultation.status === 'ai_processing');

  if (!canProcess && !hasOutputs) return null;

  return (
    <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-800 dark:text-blue-300">
          <Cpu className="h-3.5 w-3.5" />
          AI Report Generation
        </span>
        {isProcessing ? (
          <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing...
          </span>
        ) : hasOutputs ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300">
            ✓ Generated
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Not generated
          </Badge>
        )}
      </div>

      {/* Confidence badge — shown when AI has processed the consultation */}
      {hasOutputs && consultation.aiConfidenceLabel && (() => {
        const label = consultation.aiConfidenceLabel as string;
        const score = consultation.aiConfidence ? Math.round(parseFloat(consultation.aiConfidence) * 100) : null;
        const requiresReview = consultation.aiRequiresHumanReview;
        const colorMap: Record<string, string> = {
          high: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700',
          moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700',
          low: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700',
          uncertain: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700',
        };
        const iconMap: Record<string, string> = { high: '✓', moderate: '~', low: '!', uncertain: '⚠' };
        return (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">AI Confidence:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorMap[label] ?? colorMap.moderate}`}>
              {iconMap[label] ?? '~'} {label.charAt(0).toUpperCase() + label.slice(1)}{score !== null ? ` (${score}%)` : ''}
            </span>
            {requiresReview && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700">
                ⚠ Human Review Required
              </span>
            )}
            {consultation.aiDisclaimer && (
              <span className="text-xs text-muted-foreground italic truncate max-w-xs" title={consultation.aiDisclaimer}>
                {consultation.aiDisclaimer.length > 60 ? consultation.aiDisclaimer.slice(0, 60) + '…' : consultation.aiDisclaimer}
              </span>
            )}
          </div>
        );
      })()}

      {/* Output previews */}
      {hasOutputs && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {consultation.aiReportUrl && (
            <a href={consultation.aiReportUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2 rounded bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900 hover:border-blue-400 transition-colors text-center">
              <FileBarChart2 className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">SBAR Report</span>
            </a>
          )}
          {consultation.aiInfographicUrl && (
            <a href={consultation.aiInfographicUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2 rounded bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900 hover:border-blue-400 transition-colors text-center">
              <ImageIcon className="h-5 w-5 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Infographic</span>
            </a>
          )}
          {consultation.aiSlideDeckUrl && (
            <a href={consultation.aiSlideDeckUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2 rounded bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900 hover:border-blue-400 transition-colors text-center">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-muted-foreground">Slide Deck</span>
            </a>
          )}
        </div>
      )}

      {/* Generate / Regenerate button */}
      {canProcess && !isProcessing && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
          onClick={() => processHistoryMutation.mutate({ consultationId: consultation.id })}
          disabled={processHistoryMutation.isPending}
        >
          {processHistoryMutation.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Starting...</>
          ) : hasOutputs ? (
            <><RefreshCw className="h-3 w-3 mr-1" /> Regenerate AI Reports</>
          ) : (
            <><Brain className="h-3 w-3 mr-1" /> Generate AI Reports (SBAR + Infographic + Slides)</>
          )}
        </Button>
      )}
    </div>
  );
}

// ─── AI-Collected History Card ────────────────────────────────────────────────
function AIHistoryCard({ consultationId }: { consultationId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: session, isLoading } = trpc.medicalHistory.getSessionByConsultation.useQuery(
    { consultationId },
    { retry: false }
  );
  if (isLoading) return null;
  if (!session || !session.collectedHistory) return null;
  return (
    <div className="mt-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
      <button
        type="button"
        className="w-full flex items-center justify-between text-sm font-medium text-emerald-800 dark:text-emerald-300"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          AI-Collected Medical History
          <span className="text-xs font-normal text-muted-foreground ml-1">({session.messageCount} messages · {session.detectedLanguage?.toUpperCase()})</span>
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <p className="mt-2 text-sm text-foreground whitespace-pre-wrap border-t border-emerald-200 dark:border-emerald-800 pt-2">
          {session.collectedHistory}
        </p>
      )}
    </div>
  );
}

// ─── Doctor AI Materials Review Panel ───────────────────────────────────────
function DoctorReviewPanel({ consultation }: { consultation: any }) {
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [overrideUrls, setOverrideUrls] = useState({ report: '', infographic: '', slides: '' });

  const approveAll = trpc.doctorReview.approveAIMaterials.useMutation({
    onSuccess: () => { toast.success('All materials approved and sent to patient'); utils.admin.consultations.invalidate(); setEditOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const editAndApprove = trpc.doctorReview.editAndApprove.useMutation({
    onSuccess: () => { toast.success('Materials approved with notes and sent to patient'); utils.admin.consultations.invalidate(); setEditOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const requestRevision = trpc.doctorReview.requestRevision.useMutation({
    onSuccess: () => { toast.success('Revision requested — patient notified'); utils.admin.consultations.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const overrideManual = trpc.doctorReview.overrideWithManual.useMutation({
    onSuccess: () => { toast.success('Manual materials saved'); utils.admin.consultations.invalidate(); setOverrideOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const hasAnyMaterial = consultation.aiReportUrl || consultation.aiInfographicUrl || consultation.aiSlideDeckUrl;
  const isReviewed = consultation.specialistApprovalStatus === 'approved' || consultation.status === 'doctor_reviewed';

  const exportPDF = trpc.doctorReview.generatePDF.useMutation({
    onSuccess: (data) => {
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
        toast.success('PDF generated — opening in new tab');
      }
    },
    onError: (e) => toast.error('PDF generation failed: ' + e.message),
  });

  if (!['specialist_review', 'ai_processing_complete', 'doctor_reviewed'].includes(consultation.status)) return null;

  return (
    <div className="mt-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
          <Brain className="h-4 w-4" /> AI Materials Review
        </h4>
        <div className="flex items-center gap-2">
          {isReviewed && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">✓ Approved by Doctor</Badge>
          )}
          {hasAnyMaterial && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-400 text-slate-700 dark:text-slate-300 h-7 px-2 text-xs"
              disabled={exportPDF.isPending}
              onClick={() => exportPDF.mutate({ consultationId: consultation.id })}
            >
              {exportPDF.isPending
                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                : <FileDown className="h-3 w-3 mr-1" />}
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {consultation.doctorNotes && (
        <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-sm">
          <strong>Doctor Notes:</strong> {consultation.doctorNotes}
        </div>
      )}

      {!isReviewed && (
        <div className="flex flex-wrap gap-2">
          {/* APPROVE ALL */}
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!hasAnyMaterial || approveAll.isPending}
            onClick={() => {
              if (confirm('Approve all AI materials and send to patient?')) {
                approveAll.mutate({ consultationId: consultation.id });
              }
            }}
          >
            {approveAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            ✓ Approve All
          </Button>

          {/* EDIT & APPROVE */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 dark:text-blue-300" disabled={!hasAnyMaterial}>
                ✏️ Edit & Approve
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit & Approve AI Materials</DialogTitle>
                <DialogDescription>Add doctor notes before sending materials to the patient.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label>Doctor Notes (required)</Label>
                <Textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Add your clinical notes, recommendations, or modifications..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!doctorNotes.trim() || editAndApprove.isPending}
                  onClick={() => editAndApprove.mutate({ consultationId: consultation.id, doctorNotes })}
                >
                  {editAndApprove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Approve & Send
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* REQUEST REVISION */}
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-700 dark:text-amber-300"
            disabled={requestRevision.isPending}
            onClick={() => {
              const reason = prompt('Reason for requesting revision (will be noted):');
              if (reason && reason.trim().length >= 10) {
                requestRevision.mutate({ consultationId: consultation.id, revisionReason: reason.trim() });
              } else if (reason !== null) {
                toast.error('Please provide at least 10 characters for the revision reason.');
              }
            }}
          >
            {requestRevision.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            ↩ Request Revision
          </Button>

          {/* OVERRIDE WITH MANUAL */}
          <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-purple-400 text-purple-700 dark:text-purple-300">
                🔧 Override with Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Override with Manual Materials</DialogTitle>
                <DialogDescription>Replace AI-generated URLs with your own. Leave blank to keep existing.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Manual Report URL</Label>
                  <Input value={overrideUrls.report} onChange={(e) => setOverrideUrls(u => ({ ...u, report: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label>Manual Infographic URL</Label>
                  <Input value={overrideUrls.infographic} onChange={(e) => setOverrideUrls(u => ({ ...u, infographic: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label>Manual Slide Deck URL</Label>
                  <Input value={overrideUrls.slides} onChange={(e) => setOverrideUrls(u => ({ ...u, slides: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label>Doctor Notes</Label>
                  <Textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={overrideManual.isPending}
                  onClick={() => overrideManual.mutate({
                    consultationId: consultation.id,
                    manualReportUrl: overrideUrls.report || undefined,
                    manualInfographicUrl: overrideUrls.infographic || undefined,
                    manualSlideDeckUrl: overrideUrls.slides || undefined,
                    doctorNotes: doctorNotes || undefined,
                  })}
                >
                  {overrideManual.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Save Manual Materials
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* AI Material Previews inside the review panel */}
      {hasAnyMaterial && (
        <div className="space-y-3 pt-2 border-t border-blue-200 dark:border-blue-800">
          {consultation.aiReportUrl && <MedicalReportBriefViewer url={consultation.aiReportUrl} generatedAt={consultation.updatedAt} compact={true} />}
          {consultation.aiInfographicUrl && <MedicalInfographicViewer url={consultation.aiInfographicUrl} generatedAt={consultation.updatedAt} compact={true} />}
          {consultation.aiSlideDeckUrl && <MedicalSlideDeckViewer url={consultation.aiSlideDeckUrl} generatedAt={consultation.updatedAt} compact={true} />}
        </div>
      )}
    </div>
  );
}

// ─── Bulk Approve All Pending Button ────────────────────────────────────────
function BulkApproveAllButton({ consultations }: { consultations: any[] }) {
  const utils = trpc.useUtils();
  const pendingCount = consultations.filter(
    (c) => c.status === 'ai_processing_complete' || c.status === 'specialist_review'
  ).length;

  const bulkApproveMutation = trpc.doctorReview.bulkApproveAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Approved ${data.approvedCount} consultation${data.approvedCount !== 1 ? 's' : ''} and sent reports to patients`);
      utils.admin.consultations.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Bulk approve failed'),
  });

  if (pendingCount === 0) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-green-800 dark:text-green-300">
          {pendingCount} consultation{pendingCount !== 1 ? 's' : ''} ready for approval
        </span>
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          {pendingCount} pending
        </Badge>
      </div>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
        disabled={bulkApproveMutation.isPending}
        onClick={() => {
          if (confirm(`Approve all ${pendingCount} pending consultations and send reports to patients?`)) {
            bulkApproveMutation.mutate();
          }
        }}
      >
        {bulkApproveMutation.isPending ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving...</>
        ) : (
          <><Check className="w-3.5 h-3.5" /> Approve All Pending</>
        )}
      </Button>
    </div>
  );
}

export default function AdminPanel() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [userSearch, setUserSearch] = useState("");
  const [consultationSearch, setConsultationSearch] = useState("");
  const [consultationStatusFilter, setConsultationStatusFilter] = useState("all");
  const [consultationPriorityFilter, setConsultationPriorityFilter] = useState("all");
  const [consultationSort, setConsultationSort] = useState("priority_high");

  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: consultations } = trpc.admin.consultations.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: users } = trpc.admin.users.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: videos } = trpc.admin.videos.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: podcasts } = trpc.admin.podcasts.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<{id: number, type: "video" | "podcast"} | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    type: "video" as "video" | "podcast",
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    mediaUrl: "",
    thumbnailUrl: "",
    duration: "",
  });

  const mediaFileRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  const uploadFile = trpc.upload.file.useMutation();

  // Upload link state for infographic/slides
  const [uploadLinks, setUploadLinks] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  const generateUploadToken = trpc.uploadToken.generate.useMutation({
    onError: (error) => {
      toast.error(`Failed to generate upload link: ${error.message}`);
      setGeneratingLink(null);
    },
  });

  const handleGenerateUploadLink = async (consultationId: number, reportType: 'infographic' | 'slides', patientName: string) => {
    const key = `${consultationId}-${reportType}`;
    setGeneratingLink(key);
    try {
      const result = await generateUploadToken.mutateAsync({ consultationId, reportType });
      const fullUrl = `${window.location.origin}/upload/${result.token}`;
      setUploadLinks(prev => ({ ...prev, [key]: fullUrl }));
      toast.success('Upload link generated! Share it with the designer.');
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleCopyLink = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Replace (direct upload) for infographic and slide deck
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const infographicReplaceRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const slidesReplaceRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadReplaceInfographic = trpc.admin.uploadReplaceInfographic.useMutation({
    onSuccess: () => {
      toast.success('Infographic replaced successfully!');
      utils.admin.consultations.invalidate();
      setReplacingKey(null);
    },
    onError: (err) => {
      toast.error(`Replace failed: ${err.message}`);
      setReplacingKey(null);
    },
  });

  const uploadReplaceSlides = trpc.admin.uploadReplaceSlides.useMutation({
    onSuccess: () => {
      toast.success('Slide deck replaced successfully!');
      utils.admin.consultations.invalidate();
      setReplacingKey(null);
    },
    onError: (err) => {
      toast.error(`Replace failed: ${err.message}`);
      setReplacingKey(null);
    },
  });

  // Send to Patient
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const sendReportToPatient = trpc.admin.sendReportToPatient.useMutation({
    onSuccess: (_, vars) => {
      const types = [
        vars.sendPdf && 'PDF',
        vars.sendInfographic && 'Infographic',
        vars.sendSlides && 'Slide Deck',
        vars.sendMindMap && 'Mind Map',
        vars.sendPptx && 'PPTX',
      ].filter(Boolean).join(', ');
      toast.success(`Sent to patient: ${types}`);
      utils.admin.consultations.invalidate();
      setSendingKey(null);
    },
    onError: (err) => {
      toast.error(`Send failed: ${err.message}`);
      setSendingKey(null);
    },
  });

  const handleReplaceFile = async (
    file: File,
    consultationId: number,
    type: 'infographic' | 'slides'
  ) => {
    const key = `${consultationId}-${type}`;
    setReplacingKey(key);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (type === 'infographic') {
        await uploadReplaceInfographic.mutateAsync({ consultationId, fileBase64: base64, mimeType: file.type });
      } else {
        await uploadReplaceSlides.mutateAsync({ consultationId, fileBase64: base64, mimeType: file.type });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateConsultationStatus = trpc.admin.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Consultation updated");
      utils.admin.consultations.invalidate();
    },
    onError: () => toast.error("Failed to update consultation"),
  });

  const createVideo = trpc.admin.videos.create.useMutation({
    onSuccess: () => {
      toast.success("Video created successfully");
      utils.admin.videos.list.invalidate();
      utils.media.videos.invalidate();
      setMediaDialogOpen(false);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to create video"),
  });

  const createPodcast = trpc.admin.podcasts.create.useMutation({
    onSuccess: () => {
      toast.success("Podcast created successfully");
      utils.admin.podcasts.list.invalidate();
      utils.media.podcasts.invalidate();
      setMediaDialogOpen(false);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to create podcast"),
  });

  const deleteVideo = trpc.admin.videos.delete.useMutation({
    onSuccess: () => {
      toast.success("Video deleted");
      utils.admin.videos.list.invalidate();
      utils.media.videos.invalidate();
    },
    onError: () => toast.error("Failed to delete video"),
  });

  const deletePodcast = trpc.admin.podcasts.delete.useMutation({
    onSuccess: () => {
      toast.success("Podcast deleted");
      utils.admin.podcasts.list.invalidate();
      utils.media.podcasts.invalidate();
    },
    onError: () => toast.error("Failed to delete podcast"),
  });

  const updateVideo = trpc.admin.videos.update.useMutation({
    onSuccess: () => {
      toast.success("Video updated successfully");
      utils.admin.videos.list.invalidate();
      utils.media.videos.invalidate();
      setMediaDialogOpen(false);
      setEditingMedia(null);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to update video"),
  });

  const updatePodcast = trpc.admin.podcasts.update.useMutation({
    onSuccess: () => {
      toast.success("Podcast updated successfully");
      utils.admin.podcasts.list.invalidate();
      utils.media.podcasts.invalidate();
      setMediaDialogOpen(false);
      setEditingMedia(null);
      resetMediaForm();
    },
    onError: () => toast.error("Failed to update podcast"),
  });

  const resetMediaForm = () => {
    setEditingMedia(null);
    setMediaForm({
      type: "video",
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      mediaUrl: "",
      thumbnailUrl: "",
      duration: "",
    });
  };

  const handleMediaFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isVideo = mediaForm.type === "video";
    const validTypes = isVideo
      ? ["video/mp4", "video/webm", "video/ogg"]
      : ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];

    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid file type. Please upload a ${isVideo ? "video" : "audio"} file.`);
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 100MB limit.");
      return;
    }

    setUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1];

        const result = await uploadFile.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64Content,
          category: "other",
        });

        setMediaForm({ ...mediaForm, mediaUrl: result.url });
        toast.success(`${isVideo ? "Video" : "Audio"} uploaded successfully`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload an image (JPEG, PNG, or WebP).");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size exceeds 5MB limit.");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1];

        const result = await uploadFile.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileData: base64Content,
          category: "other",
        });

        setMediaForm({ ...mediaForm, thumbnailUrl: result.url });
        toast.success("Thumbnail uploaded successfully");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleOpenEditDialog = (media: any, type: "video" | "podcast") => {
    setEditingMedia({ id: media.id, type });
    setMediaForm({
      type,
      titleEn: media.titleEn,
      titleAr: media.titleAr,
      descriptionEn: media.descriptionEn || "",
      descriptionAr: media.descriptionAr || "",
      mediaUrl: type === "video" ? media.videoUrl : media.audioUrl,
      thumbnailUrl: media.thumbnailUrl || "",
      duration: media.duration?.toString() || "",
    });
    setMediaDialogOpen(true);
  };

  const handleCreateMedia = () => {
    if (!mediaForm.titleEn || !mediaForm.titleAr || !mediaForm.mediaUrl) {
      toast.error("Please fill in required fields (titles and media file)");
      return;
    }

    const commonData = {
      titleEn: mediaForm.titleEn,
      titleAr: mediaForm.titleAr,
      descriptionEn: mediaForm.descriptionEn || undefined,
      descriptionAr: mediaForm.descriptionAr || undefined,
      thumbnailUrl: mediaForm.thumbnailUrl || undefined,
      duration: mediaForm.duration ? parseInt(mediaForm.duration) : undefined,
    };

    if (editingMedia) {
      // Update existing media
      if (mediaForm.type === "video") {
        updateVideo.mutate({
          id: editingMedia.id,
          ...commonData,
          videoUrl: mediaForm.mediaUrl,
        });
      } else {
        updatePodcast.mutate({
          id: editingMedia.id,
          ...commonData,
          audioUrl: mediaForm.mediaUrl,
        });
      }
    } else {
      // Create new media
      if (mediaForm.type === "video") {
        createVideo.mutate({
          ...commonData,
          videoUrl: mediaForm.mediaUrl,
        });
      } else {
        createPodcast.mutate({
          ...commonData,
          audioUrl: mediaForm.mediaUrl,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen py-12">
        <div className="container max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin")}</CardTitle>
              <CardDescription>Admin access required</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href={getLoginUrl()}>{t("signIn")}</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("admin")}</h1>
          <p className="text-xl text-muted-foreground">Manage consultations, users, and content</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalConsultations")}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConsultations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("pendingConsultations")}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.submittedConsultations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedConsultations}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="consultations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="consultations">{t("consultations")}</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-4">
            {/* ── Search & Filter Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/40 rounded-xl border border-border">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by patient name or email…"
                  value={consultationSearch}
                  onChange={(e) => setConsultationSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {/* Status filter */}
              <Select value={consultationStatusFilter} onValueChange={setConsultationStatusFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="ai_processing">AI Processing</SelectItem>
                  <SelectItem value="ai_processing_complete">AI Complete</SelectItem>
                  <SelectItem value="specialist_review">Specialist Review</SelectItem>
                  <SelectItem value="doctor_reviewed">Doctor Reviewed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {/* Priority filter */}
              <Select value={consultationPriorityFilter} onValueChange={setConsultationPriorityFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="urgent">🟠 Urgent</SelectItem>
                  <SelectItem value="moderate">🟡 Moderate</SelectItem>
                  <SelectItem value="routine">🔵 Routine</SelectItem>
                </SelectContent>
              </Select>
              {/* Sort dropdown */}
              <Select value={consultationSort} onValueChange={setConsultationSort}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority_high">🔴 Priority: High → Low</SelectItem>
                  <SelectItem value="priority_low">🔵 Priority: Low → High</SelectItem>
                  <SelectItem value="newest">🕐 Newest first</SelectItem>
                  <SelectItem value="oldest">🕐 Oldest first</SelectItem>
                </SelectContent>
              </Select>
              {/* Clear button — only shown when any filter is active */}
              {(consultationSearch || consultationStatusFilter !== "all" || consultationPriorityFilter !== "all" || consultationSort !== "priority_high") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setConsultationSearch("");
                    setConsultationStatusFilter("all");
                    setConsultationPriorityFilter("all");
                    setConsultationSort("priority_high");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {/* Result count */}
            {(() => {
              const total = consultations?.length ?? 0;
              const q = consultationSearch.toLowerCase().trim();
              const filtered = (consultations ?? []).filter((c: any) => {
                const matchesSearch = !q ||
                  c.patientName?.toLowerCase().includes(q) ||
                  c.patientEmail?.toLowerCase().includes(q);
                const matchesStatus = consultationStatusFilter === "all" || c.status === consultationStatusFilter;
                const priority = c.sbarUrgencyLevel || c.priority || "routine";
                const matchesPriority = consultationPriorityFilter === "all" || priority === consultationPriorityFilter;
                return matchesSearch && matchesStatus && matchesPriority;
              });
              if (total === 0) return null;
              return (
                <p className="text-sm text-muted-foreground px-1">
                  Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{total}</span> consultation{total !== 1 ? "s" : ""}
                </p>
              );
            })()}

            {/* Helper: priority rank for sorting */}

            {/* Bulk Approve All Pending */}
            <BulkApproveAllButton consultations={consultations ?? []} />

            {(consultations ?? []).filter((c: any) => {
              const q = consultationSearch.toLowerCase().trim();
              const matchesSearch = !q ||
                c.patientName?.toLowerCase().includes(q) ||
                c.patientEmail?.toLowerCase().includes(q);
              const matchesStatus = consultationStatusFilter === "all" || c.status === consultationStatusFilter;
              const priority = c.sbarUrgencyLevel || c.priority || "routine";
              const matchesPriority = consultationPriorityFilter === "all" || priority === consultationPriorityFilter;
              return matchesSearch && matchesStatus && matchesPriority;
            }).sort((a: any, b: any) => {
              const priorityRank: Record<string, number> = { critical: 0, urgent: 1, moderate: 2, routine: 3 };
              const pa = priorityRank[a.sbarUrgencyLevel || a.priority || "routine"] ?? 3;
              const pb = priorityRank[b.sbarUrgencyLevel || b.priority || "routine"] ?? 3;
              if (consultationSort === "priority_high") return pa - pb;
              if (consultationSort === "priority_low") return pb - pa;
              const da = new Date(a.createdAt).getTime();
              const db = new Date(b.createdAt).getTime();
              if (consultationSort === "newest") return db - da;
              if (consultationSort === "oldest") return da - db;
              return 0;
            }).map((consultation) => (
              <Card key={consultation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {consultation.patientName}
                        {/* SBAR Urgency Triage Badge */}
                        {(() => {
                          const c = consultation as any;
                          const urgency = c.sbarUrgencyLevel || c.priority || 'routine';
                          const map: Record<string, { label: string; cls: string; icon: string }> = {
                            critical: { label: 'Critical', cls: 'bg-red-600 text-white', icon: '🔴' },
                            urgent:   { label: 'Urgent',   cls: 'bg-orange-500 text-white', icon: '🟠' },
                            moderate: { label: 'Moderate', cls: 'bg-yellow-500 text-white', icon: '🟡' },
                            routine:  { label: 'Routine',  cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: '🔵' },
                          };
                          const entry = map[urgency] || map.routine;
                          return (
                            <Badge className={`text-xs ${entry.cls}`}>
                              {entry.icon} {entry.label}
                            </Badge>
                          );
                        })()}
                      </CardTitle>
                      <CardDescription>{consultation.patientEmail}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline">{consultation.status}</Badge>
                      {(consultation as any).specialistApprovalStatus && (consultation as any).specialistApprovalStatus !== 'pending_review' && (
                        <Badge variant={(consultation as any).specialistApprovalStatus === 'approved' ? 'default' : 'secondary'}
                          className={(consultation as any).specialistApprovalStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}>
                          {(consultation as any).specialistApprovalStatus === 'approved' ? '✓ Approved' : (consultation as any).specialistApprovalStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm">
                      <strong>Symptoms:</strong> {consultation.symptoms}
                    </p>
                    {consultation.medicalHistory && (
                      <p className="text-sm">
                        <strong>Medical History:</strong> {consultation.medicalHistory}
                      </p>
                    )}
                    {/* AI-Collected History from chat session */}
                    <AIHistoryCard consultationId={consultation.id} />
                    <p className="text-sm text-muted-foreground">
                      Created: {format(new Date(consultation.createdAt), "PPP")}
                    </p>
                    
                    {/* Material Regeneration Indicator */}
                    {consultation.materialsRegeneratedAt && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 mt-2">
                        <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          🔄 Materials Regenerated
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(consultation.materialsRegeneratedAt), "PPp")} 
                          ({consultation.materialsRegeneratedCount || 1}x)
                        </span>
                      </div>
                    )}
                    
                    {/* AI Processing Section */}
                    <AIProcessingSection consultation={consultation} />

                    {/* Doctor AI Materials Review Panel */}
                    <DoctorReviewPanel consultation={consultation} />

                    {/* Mind Map for Research */}
                    {(consultation.status === "ai_processing" || consultation.status === "specialist_review") && (
                      <div className="mt-4">
                        <MindMapVisualization consultationId={consultation.id} />
                      </div>
                    )}
                    
                    {/* Generated Materials */}
                    {consultation.status === "specialist_review" && (
                      <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                        <h4 className="font-semibold text-sm">Generated Materials for Review</h4>
                        
                        {/* PDF Report row */}
                        {consultation.aiReportUrl && (() => {
                          const pdfKey = `${consultation.id}-pdf`;
                          const sent = (consultation as any).sentPdfToPatient;
                          return (
                            <div className={`flex items-center justify-between p-2 rounded ${sent ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-background'}`}>
                              <span className="text-sm flex items-center gap-1">
                                📄 Medical Report
                                {sent && <span className="text-xs text-green-600 font-medium ml-1">✓ Sent</span>}
                              </span>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <a href={consultation.aiReportUrl} target="_blank" rel="noopener noreferrer">View</a>
                                </Button>
                                {!sent && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    disabled={sendingKey === pdfKey}
                                    onClick={() => {
                                      setSendingKey(pdfKey);
                                      sendReportToPatient.mutate({ consultationId: consultation.id, sendPdf: true });
                                    }}
                                  >
                                    {sendingKey === pdfKey ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending...</> : <><Send className="h-3 w-3 mr-1" />Send to Patient</>}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        
                        {(() => {
                          const infKey = `${consultation.id}-infographic`;
                          const infSent = (consultation as any).sentInfographicToPatient;
                          return (
                            <div className="space-y-1">
                              <div className={`flex items-center justify-between p-2 rounded ${infSent ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : consultation.aiInfographicUrl ? 'bg-background' : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'}`}>
                                <span className="text-sm flex items-center gap-1">
                                  📈 {consultation.aiInfographicUrl ? 'Infographic' : 'Infographic (Not Generated)'}
                                  {infSent && <span className="text-xs text-green-600 font-medium ml-1">✓ Sent</span>}
                                </span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {/* Hidden file input for Replace */}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    ref={el => { infographicReplaceRefs.current[consultation.id] = el; }}
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) handleReplaceFile(file, consultation.id, 'infographic');
                                      e.target.value = '';
                                    }}
                                  />
                                  {consultation.aiInfographicUrl && (
                                    <Button size="sm" variant="outline" asChild>
                                      <a href={consultation.aiInfographicUrl} target="_blank" rel="noopener noreferrer">View</a>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                    disabled={replacingKey === infKey}
                                    onClick={() => infographicReplaceRefs.current[consultation.id]?.click()}
                                  >
                                    {replacingKey === infKey ? (
                                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Replacing...</>
                                    ) : (
                                      <><Upload className="h-3 w-3 mr-1" />Replace</>
                                    )}
                                  </Button>
                                  <RegenerateInfographicButton consultationId={consultation.id} />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    disabled={generatingLink === infKey}
                                    onClick={() => handleGenerateUploadLink(consultation.id, 'infographic', consultation.patientName)}
                                  >
                                    {generatingLink === infKey ? (
                                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</>
                                    ) : (
                                      <><Link2 className="h-3 w-3 mr-1" />Upload Link</>
                                    )}
                                  </Button>
                                  {consultation.aiInfographicUrl && !infSent && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      disabled={sendingKey === infKey}
                                      onClick={() => {
                                        setSendingKey(infKey);
                                        sendReportToPatient.mutate({ consultationId: consultation.id, sendInfographic: true });
                                      }}
                                    >
                                      {sendingKey === infKey ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending...</> : <><Send className="h-3 w-3 mr-1" />Send</> }
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {uploadLinks[infKey] && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-xs">
                                  <span className="flex-1 truncate text-blue-700 dark:text-blue-300 font-mono">{uploadLinks[infKey]}</span>
                                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => handleCopyLink(infKey, uploadLinks[infKey])}>
                                    {copiedKey === infKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {(() => {
                          const slideKey = `${consultation.id}-slides`;
                          // Show View/Send for ANY existing URL (including manus-slides:// and .json content)
                          const hasSlidesUrl = !!consultation.aiSlideDeckUrl;
                          const slidesSent = (consultation as any).sentSlidesToPatient;
                          return (
                            <div className="space-y-1">
                              <div className={`flex items-center justify-between p-2 rounded ${slidesSent ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : hasSlidesUrl ? 'bg-background' : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'}`}>
                                <span className="text-sm flex items-center gap-1">
                                  📄 {hasSlidesUrl ? 'Slide Deck' : 'Slide Deck (Not Generated)'}
                                  {slidesSent && <span className="text-xs text-green-600 font-medium ml-1">✓ Sent</span>}
                                </span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {/* Hidden file input for Replace */}
                                  <input
                                    type="file"
                                    accept="application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                    className="hidden"
                                    ref={el => { slidesReplaceRefs.current[consultation.id] = el; }}
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) handleReplaceFile(file, consultation.id, 'slides');
                                      e.target.value = '';
                                    }}
                                  />
                                  {hasSlidesUrl && (
                                    <Button size="sm" variant="outline" asChild>
                                      <a href={consultation.aiSlideDeckUrl || '#'} target="_blank" rel="noopener noreferrer">View</a>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                    disabled={replacingKey === slideKey}
                                    onClick={() => slidesReplaceRefs.current[consultation.id]?.click()}
                                  >
                                    {replacingKey === slideKey ? (
                                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Replacing...</>
                                    ) : (
                                      <><Upload className="h-3 w-3 mr-1" />Replace</>
                                    )}
                                  </Button>
                                  <RegenerateSlidesButton consultationId={consultation.id} />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    disabled={generatingLink === slideKey}
                                    onClick={() => handleGenerateUploadLink(consultation.id, 'slides', consultation.patientName)}
                                  >
                                    {generatingLink === slideKey ? (
                                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</>
                                    ) : (
                                      <><Link2 className="h-3 w-3 mr-1" />Upload Link</>
                                    )}
                                  </Button>
                                  {hasSlidesUrl && !slidesSent && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      disabled={sendingKey === slideKey}
                                      onClick={() => {
                                        setSendingKey(slideKey);
                                        sendReportToPatient.mutate({ consultationId: consultation.id, sendSlides: true });
                                      }}
                                    >
                                      {sendingKey === slideKey
                                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending...</>
                                        : <><Send className="h-3 w-3 mr-1" />Send to Patient</>}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {uploadLinks[slideKey] && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-xs">
                                  <span className="flex-1 truncate text-blue-700 dark:text-blue-300 font-mono">{uploadLinks[slideKey]}</span>
                                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => handleCopyLink(slideKey, uploadLinks[slideKey])}>
                                    {copiedKey === slideKey ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {consultation.specialistApprovalStatus === "pending_review" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              onClick={() => {
                                updateConsultationStatus.mutate({
                                  id: consultation.id,
                                  status: "completed",
                                });
                              }}
                            >
                              ✓ Approve All
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => {
                                const reason = prompt("Rejection reason:");
                                if (reason) {
                                  // TODO: Add rejection mutation
                                  toast.info("Rejection functionality coming soon");
                                }
                              }}
                            >
                              ✗ Reject
                            </Button>
                          </div>
                        )}
                        
                        {consultation.specialistApprovalStatus && (
                          <Badge variant={consultation.specialistApprovalStatus === "approved" ? "default" : "secondary"}>
                            {consultation.specialistApprovalStatus}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* ── AI Material Viewers (Admin Preview) ── */}
                    {(consultation.aiReportUrl || consultation.aiInfographicUrl || consultation.aiSlideDeckUrl) && (
                      <div className="mt-4 space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">AI Report Previews</h4>
                        {consultation.aiReportUrl && (
                          <MedicalReportBriefViewer
                            url={consultation.aiReportUrl}
                            generatedAt={consultation.updatedAt}
                            compact={false}
                          />
                        )}
                        {consultation.aiInfographicUrl && (
                          <MedicalInfographicViewer
                            url={consultation.aiInfographicUrl}
                            generatedAt={consultation.updatedAt}
                            compact={false}
                          />
                        )}
                        {consultation.aiSlideDeckUrl && (
                          <MedicalSlideDeckViewer
                            url={consultation.aiSlideDeckUrl}
                            generatedAt={consultation.updatedAt}
                            compact={false}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select
                      defaultValue={consultation.status}
                      onValueChange={(value) =>
                        updateConsultationStatus.mutate({
                          id: consultation.id,
                          status: value as any,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="ai_processing">AI Processing</SelectItem>
                        <SelectItem value="specialist_review">Specialist Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "ar" ? "ابحث بالاسم أو البريد الإلكتروني..." : "Search by name or email..."}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {users?.filter((u) => {
              if (!userSearch.trim()) return true;
              const q = userSearch.toLowerCase();
              return (
                (u.name || "").toLowerCase().includes(q) ||
                (u.email || "").toLowerCase().includes(q)
              );
            }).map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{user.name || "Unnamed User"}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/patient/${user.id}`)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          {language === "ar" ? "ملف المريض" : "Patient Page"}
                        </Button>
                      )}
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Joined: {format(new Date(user.createdAt), "PPP")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Media
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingMedia ? "Edit Media" : "Add New Media"}</DialogTitle>
                  <DialogDescription>{editingMedia ? "Update media details and thumbnail" : "Upload a video or podcast with bilingual content"}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                      value={mediaForm.type}
                      onValueChange={(value) => setMediaForm({ ...mediaForm, type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="podcast">Podcast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Title (English) *</Label>
                    <Input
                      value={mediaForm.titleEn}
                      onChange={(e) => setMediaForm({ ...mediaForm, titleEn: e.target.value })}
                      placeholder="Enter English title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Title (Arabic) *</Label>
                    <Input
                      value={mediaForm.titleAr}
                      onChange={(e) => setMediaForm({ ...mediaForm, titleAr: e.target.value })}
                      placeholder="أدخل العنوان بالعربية"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (English)</Label>
                    <Textarea
                      value={mediaForm.descriptionEn}
                      onChange={(e) => setMediaForm({ ...mediaForm, descriptionEn: e.target.value })}
                      placeholder="Enter English description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Arabic)</Label>
                    <Textarea
                      value={mediaForm.descriptionAr}
                      onChange={(e) => setMediaForm({ ...mediaForm, descriptionAr: e.target.value })}
                      placeholder="أدخل الوصف بالعربية"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{mediaForm.type === "video" ? "Video" : "Audio"} File *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={mediaForm.mediaUrl}
                        onChange={(e) => setMediaForm({ ...mediaForm, mediaUrl: e.target.value })}
                        placeholder="Or paste URL directly"
                      />
                      <input
                        ref={mediaFileRef}
                        type="file"
                        accept={mediaForm.type === "video" ? "video/*" : "audio/*"}
                        onChange={handleMediaFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => mediaFileRef.current?.click()}
                        disabled={uploadingMedia}
                      >
                        {uploadingMedia ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a file (max 100MB) or paste a URL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Thumbnail Image</Label>
                    <div className="flex gap-2">
                      <Input
                        value={mediaForm.thumbnailUrl}
                        onChange={(e) => setMediaForm({ ...mediaForm, thumbnailUrl: e.target.value })}
                        placeholder="Or paste image URL"
                      />
                      <input
                        ref={thumbnailFileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => thumbnailFileRef.current?.click()}
                        disabled={uploadingThumbnail}
                      >
                        {uploadingThumbnail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {mediaForm.thumbnailUrl && (
                      <img
                        src={mediaForm.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={mediaForm.duration}
                      onChange={(e) => setMediaForm({ ...mediaForm, duration: e.target.value })}
                      placeholder="e.g., 180 for 3 minutes"
                    />
                  </div>

                  <Button
                    onClick={handleCreateMedia}
                    disabled={createVideo.isPending || createPodcast.isPending || updateVideo.isPending || updatePodcast.isPending || uploadingMedia || uploadingThumbnail}
                    className="w-full"
                  >
                    {createVideo.isPending || createPodcast.isPending || updateVideo.isPending || updatePodcast.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingMedia ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingMedia ? `Update ${mediaForm.type === "video" ? "Video" : "Podcast"}` : `Create ${mediaForm.type === "video" ? "Video" : "Podcast"}`
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Videos Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Videos ({videos?.length || 0})</h3>
              {videos?.map((video) => (
                <Card key={video.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">
                          {language === "en" ? video.titleEn : video.titleAr}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {language === "en" ? video.descriptionEn : video.descriptionAr}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Video</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.titleEn}
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}
                      <div className="text-sm text-muted-foreground">
                        <p>Views: {video.views}</p>
                        {video.duration && <p>Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(video.videoUrl, "_blank")}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditDialog(video, "video")}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this video?")) {
                            deleteVideo.mutate({ id: video.id });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Podcasts Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Podcasts ({podcasts?.length || 0})</h3>
              {podcasts?.map((podcast) => (
                <Card key={podcast.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">
                          {language === "en" ? podcast.titleEn : podcast.titleAr}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {language === "en" ? podcast.descriptionEn : podcast.descriptionAr}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Podcast</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {podcast.thumbnailUrl && (
                        <img
                          src={podcast.thumbnailUrl}
                          alt={podcast.titleEn}
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}
                      <div className="text-sm text-muted-foreground">
                        <p>Views: {podcast.views}</p>
                        {podcast.duration && <p>Duration: {Math.floor(podcast.duration / 60)}:{(podcast.duration % 60).toString().padStart(2, '0')}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(podcast.audioUrl, "_blank")}
                      >
                        Listen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditDialog(podcast, "podcast")}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this podcast?")) {
                            deletePodcast.mutate({ id: podcast.id });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
