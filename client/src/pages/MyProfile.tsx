import { useState, useRef, useCallback } from "react";
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
  Clock, AlertTriangle, Loader2, FolderOpen, Activity, Star, Eye, Paperclip, File, FlaskConical, Image, CreditCard,
  Camera, Pencil, X, Check
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
    paymentHistory: { en: "Payment History", ar: "سجل المدفوعات" },
    noPayments: { en: "No payments yet.", ar: "لا توجد مدفوعات بعد." },
    noPaymentsDesc: { en: "Your paid consultations will appear here.", ar: "ستظهر استشاراتك المدفوعة هنا." },
    totalSpent: { en: "Total Spent", ar: "إجمالي المدفوع" },
    paidConsultations: { en: "Paid Consultations", ar: "استشارات مدفوعة" },
    freeConsultationLabel: { en: "Free Consultation", ar: "استشارة مجانية" },
    date: { en: "Date", ar: "التاريخ" },
    consultationId: { en: "Consultation #", ar: "استشارة #" },
    amount: { en: "Amount", ar: "المبلغ" },
    paypalOrderId: { en: "PayPal Order ID", ar: "رقم طلب PayPal" },
    paymentStatus: { en: "Status", ar: "الحالة" },
    paymentCompleted: { en: "Completed", ar: "مكتمل" },
    viewConsultation: { en: "View", ar: "عرض" },
    editProfile: { en: "Edit Profile", ar: "تعديل الملف الشخصي" },
    bio: { en: "About Me", ar: "نبذة عني" },
    bioPlaceholder: { en: "Write a short bio about yourself (max 300 characters)...", ar: "اكتب نبذة قصيرة عن نفسك (حد أقصى 300 حرف)..." },
    bioEmpty: { en: "No bio added yet. Click Edit Profile to add one.", ar: "لم تتم إضافة نبذة بعد. انقر على تعديل الملف الشخصي لإضافتها." },
    saveProfile: { en: "Save Changes", ar: "حفظ التغييرات" },
    saving: { en: "Saving...", ar: "جاري الحفظ..." },
    profileUpdated: { en: "Profile updated successfully!", ar: "تم تحديث الملف الشخصي بنجاح!" },
    changePhoto: { en: "Change Photo", ar: "تغيير الصورة" },
    uploadingPhoto: { en: "Uploading...", ar: "جاري الرفع..." },
    photoUpdated: { en: "Profile photo updated!", ar: "تم تحديث صورة الملف الشخصي!" },
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

// ─── Attached Records sub-component ────────────────────────────────────────
const RECORD_ICONS: Record<string, React.ReactNode> = {
  medical_report: <FileText className="w-3 h-3 text-blue-500" />,
  lab_result: <FlaskConical className="w-3 h-3 text-purple-500" />,
  xray: <Image className="w-3 h-3 text-teal-500" />,
  other: <File className="w-3 h-3 text-gray-500" />,
};

function AttachedRecordsSection({ consultationId, language }: { consultationId: number; language: Lang }) {
  const isAr = language === "ar";
  const { data: attached, isLoading } = trpc.consultation.getAttachedRecords.useQuery(
    { consultationId },
    { enabled: !!consultationId }
  );

  if (isLoading) return null;
  if (!attached || attached.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
        <Paperclip className="w-3 h-3" />
        {isAr ? "السجلات الطبية المرفقة" : "Attached Medical Records"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {attached.map((rec: any) => (
          <a
            key={rec.id}
            href={rec.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-300 transition-colors max-w-[180px]"
          >
            {RECORD_ICONS[rec.category] ?? <File className="w-3 h-3" />}
            <span className="truncate">{rec.fileName}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

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

  const { data: paymentHistory = [] } = trpc.profile.getPaymentHistory.useQuery(undefined, {
    enabled: !!user,
  });

  // ── Profile edit state ──
  const [editOpen, setEditOpen] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t("profileUpdated", language));
      setEditOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success(t("photoUpdated", language));
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadAvatarMutation.mutateAsync({ fileData: base64, fileType: file.type as any });
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  }, [uploadAvatarMutation]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    await updateProfileMutation.mutateAsync({ bio: bioValue || null });
    setIsSavingProfile(false);
  };

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

        {/* ── Header ──────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
          <div className="flex items-start gap-5">
            {/* Avatar with camera overlay */}
            <div className="relative group flex-shrink-0">
              {profileUser.avatarUrl ? (
                <img
                  src={profileUser.avatarUrl}
                  alt={profileUser.name || "User"}
                  className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white dark:border-slate-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-2 border-white dark:border-slate-700">
                  {(profileUser.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              {/* Camera overlay button */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                title={t("changePhoto", language)}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name, email, bio */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold">{profileUser.name || "User"}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setBioValue(profileUser.bio || ""); setEditOpen(true); }}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  {t("editProfile", language)}
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">{profileUser.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {t(profileUser.subscriptionType || "free", language)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("memberSince", language)} {format(new Date(profileUser.createdAt), "MMM yyyy")}
                </span>
              </div>
              {/* Bio display */}
              {profileUser.bio ? (
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">{profileUser.bio}</p>
              ) : (
                <button
                  onClick={() => { setBioValue(""); setEditOpen(true); }}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground mt-2 italic transition-colors"
                >
                  + {isAr ? "إضافة نبذة عنك" : "Add a short bio"}
                </button>
              )}
            </div>
          </div>
          <ConsultationCounter language={language} />
        </div>

        {/* ── Edit Profile Dialog ─────────────────────────────────────────────────── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("editProfile", language)}</DialogTitle>
              <DialogDescription>
                {isAr ? "أضف نبذة قصيرة تظهر على ملفك الشخصي" : "Add a short bio that appears on your profile"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="bio-input">{t("bio", language)}</Label>
                <Textarea
                  id="bio-input"
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value.slice(0, 300))}
                  placeholder={t("bioPlaceholder", language)}
                  rows={4}
                  className="mt-1.5 resize-none"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{bioValue.length}/300</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingProfile}>
                  <X className="w-4 h-4 mr-1" />
                  {t("cancel", language)}
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  {isSavingProfile ? t("saving", language) : t("saveProfile", language)}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Stats Row ──────────────────────────────────────────────────────────────── */}
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
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t("paymentHistory", language)}
              {paymentHistory.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{paymentHistory.length}</Badge>
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
                            {/* Only show materials approved by admin */}
                            {c.aiReportUrl && c.reportApproved && (
                              <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                                <a href={c.aiReportUrl} target="_blank" rel="noopener noreferrer">
                                  <FileText className="w-3 h-3" />
                                  {t("viewReport", language)}
                                </a>
                              </Button>
                            )}
                            {c.aiInfographicUrl && c.infographicApproved && (
                              <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                                <a href={c.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                                  <Star className="w-3 h-3" />
                                  {t("viewInfographic", language)}
                                </a>
                              </Button>
                            )}
                            {c.aiSlideDeckUrl && c.slideDeckApproved && (
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

                        {/* Attached Records from Vault */}
                        <AttachedRecordsSection consultationId={c.id} language={language as "en" | "ar"} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Payment History Tab ─────────────────────────────────────────── */}
          <TabsContent value="payments">
            {paymentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <CreditCard className="w-14 h-14 text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">{t("noPayments", language)}</p>
                <p className="text-sm text-muted-foreground/70">{t("noPaymentsDesc", language)}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary card */}
                {(() => {
                  const paidRows = paymentHistory.filter((p: any) => !p.isFree);
                  const totalSpent = paidRows.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card className="border-green-200 dark:border-green-900">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-2xl font-bold text-green-600">${totalSpent}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("totalSpent", language)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 pb-3">
                          <p className="text-2xl font-bold">{paidRows.length}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("paidConsultations", language)}</p>
                        </CardContent>
                      </Card>
                      <Card className="hidden md:block">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-2xl font-bold">{paymentHistory.length - paidRows.length}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("freeConsultationLabel", language)}</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Payment table */}
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("date", language)}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("consultationId", language)}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t("amount", language)}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">{t("paypalOrderId", language)}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("paymentStatus", language)}</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((p: any, idx: number) => (
                        <tr key={p.consultationId} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(p.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            #{p.consultationId}
                            <p className="text-xs text-muted-foreground font-normal truncate max-w-[160px]">{p.symptomsPreview}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {p.isFree ? (
                              <span className="text-green-600 font-medium">{t("freeConsultationLabel", language)}</span>
                            ) : (
                              <span className="font-semibold">${p.amount}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {p.paymentId ? (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{p.paymentId}</code>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("paymentCompleted", language)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => window.open(`/payment-confirmation/${p.consultationId}`, '_blank')}
                            >
                              {t("viewConsultation", language)}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
