import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, FileText, Upload, Trash2, Download, Calendar, Zap, CheckCircle,
  Clock, AlertTriangle, Loader2, FolderOpen, Activity, Star, Eye
} from "lucide-react";
import { format } from "date-fns";
import { ConsultationCounter } from "@/components/ConsultationCounter";

// ─── Language helpers ────────────────────────────────────────────────────────
type Lang = "en" | "ar";
const t = (key: string, lang: Lang): string => {
  const dict: Record<string, Record<Lang, string>> = {
    myProfile: { en: "My Medical Profile", ar: "ملفي الطبي" },
    memberSince: { en: "Member since", ar: "عضو منذ" },
    consultationBalance: { en: "Consultation Balance", ar: "رصيد الاستشارات" },
    freeConsultations: { en: "Free Consultations", ar: "استشارات مجانية" },
    consultationsLeft: { en: "consultations remaining", ar: "استشارة متبقية" },
    outOf: { en: "out of", ar: "من أصل" },
    medicalRecords: { en: "Medical Records", ar: "السجلات الطبية" },
    myConsultations: { en: "My Consultations", ar: "استشاراتي" },
    uploadRecord: { en: "Upload New Record", ar: "رفع سجل جديد" },
    noRecords: { en: "No medical records uploaded yet.", ar: "لم يتم رفع أي سجلات طبية بعد." },
    noConsultations: { en: "No consultations yet.", ar: "لا توجد استشارات بعد." },
    bookNow: { en: "Book a Consultation", ar: "احجز استشارة" },
    uploadNow: { en: "Upload Your First Record", ar: "ارفع سجلك الأول" },
    category: { en: "Category", ar: "الفئة" },
    notes: { en: "Notes (optional)", ar: "ملاحظات (اختياري)" },
    selectFile: { en: "Select File", ar: "اختر ملفاً" },
    uploading: { en: "Uploading...", ar: "جاري الرفع..." },
    upload: { en: "Upload", ar: "رفع" },
    delete: { en: "Delete", ar: "حذف" },
    view: { en: "View", ar: "عرض" },
    confirmDelete: { en: "Delete this record?", ar: "حذف هذا السجل؟" },
    deleteConfirmMsg: { en: "This action cannot be undone.", ar: "لا يمكن التراجع عن هذا الإجراء." },
    cancel: { en: "Cancel", ar: "إلغاء" },
    status_submitted: { en: "Submitted", ar: "مُقدَّم" },
    status_ai_processing: { en: "AI Processing", ar: "معالجة بالذكاء الاصطناعي" },
    status_specialist_review: { en: "Specialist Review", ar: "مراجعة متخصص" },
    status_completed: { en: "Completed", ar: "مكتمل" },
    status_follow_up: { en: "Follow-up", ar: "متابعة" },
    cat_medical_report: { en: "Medical Report", ar: "تقرير طبي" },
    cat_lab_result: { en: "Lab Result", ar: "نتيجة تحليل" },
    cat_xray: { en: "X-Ray / Scan", ar: "أشعة / مسح" },
    cat_prescription: { en: "Prescription", ar: "وصفة طبية" },
    cat_other: { en: "Other", ar: "أخرى" },
    totalConsultations: { en: "Total Consultations", ar: "إجمالي الاستشارات" },
    completed: { en: "Completed", ar: "مكتملة" },
    pending: { en: "In Progress", ar: "قيد التنفيذ" },
    totalRecords: { en: "Medical Records", ar: "السجلات الطبية" },
    viewReport: { en: "View Report", ar: "عرض التقرير" },
    viewInfographic: { en: "Infographic", ar: "إنفوجرافيك" },
    viewSlides: { en: "Slide Deck", ar: "عرض شرائح" },
    dragDrop: { en: "Drag & drop or click to select", ar: "اسحب وأفلت أو انقر للاختيار" },
    maxSize: { en: "Max 10MB — PDF, Images, Word documents", ar: "الحد الأقصى 10 ميجابايت — PDF، صور، مستندات Word" },
    uploadSuccess: { en: "Record uploaded successfully!", ar: "تم رفع السجل بنجاح!" },
    deleteSuccess: { en: "Record deleted.", ar: "تم حذف السجل." },
    loginRequired: { en: "Please log in to view your profile.", ar: "يرجى تسجيل الدخول لعرض ملفك الشخصي." },
    login: { en: "Log In", ar: "تسجيل الدخول" },
    subscriptionType: { en: "Plan", ar: "الخطة" },
    free: { en: "Free", ar: "مجاني" },
    pay_per_case: { en: "Pay Per Case", ar: "دفع لكل حالة" },
    monthly: { en: "Monthly", ar: "شهري" },
  };
  return dict[key]?.[lang] ?? key;
};

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  medical_report: { en: "Medical Report", ar: "تقرير طبي" },
  lab_result: { en: "Lab Result", ar: "نتيجة تحليل" },
  xray: { en: "X-Ray / Scan", ar: "أشعة / مسح" },
  prescription: { en: "Prescription", ar: "وصفة طبية" },
  other: { en: "Other", ar: "أخرى" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  submitted: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
  ai_processing: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  specialist_review: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: <Eye className="w-3 h-3" /> },
  completed: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
  follow_up: { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", icon: <Activity className="w-3 h-3" /> },
};

export default function MyProfile() {
  const { user, loading: authLoading } = useAuth();
  const language: Lang = (localStorage.getItem("language") as Lang) || "en";
  const isAr = language === "ar";

  const { data: profile, isLoading, refetch } = trpc.profile.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("other");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.profile.uploadRecord.useMutation({
    onSuccess: () => {
      toast.success(t("uploadSuccess", language));
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadNotes("");
      setUploadCategory("other");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.profile.deleteRecord.useMutation({
    onSuccess: () => {
      toast.success(t("deleteSuccess", language));
      setDeleteTarget(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        await uploadMutation.mutateAsync({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64,
          category: uploadCategory as any,
          notes: uploadNotes || undefined,
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType === "application/pdf") return "📄";
    return "📋";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <User className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">{t("loginRequired", language)}</h2>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <a href={getLoginUrl()}>{t("login", language)}</a>
        </Button>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const { user: profileUser, stats, consultations, records } = profile;
  const remaining = profileUser.consultationsRemaining;
  const isLow = remaining <= 2;
  const isEmpty = remaining === 0;

  return (
    <div className="min-h-screen py-10" dir={isAr ? "rtl" : "ltr"}>
      <div className="container max-w-6xl">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {(profileUser.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profileUser.name || "User"}</h1>
              <p className="text-muted-foreground text-sm">{profileUser.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {t(profileUser.subscriptionType || "free", language)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("memberSince", language)} {format(new Date(profileUser.createdAt), "MMM yyyy")}
                </span>
              </div>
            </div>
          </div>
          <ConsultationCounter language={language} />
        </div>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Consultation Balance — prominent card */}
          <Card className={`col-span-2 border-2 ${isEmpty ? "border-red-400 bg-red-50 dark:bg-red-950/20" : isLow ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-blue-400 bg-blue-50 dark:bg-blue-950/20"}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className={`w-5 h-5 ${isEmpty ? "text-red-500" : isLow ? "text-amber-500" : "text-blue-500"}`} />
                  <span className="font-semibold text-sm">{t("consultationBalance", language)}</span>
                </div>
                {isEmpty && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className={`text-4xl font-bold ${isEmpty ? "text-red-600" : isLow ? "text-amber-600" : "text-blue-600"}`}>
                  {remaining}
                </span>
                <span className="text-muted-foreground text-sm mb-1">/ 10 {t("consultationsLeft", language)}</span>
              </div>
              <Progress
                value={(remaining / 10) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {profileUser.hasUsedFreeConsultation
                  ? isAr ? "تم استخدام الاستشارة المجانية الأولى" : "Free trial consultation used"
                  : isAr ? "تشمل استشارة مجانية واحدة" : "Includes 1 free trial consultation"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <FileText className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.totalConsultations}</p>
              <p className="text-xs text-muted-foreground">{t("totalConsultations", language)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <FolderOpen className="w-6 h-6 text-teal-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.totalRecords}</p>
              <p className="text-xs text-muted-foreground">{t("totalRecords", language)}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <Tabs defaultValue="records">
          <TabsList className="mb-6 w-full md:w-auto">
            <TabsTrigger value="records" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              {t("medicalRecords", language)}
              {records.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{records.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="consultations" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t("myConsultations", language)}
              {consultations.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{consultations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Medical Records Tab ─────────────────────────────── */}
          <TabsContent value="records">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t("medicalRecords", language)}</h2>
              <Button
                onClick={() => setUploadOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Upload className="w-4 h-4" />
                {t("uploadRecord", language)}
              </Button>
            </div>

            {records.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-4">
                  <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">{t("noRecords", language)}</p>
                  <Button onClick={() => setUploadOpen(true)} variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    {t("uploadNow", language)}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {records.map((record: any) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{getFileIcon(record.fileType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" title={record.fileName}>
                              {record.fileName}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {CATEGORY_LABELS[record.category]?.[language] || record.category}
                            </Badge>
                            {record.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(record.createdAt), "dd MMM yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" asChild className="flex-1 gap-1">
                          <a href={record.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3" />
                            {t("view", language)}
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => setDeleteTarget(record.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Consultations Tab ───────────────────────────────── */}
          <TabsContent value="consultations">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t("myConsultations", language)}</h2>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 gap-2">
                <a href="/consultations">
                  <FileText className="w-4 h-4" />
                  {t("bookNow", language)}
                </a>
              </Button>
            </div>

            {consultations.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-4">
                  <Activity className="w-16 h-16 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">{t("noConsultations", language)}</p>
                  <Button asChild variant="outline">
                    <a href="/consultations">{t("bookNow", language)}</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {consultations.map((c: any) => {
                  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
                  const statusLabel = t(`status_${c.status}`, language);
                  return (
                    <Card key={c.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {c.patientName}
                              {c.isFree && (
                                <Badge variant="outline" className="text-xs">
                                  {isAr ? "مجاني" : "Free"}
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {format(new Date(c.createdAt), "dd MMM yyyy, HH:mm")}
                            </CardDescription>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {statusLabel}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.symptoms}</p>

                        {/* AI Materials */}
                        {c.aiAnalysis && (
                          <div className="flex flex-wrap gap-2">
                            {c.aiReportUrl && (
                              <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                                <a href={c.aiReportUrl} target="_blank" rel="noopener noreferrer">
                                  <FileText className="w-3 h-3" />
                                  {t("viewReport", language)}
                                </a>
                              </Button>
                            )}
                            {c.aiInfographicUrl && (
                              <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                                <a href={c.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                                  <Star className="w-3 h-3" />
                                  {t("viewInfographic", language)}
                                </a>
                              </Button>
                            )}
                            {c.aiSlideDeckUrl && (
                              <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                                <a href={c.aiSlideDeckUrl} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-3 h-3" />
                                  {t("viewSlides", language)}
                                </a>
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Specialist notes */}
                        {c.specialistNotes && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                              {isAr ? "ملاحظات المتخصص" : "Specialist Notes"}
                            </p>
                            <p className="text-xs text-muted-foreground">{c.specialistNotes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Upload Dialog ─────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) { setSelectedFile(null); setUploadNotes(""); setUploadCategory("other"); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              {t("uploadRecord", language)}
            </DialogTitle>
            <DialogDescription>{t("maxSize", language)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${selectedFile ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-muted-foreground/30 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/10"}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-2xl">{getFileIcon(selectedFile.type)}</p>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">{t("dragDrop", language)}</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                onChange={handleFileSelect}
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label>{t("category", language)}</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([val, labels]) => (
                    <SelectItem key={val} value={val}>{labels[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>{t("notes", language)}</Label>
              <Textarea
                placeholder={isAr ? "أضف ملاحظات اختيارية..." : "Add optional notes..."}
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>
                {t("cancel", language)}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                disabled={!selectedFile || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t("uploading", language)}</>
                ) : (
                  <><Upload className="w-4 h-4" />{t("upload", language)}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────── */}
      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t("confirmDelete", language)}
            </DialogTitle>
            <DialogDescription>{t("deleteConfirmMsg", language)}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              {t("cancel", language)}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget !== null && deleteMutation.mutate({ recordId: deleteTarget })}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("delete", language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
