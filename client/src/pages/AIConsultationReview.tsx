import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, FileText, Image, Presentation, Network, Loader2, AlertCircle, Paperclip, File, FlaskConical, RefreshCw, ExternalLink, Upload, Link, Copy, X as XIcon } from "lucide-react";
import { format } from "date-fns";

// ─── Attached Records sub-component for admin ───────────────────────────────
const ADMIN_RECORD_ICONS: Record<string, React.ReactNode> = {
  medical_report: <FileText className="w-3.5 h-3.5 text-blue-500" />,
  lab_result: <FlaskConical className="w-3.5 h-3.5 text-purple-500" />,
  xray: <Image className="w-3.5 h-3.5 text-teal-500" />,
  other: <File className="w-3.5 h-3.5 text-gray-500" />,
};

function AttachedRecordsAdminCard({ consultationId, language }: { consultationId: number; language: string }) {
  const isAr = language === "ar";
  const { data: attached, isLoading } = trpc.consultation.getAttachedRecords.useQuery(
    { consultationId },
    { enabled: !!consultationId }
  );

  if (isLoading || !attached || attached.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-blue-500" />
          {isAr ? "سجلات من ملف المريض" : "Records from Patient Vault"}
          <span className="text-xs font-normal text-muted-foreground">({attached.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {attached.map((rec: any) => (
            <a
              key={rec.id}
              href={rec.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-accent transition-colors"
            >
              {ADMIN_RECORD_ICONS[rec.category] ?? <File className="w-3.5 h-3.5" />}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{rec.fileName}</p>
                <p className="text-xs text-muted-foreground capitalize">{rec.category.replace('_', ' ')}</p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AIConsultationReview() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: consultations, isLoading } = trpc.admin.consultations.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const [selectedConsultation, setSelectedConsultation] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploadLink, setUploadLink] = useState<{ url: string; reportType: string; expiresAt: number } | null>(null);

  // ── Progress tracking + AbortController for long AI operations ─────────────────
  type ProgressState = { step: string; detail?: string } | null;
  const [progress, setProgress] = useState<Record<string, ProgressState>>({});
  // Store one AbortController per operation key so Cancel can abort the fetch
  const abortRefs = useRef<Record<string, AbortController>>({});

  const setStep = (key: string, step: string, detail?: string) => {
    // Create a fresh AbortController for this operation
    const ac = new AbortController();
    abortRefs.current[key] = ac;
    setProgress(p => ({ ...p, [key]: { step, detail } }));
    return ac.signal;
  };
  const clearStep = (key: string) => {
    delete abortRefs.current[key];
    setProgress(p => { const n = { ...p }; delete n[key]; return n; });
  };
  const cancelStep = (key: string) => {
    abortRefs.current[key]?.abort();
    clearStep(key);
    toast.info(language === 'ar' ? 'تم إلغاء العملية' : 'Operation cancelled');
  };

  // Retry-in-toast helper
  const toastError = (msg: string, retryFn?: () => void) => {
    toast.error(msg, {
      duration: 8000,
      action: retryFn ? {
        label: language === "ar" ? "إعادة المحاولة" : "Retry",
        onClick: retryFn,
      } : undefined,
    });
  };

  const generateUploadToken = trpc.uploadToken.generate.useMutation({
    onSuccess: (data, vars) => {
      const url = `${window.location.origin}/upload/${data.token}`;
      setUploadLink({ url, reportType: vars.reportType, expiresAt: data.expiresAt });
    },
    onError: (e) => toast.error(language === "ar" ? `فشل: ${e.message}` : `Failed: ${e.message}`),
  });

  // ── Regeneration mutations ──────────────────────────────────────────────────
  const regenInfographic = trpc.admin.regenerateInfographic.useMutation({
    onMutate: () => setStep('infographic', language === 'ar' ? 'جاري توليد الصورة…' : 'Generating image…', language === 'ar' ? 'قد يستغرق حتى 90 ثانية' : 'May take up to 90 seconds'),
    onSuccess: () => { clearStep('infographic'); toast.success(language === 'ar' ? 'تم إعادة توليد الإنفوجرافيك بنجاح' : 'Infographic regenerated successfully'); utils.admin.consultations.invalidate(); },
    onError: (e, vars) => { clearStep('infographic'); toastError(language === 'ar' ? `فشل: ${e.message}` : `Failed: ${e.message}`, () => regenInfographic.mutate(vars)); },
  });

  const regenPdf = trpc.admin.regeneratePdf.useMutation({
    onMutate: () => setStep('pdf', language === 'ar' ? 'جاري توليد تقرير PDF…' : 'Generating PDF report…'),
    onSuccess: () => { clearStep('pdf'); toast.success(language === 'ar' ? 'تم إعادة توليد تقرير PDF بنجاح' : 'PDF report regenerated successfully'); utils.admin.consultations.invalidate(); },
    onError: (e, vars) => { clearStep('pdf'); toastError(language === 'ar' ? `فشل: ${e.message}` : `Failed: ${e.message}`, () => regenPdf.mutate(vars)); },
  });

  const regenSlides = trpc.admin.regenerateSlides.useMutation({
    onMutate: () => setStep('slides', language === 'ar' ? 'جاري توليد العرض التقديمي…' : 'Generating slide deck…', language === 'ar' ? 'قد يستغرق حتى 60 ثانية' : 'May take up to 60 seconds'),
    onSuccess: () => { clearStep('slides'); toast.success(language === 'ar' ? 'تم إعادة توليد العرض التقديمي بنجاح' : 'Slide deck regenerated successfully'); utils.admin.consultations.invalidate(); },
    onError: (e, vars) => { clearStep('slides'); toastError(language === 'ar' ? `فشل: ${e.message}` : `Failed: ${e.message}`, () => regenSlides.mutate(vars)); },
  });

  const regenMindMap = trpc.admin.regenerateMindMap.useMutation({
    onMutate: () => setStep('mindmap', language === 'ar' ? 'جاري توليد الخريطة الذهنية…' : 'Generating mind map…'),
    onSuccess: () => { clearStep('mindmap'); toast.success(language === 'ar' ? 'تم إعادة توليد الخريطة الذهنية بنجاح' : 'Mind map regenerated successfully'); utils.admin.consultations.invalidate(); },
    onError: (e, vars) => { clearStep('mindmap'); toastError(language === 'ar' ? `فشل: ${e.message}` : `Failed: ${e.message}`, () => regenMindMap.mutate(vars)); },
  });

  const regenAll = trpc.admin.regenerateAllReports.useMutation({
    onMutate: () => {
      setStep('infographic', language === 'ar' ? 'جاري توليد الإنفوجرافيك…' : 'Generating infographic…');
      setStep('pdf', language === 'ar' ? 'جاري توليد PDF…' : 'Generating PDF…');
      setStep('slides', language === 'ar' ? 'جاري توليد العرض…' : 'Generating slides…');
      setStep('mindmap', language === 'ar' ? 'جاري توليد الخريطة…' : 'Generating mind map…');
    },
    onSuccess: () => {
      ['infographic','pdf','slides','mindmap'].forEach(clearStep);
      toast.success(language === 'ar' ? 'تم إعادة توليد جميع التقارير بنجاح' : 'All reports regenerated successfully');
      utils.admin.consultations.invalidate();
    },
    onError: (e, vars) => {
      ['infographic','pdf','slides','mindmap'].forEach(clearStep);
      toastError(language === 'ar' ? `فشل: ${e.message}` : `Failed: ${e.message}`, () => regenAll.mutate(vars));
    },
  });

  const isAnyRegenPending = regenInfographic.isPending || regenPdf.isPending || regenSlides.isPending || regenMindMap.isPending || regenAll.isPending;

  // ── Upload-replace mutations ──────────────────────────────────────────────────
  const uploadPdf = trpc.admin.uploadReplacePdf.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم استبدال تقرير PDF بنجاح" : "PDF report replaced successfully");
      utils.admin.consultations.invalidate();
    },
    onError: (e) => toast.error(language === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const uploadSlides = trpc.admin.uploadReplaceSlides.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم استبدال العرض التقديمي بنجاح" : "Slide deck replaced successfully");
      utils.admin.consultations.invalidate();
    },
    onError: (e) => toast.error(language === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const uploadMindMap = trpc.admin.uploadReplaceMindMap.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم استبدال الخريطة الذهنية بنجاح" : "Mind map replaced successfully");
      utils.admin.consultations.invalidate();
    },
    onError: (e) => toast.error(language === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const uploadInfographic = trpc.admin.uploadReplaceInfographic.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم استبدال الإنفوجرافيك بنجاح" : "Infographic replaced successfully");
      utils.admin.consultations.invalidate();
    },
    onError: (e) => toast.error(language === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const uploadPptx = trpc.admin.uploadReplacePptx.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم رفع PPTX بنجاح" : "PPTX uploaded successfully");
      utils.admin.consultations.invalidate();
    },
    onError: (e) => toast.error(language === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const generatePptx = trpc.admin.generatePptxReport.useMutation({
    onMutate: () => setStep('pptx', language === 'ar' ? 'جاري توليد تقرير PPTX…' : 'Generating PPTX report…', language === 'ar' ? 'قد يستغرق حتى 90 ثانية' : 'May take up to 90 seconds'),
    onSuccess: (data, vars) => {
      clearStep('pptx');
      toast.success(language === 'ar' ? 'تم توليد PPTX بنجاح' : 'PPTX generated successfully');
      utils.admin.consultations.invalidate();
      if (data?.pptxUrl) {
        const a = document.createElement('a');
        a.href = data.pptxUrl;
        a.download = `consultation-${Date.now()}.pptx`;
        a.click();
      }
    },
    onError: (e, vars) => { clearStep('pptx'); toastError(language === 'ar' ? `فشل التوليد: ${e.message}` : `Generation failed: ${e.message}`, () => generatePptx.mutate(vars)); },
  });

  // Helper: read file as base64
  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePdfUpload = (consultationId: number) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/pdf';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        toast.error(language === "ar" ? "حجم الملف يتجاوز 50 ميغابايت" : "File exceeds 50 MB limit");
        return;
      }
      try {
        const base64 = await readFileAsBase64(file);
        uploadPdf.mutate({ consultationId, fileBase64: base64, fileName: file.name });
      } catch { toast.error(language === "ar" ? "فشل قراءة الملف" : "Failed to read file"); }
    };
    inp.click();
  };

  const handleSlidesUpload = (consultationId: number) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        toast.error(language === "ar" ? "حجم الملف يتجاوز 50 ميغابايت" : "File exceeds 50 MB limit");
        return;
      }
      try {
        const base64 = await readFileAsBase64(file);
        uploadSlides.mutate({ consultationId, fileBase64: base64, mimeType: file.type, fileName: file.name });
      } catch { toast.error(language === "ar" ? "فشل قراءة الملف" : "Failed to read file"); }
    };
    inp.click();
  };

  const handleMindMapUpload = (consultationId: number) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error(language === "ar" ? "حجم الملف يتجاوز 10 ميغابايت" : "File exceeds 10 MB limit");
        return;
      }
      try {
        const base64 = await readFileAsBase64(file);
        uploadMindMap.mutate({ consultationId, fileBase64: base64, mimeType: file.type, fileName: file.name });
      } catch { toast.error(language === "ar" ? "فشل قراءة الملف" : "Failed to read file"); }
    };
    inp.click();
  };

  const handleInfographicUpload = (consultationId: number) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error(language === "ar" ? "حجم الملف يتجاوز 10 ميغابايت" : "File exceeds 10 MB limit");
        return;
      }
      try {
        const base64 = await readFileAsBase64(file);
        uploadInfographic.mutate({ consultationId, fileBase64: base64, mimeType: file.type, fileName: file.name });
      } catch { toast.error(language === "ar" ? "فشل قراءة الملف" : "Failed to read file"); }
    };
    inp.click();
  };

  const handlePptxUpload = (consultationId: number) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        toast.error(language === "ar" ? "حجم الملف يتجاوز 50 ميغابايت" : "File exceeds 50 MB limit");
        return;
      }
      try {
        const base64 = await readFileAsBase64(file);
        uploadPptx.mutate({ consultationId, fileBase64: base64, fileName: file.name });
      } catch { toast.error(language === "ar" ? "فشل قراءة الملف" : "Failed to read file"); }
    };
    inp.click();
  };

  const approveAIContent = trpc.admin.approveAIContent.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تمت الموافقة على المحتوى" : "Content approved");
      utils.admin.consultations.invalidate();
      setSelectedConsultation(null);
      setApprovalNotes("");
    },
    onError: () => toast.error(language === "ar" ? "فشلت الموافقة" : "Approval failed"),
  });

  const rejectAIContent = trpc.admin.rejectAIContent.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم رفض المحتوى وإعادة المعالجة" : "Content rejected and reprocessing");
      utils.admin.consultations.invalidate();
      setSelectedConsultation(null);
      setRejectionReason("");
    },
    onError: () => toast.error(language === "ar" ? "فشل الرفض" : "Rejection failed"),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">{language === "ar" ? "يرجى تسجيل الدخول" : "Please Sign In"}</h2>
        <Button asChild>
          <a href={getLoginUrl()}>{language === "ar" ? "تسجيل الدخول" : "Sign In"}</a>
        </Button>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold">{language === "ar" ? "غير مصرح" : "Unauthorized"}</h2>
        <p className="text-muted-foreground">
          {language === "ar" ? "ليس لديك صلاحية للوصول إلى هذه الصفحة" : "You don't have permission to access this page"}
        </p>
      </div>
    );
  }

  // Filter consultations that need review and sort by priority
  const priorityOrder = { critical: 0, urgent: 1, routine: 2 };
  const pendingReview = (consultations?.filter(
    c => c.status === "specialist_review" && c.specialistApprovalStatus === "pending_review"
  ) || []).sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority || 'routine'] - priorityOrder[b.priority || 'routine'];
    if (priorityDiff !== 0) return priorityDiff;
    // If same priority, sort by creation date (oldest first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Helper function to get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1">🔴 {language === "ar" ? "حرج" : "Critical"}</Badge>;
      case 'urgent':
        return <Badge variant="default" className="gap-1 bg-orange-500">🟠 {language === "ar" ? "عاجل" : "Urgent"}</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">🔵 {language === "ar" ? "روتيني" : "Routine"}</Badge>;
    }
  };

  const selected = consultations?.find(c => c.id === selectedConsultation);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {language === "ar" ? "مراجعة الاستشارات الطبية بالذكاء الاصطناعي" : "AI Medical Consultation Review"}
        </h1>
        <p className="text-muted-foreground">
          {language === "ar" 
            ? "مراجعة والموافقة على التحليلات الطبية التي تم إنشاؤها بواسطة الذكاء الاصطناعي"
            : "Review and approve AI-generated medical analyses"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : pendingReview.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {language === "ar" ? "لا توجد استشارات معلقة" : "No Pending Reviews"}
            </h3>
            <p className="text-muted-foreground">
              {language === "ar" 
                ? "جميع الاستشارات تمت مراجعتها"
                : "All consultations have been reviewed"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Consultation List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              {language === "ar" ? "قائمة الانتظار" : "Review Queue"} ({pendingReview.length})
            </h2>
            {pendingReview.map(consultation => (
              <Card
                key={consultation.id}
                className={`cursor-pointer transition-all ${
                  selectedConsultation === consultation.id ? "ring-2 ring-primary" : "hover:shadow-md"
                }`}
                onClick={() => setSelectedConsultation(consultation.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">#{consultation.id} - {consultation.patientName}</CardTitle>
                  <CardDescription className="text-sm">
                    {format(new Date(consultation.createdAt), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getPriorityBadge(consultation.priority || 'routine')}
                    <Badge variant="secondary">
                      {consultation.preferredLanguage === "ar" ? "العربية" : "English"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {consultation.symptoms}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Consultation Details & Review */}
          <div className="lg:col-span-2">
            {!selected ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {language === "ar" 
                      ? "اختر استشارة من القائمة للمراجعة"
                      : "Select a consultation from the list to review"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Patient Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "ar" ? "معلومات المريض" : "Patient Information"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "ar" ? "الاسم" : "Name"}
                        </p>
                        <p className="font-medium">{selected.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {language === "ar" ? "البريد الإلكتروني" : "Email"}
                        </p>
                        <p className="font-medium">{selected.patientEmail}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {language === "ar" ? "الأعراض" : "Symptoms"}
                      </p>
                      <p className="text-sm">{selected.symptoms}</p>
                    </div>
                    {selected.medicalHistory && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {language === "ar" ? "التاريخ الطبي" : "Medical History"}
                        </p>
                        <p className="text-sm">{selected.medicalHistory}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Uploaded Medical Documents */}
                {(selected.medicalReports || selected.labResults || selected.xrayImages || selected.otherDocuments) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{language === "ar" ? "المستندات الطبية المرفقة" : "Uploaded Medical Documents"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {selected.medicalReports && JSON.parse(selected.medicalReports).map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{language === "ar" ? `تقرير طبي ${idx + 1}` : `Medical Report ${idx + 1}`}</span>
                          </a>
                        ))}
                        {selected.labResults && JSON.parse(selected.labResults).map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{language === "ar" ? `نتيجة تحليل ${idx + 1}` : `Lab Result ${idx + 1}`}</span>
                          </a>
                        ))}
                        {selected.xrayImages && JSON.parse(selected.xrayImages).map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{language === "ar" ? `صورة أشعة ${idx + 1}` : `X-ray Image ${idx + 1}`}</span>
                          </a>
                        ))}
                        {selected.otherDocuments && JSON.parse(selected.otherDocuments).map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{language === "ar" ? `مستند ${idx + 1}` : `Document ${idx + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Attached Records from Patient Vault */}
                <AttachedRecordsAdminCard consultationId={selected.id} language={language} />

                {/* AI Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "ar" ? "التحليل الطبي بالذكاء الاصطناعي" : "AI Medical Analysis"}</CardTitle>
                    <CardDescription>
                      {language === "ar" ? "محاولة المعالجة" : "Processing Attempt"}: {selected.aiProcessingAttempts || 1}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap text-sm">{selected.aiAnalysis || "No analysis available"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Generated Content — with per-report regenerate buttons */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>{language === "ar" ? "التقارير المُنشأة" : "Generated Reports"}</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isAnyRegenPending || !selected.aiAnalysis}
                        onClick={() => {
                          if (confirm(language === "ar" ? "إعادة توليد جميع التقارير؟ قد يستغرق هذا دقيقة." : "Regenerate ALL reports? This may take a minute.")) {
                            regenAll.mutate({ consultationId: selected.id });
                          }
                        }}
                        className="gap-1.5"
                      >
                        {regenAll.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {language === "ar" ? "إعادة توليد الكل" : "Regenerate All"}
                      </Button>
                    </div>
                    {!selected.aiAnalysis && (
                      <p className="text-xs text-destructive mt-1">
                        {language === "ar" ? "التحليل الطبي غير متاح — لا يمكن إعادة التوليد" : "AI analysis unavailable — regeneration disabled"}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* ── Active progress banners with Cancel button ── */}
                      {Object.entries(progress).map(([key, state]) => state && (
                        <div key={key} className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{state.step}</span>
                            {state.detail && <span className="ml-2 text-xs opacity-70">{state.detail}</span>}
                          </div>
                          <button
                            onClick={() => cancelStep(key)}
                            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 transition-colors border border-blue-200 dark:border-blue-700"
                            title={language === 'ar' ? 'إلغاء' : 'Cancel'}
                          >
                            <XIcon className="w-3 h-3" />
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ))}

                      {/* PDF Report row */}
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{language === "ar" ? "تقرير PDF" : "PDF Report"}</p>
                          {selected.aiReportUrl
                            ? <a href={selected.aiReportUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <ExternalLink className="w-3 h-3" />{language === "ar" ? "فتح" : "Open"}
                              </a>
                            : <p className="text-xs text-muted-foreground">{language === "ar" ? "غير متاح" : "Not generated"}</p>
                          }
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadPdf.isPending}
                            onClick={() => handlePdfUpload(selected.id)}
                            className="gap-1.5"
                            title={language === "ar" ? "استبدال بملف PDF مخصص" : "Replace with custom PDF"}
                          >
                            {uploadPdf.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {language === "ar" ? "استبدال" : "Replace"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={regenPdf.isPending || !selected.aiAnalysis}
                            onClick={() => regenPdf.mutate({ consultationId: selected.id })}
                            className="gap-1.5"
                          >
                            {regenPdf.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {language === "ar" ? "إعادة توليد" : "Regenerate"}
                          </Button>
                        </div>
                      </div>

                      {/* Infographic row */}
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="shrink-0">
                          {selected.aiInfographicUrl
                            ? <a href={selected.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                                <img src={selected.aiInfographicUrl} alt="infographic" className="w-12 h-12 object-cover rounded border" />
                              </a>
                            : <Image className="w-5 h-5 text-primary" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{language === "ar" ? "إنفوجرافيك" : "Infographic"}</p>
                          {selected.aiInfographicUrl
                            ? <a href={selected.aiInfographicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <ExternalLink className="w-3 h-3" />{language === "ar" ? "فتح" : "Open"}
                              </a>
                            : <p className="text-xs text-muted-foreground">{language === "ar" ? "غير متاح" : "Not generated"}</p>
                          }
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={generateUploadToken.isPending}
                            onClick={() => generateUploadToken.mutate({ consultationId: selected.id, reportType: 'infographic' })}
                            className="gap-1.5"
                            title={language === "ar" ? "إنشاء رابط رفع خارجي" : "Generate external upload link"}
                          >
                            {generateUploadToken.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                            {language === "ar" ? "رابط رفع" : "Upload Link"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadInfographic.isPending}
                            onClick={() => handleInfographicUpload(selected.id)}
                            className="gap-1.5"
                            title={language === "ar" ? "استبدال بصورة مخصصة" : "Replace with custom image"}
                          >
                            {uploadInfographic.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {language === "ar" ? "استبدال" : "Replace"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={regenInfographic.isPending || !selected.aiAnalysis}
                            onClick={() => regenInfographic.mutate({ consultationId: selected.id })}
                            className="gap-1.5"
                          >
                            {regenInfographic.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {language === "ar" ? "إعادة توليد" : "Regenerate"}
                          </Button>
                        </div>
                      </div>

                      {/* Slide Deck row */}
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Presentation className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{language === "ar" ? "عرض تقديمي (AI)" : "Slide Deck (AI)"}</p>
                          {selected.aiSlideDeckUrl
                            ? <a href={selected.aiSlideDeckUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <ExternalLink className="w-3 h-3" />{language === "ar" ? "فتح" : "Open"}
                              </a>
                            : <p className="text-xs text-muted-foreground">{language === "ar" ? "غير متاح" : "Not generated"}</p>
                          }
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={generateUploadToken.isPending}
                            onClick={() => generateUploadToken.mutate({ consultationId: selected.id, reportType: 'slides' })}
                            className="gap-1.5"
                            title={language === "ar" ? "إنشاء رابط رفع خارجي" : "Generate external upload link"}
                          >
                            {generateUploadToken.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                            {language === "ar" ? "رابط رفع" : "Upload Link"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadSlides.isPending}
                            onClick={() => handleSlidesUpload(selected.id)}
                            className="gap-1.5"
                            title={language === "ar" ? "استبدال بملف PDF أو PPTX مخصص" : "Replace with custom PDF or PPTX"}
                          >
                            {uploadSlides.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {language === "ar" ? "استبدال" : "Replace"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={regenSlides.isPending || !selected.aiAnalysis}
                            onClick={() => regenSlides.mutate({ consultationId: selected.id })}
                            className="gap-1.5"
                          >
                            {regenSlides.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {language === "ar" ? "إعادة توليد" : "Regenerate"}
                          </Button>
                        </div>
                      </div>

                      {/* PPTX Report row */}
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{language === "ar" ? "تقرير PPTX" : "PPTX Report"}</p>
                          {(selected as any).pptxReportUrl
                            ? <a href={(selected as any).pptxReportUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <ExternalLink className="w-3 h-3" />{language === "ar" ? "تحميل" : "Download"}
                              </a>
                            : <p className="text-xs text-muted-foreground">{language === "ar" ? "غير متاح" : "Not generated"}</p>
                          }
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={generateUploadToken.isPending}
                            onClick={() => generateUploadToken.mutate({ consultationId: selected.id, reportType: 'pptx' })}
                            className="gap-1.5"
                            title={language === "ar" ? "إنشاء رابط رفع خارجي" : "Generate external upload link"}
                          >
                            {generateUploadToken.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                            {language === "ar" ? "رابط رفع" : "Upload Link"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadPptx.isPending}
                            onClick={() => handlePptxUpload(selected.id)}
                            className="gap-1.5"
                            title={language === "ar" ? "رفع PPTX مخصص" : "Upload custom PPTX"}
                          >
                            {uploadPptx.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {language === "ar" ? "رفع" : "Upload"}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={generatePptx.isPending}
                            onClick={() => generatePptx.mutate({ consultationId: selected.id })}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {generatePptx.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                            {language === "ar" ? "توليد PPTX" : "Generate PPTX"}
                          </Button>
                        </div>
                      </div>

                      {/* Mind Map row */}
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Network className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{language === "ar" ? "خريطة ذهنية" : "Mind Map"}</p>
                          {selected.aiMindMapUrl
                            ? <a href={selected.aiMindMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                                <ExternalLink className="w-3 h-3" />{language === "ar" ? "فتح" : "Open"}
                              </a>
                            : <p className="text-xs text-muted-foreground">{language === "ar" ? "غير متاح" : "Not generated"}</p>
                          }
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadMindMap.isPending}
                            onClick={() => handleMindMapUpload(selected.id)}
                            className="gap-1.5"
                            title={language === "ar" ? "استبدال بصورة مخصصة" : "Replace with custom image"}
                          >
                            {uploadMindMap.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {language === "ar" ? "استبدال" : "Replace"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={regenMindMap.isPending || !selected.aiAnalysis}
                            onClick={() => regenMindMap.mutate({ consultationId: selected.id })}
                            className="gap-1.5"
                          >
                            {regenMindMap.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {language === "ar" ? "إعادة توليد" : "Regenerate"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* External Upload Link panel */}
                    {uploadLink && (
                      <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                            <Link className="w-4 h-4" />
                            {language === "ar" ? "رابط الرفع الخارجي" : "External Upload Link"}
                          </p>
                          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setUploadLink(null)}>✕</button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {language === "ar" ? `نوع الملف: ${uploadLink.reportType} — صالح حتى: ${new Date(uploadLink.expiresAt).toLocaleString()}` : `Type: ${uploadLink.reportType} — Expires: ${new Date(uploadLink.expiresAt).toLocaleString()}`}
                        </p>
                        <div className="flex items-center gap-2">
                          <input readOnly value={uploadLink.url} className="flex-1 text-xs border rounded px-2 py-1 bg-background font-mono" />
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            onClick={() => { navigator.clipboard.writeText(uploadLink.url); toast.success(language === "ar" ? "تم نسخ الرابط" : "Link copied!"); }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {language === "ar" ? "نسخ" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-xs text-amber-600">
                          {language === "ar" ? "⚠️ هذا الرابط للاستخدام مرة واحدة فقط — شاركه مع الشخص المسؤول عن رفع الملف." : "⚠️ Single-use link — share it with whoever will upload the file."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Approval/Rejection Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "ar" ? "قرار المراجعة" : "Review Decision"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Approve Section */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {language === "ar" ? "ملاحظات الموافقة (اختياري)" : "Approval Notes (Optional)"}
                      </label>
                      <Textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder={language === "ar" ? "أضف أي ملاحظات إضافية..." : "Add any additional notes..."}
                        rows={3}
                      />
                      <Button
                        onClick={() => {
                          if (confirm(language === "ar" ? "هل أنت متأكد من الموافقة على هذا المحتوى؟" : "Are you sure you want to approve this content?")) {
                            approveAIContent.mutate({
                              consultationId: selected.id,
                              specialistNotes: approvalNotes || undefined,
                            });
                          }
                        }}
                        disabled={approveAIContent.isPending}
                        className="w-full"
                      >
                        {approveAIContent.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {language === "ar" ? "الموافقة وإرسال للمريض" : "Approve & Send to Patient"}
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {language === "ar" ? "أو" : "or"}
                        </span>
                      </div>
                    </div>

                    {/* Reject Section */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {language === "ar" ? "سبب الرفض (مطلوب)" : "Rejection Reason (Required)"}
                      </label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder={language === "ar" ? "اشرح لماذا يحتاج المحتوى إلى تحسين..." : "Explain why the content needs improvement..."}
                        rows={3}
                      />
                      <Button
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            toast.error(language === "ar" ? "يرجى تقديم سبب الرفض" : "Please provide a rejection reason");
                            return;
                          }
                          if (confirm(language === "ar" ? "هل أنت متأكد من رفض هذا المحتوى؟ سيتم إعادة المعالجة بالذكاء الاصطناعي." : "Are you sure you want to reject this content? It will be reprocessed by AI.")) {
                            rejectAIContent.mutate({
                              consultationId: selected.id,
                              rejectionReason,
                            });
                          }
                        }}
                        disabled={rejectAIContent.isPending || !rejectionReason.trim()}
                        variant="destructive"
                        className="w-full"
                      >
                        {rejectAIContent.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        {language === "ar" ? "رفض وإعادة المعالجة" : "Reject & Reprocess"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
