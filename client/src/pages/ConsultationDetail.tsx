import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, ArrowLeft, FileText, Image, Presentation, Network,
  Download, Play, Headphones, Paperclip, Phone, MessageCircle,
  ExternalLink, CheckCircle, StickyNote, Send, HelpCircle, Clock,
  CheckCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";
import { toast } from "sonner";

// ─── SMC Brand Header ─────────────────────────────────────────────────────────
function SMCBrandHeader({ language }: { language: string }) {
  const isAr = language === "ar";
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl text-white mb-6 print:mb-4">
      <div className="flex items-center gap-3">
        <img
          src="https://smartmedcon-jsnymp6w.manus.space/logo.png"
          alt="Smart Medical Consultant"
          className="h-12 w-12 rounded-full object-contain bg-white p-0.5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <p className="font-bold text-lg leading-tight">
            {isAr ? "المستشار الطبي الذكي" : "Smart Medical Consultant"}
          </p>
          <p className="text-teal-200 text-xs">
            {isAr ? "تقرير طبي متخصص" : "Specialist Medical Report"}
          </p>
        </div>
      </div>
      <div className="text-right text-xs text-teal-200 space-y-0.5">
        <div className="flex items-center gap-1 justify-end">
          <Phone className="w-3 h-3" />
          <a href="tel:00962777066005" className="hover:text-white">+962 777 066 005</a>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <MessageCircle className="w-3 h-3" />
          <a href="https://wa.me/00962777066005" target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a>
        </div>
        <div className="text-teal-300">smartmedcon-jsnymp6w.manus.space</div>
      </div>
    </div>
  );
}

// ─── Material Card ─────────────────────────────────────────────────────────────
function MaterialCard({
  icon,
  title,
  note,
  url,
  type,
  language,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string | null;
  url: string;
  type: "pdf" | "image" | "slides" | "video" | "audio" | "other";
  language: string;
}) {
  const isAr = language === "ar";

  // Primary action label and icon
  const openLabel = {
    pdf:    isAr ? "فتح التقرير"    : "Open Report",
    image:  isAr ? "عرض الصورة"    : "View Image",
    slides: isAr ? "فتح العرض"     : "Open Slides",
    video:  isAr ? "مشاهدة الفيديو" : "Watch Video",
    audio:  isAr ? "الاستماع"       : "Listen",
    other:  isAr ? "فتح الملف"     : "Open File",
  }[type];

  const OpenIcon = {
    pdf:    ExternalLink,
    image:  ExternalLink,
    slides: ExternalLink,
    video:  Play,
    audio:  Headphones,
    other:  ExternalLink,
  }[type];

  // Show a Download button for audio and document types
  const showDownload = type === "audio" || type === "other" || type === "pdf";
  const downloadLabel = isAr ? "تحميل" : "Download";

  // Colour accent per type
  const accentClass = {
    pdf:    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    image:  "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    slides: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800",
    video:  "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    audio:  "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    other:  "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800",
  }[type];

  const iconBgClass = {
    pdf:    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    image:  "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    slides: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    video:  "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    audio:  "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    other:  "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300",
  }[type];

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${accentClass}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">{title}</p>
        </div>
      </div>

      {/* Doctor's personalized note — prominently displayed */}
      {note && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/70 dark:bg-black/20 border border-teal-200 dark:border-teal-800">
          <StickyNote className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-0.5">
              {isAr ? "ملاحظة من طبيبك" : "Note from your specialist"}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{note}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="gap-1.5 text-xs bg-teal-700 hover:bg-teal-800 text-white">
            <OpenIcon className="w-3.5 h-3.5" />
            {openLabel}
          </Button>
        </a>
        {showDownload && (
          <a href={url} download>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              {downloadLabel}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, language }: { status: string; language: string }) {
  const isAr = language === "ar";
  const map: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    submitted:         { label: "Submitted",       labelAr: "مُقدَّم",                    variant: "secondary" },
    ai_processing:     { label: "AI Processing",   labelAr: "قيد المعالجة",               variant: "secondary" },
    specialist_review: { label: "Under Review",    labelAr: "قيد المراجعة",               variant: "default" },
    completed:         { label: "Completed",       labelAr: "مكتمل",                      variant: "default" },
    rejected:          { label: "Needs More Info", labelAr: "يحتاج مزيداً من المعلومات",  variant: "destructive" },
  };
  const info = map[status] ?? { label: status, labelAr: status, variant: "secondary" as const };
  return <Badge variant={info.variant}>{isAr ? info.labelAr : info.label}</Badge>;
}

// ─── Follow-up Questions Section ──────────────────────────────────────────────
function FollowUpSection({ consultationId, language }: { consultationId: number; language: string }) {
  const isAr = language === "ar";
  const utils = trpc.useUtils();
  const [questionText, setQuestionText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; mimeType: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.upload.file.useMutation();

  const { data: questions, isLoading: loadingQ } = trpc.consultation.getMyQuestions.useQuery(
    { consultationId },
    { refetchInterval: 30_000 } // poll every 30 s for new answers
  );

  const askMutation = trpc.consultation.askQuestion.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إرسال سؤالك بنجاح" : "Your question has been submitted");
      setQuestionText("");
      setAttachment(null);
      setSubmitted(true);
      utils.consultation.getMyQuestions.invalidate({ consultationId });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(isAr ? `حجم الملف يتجاوز ${maxMB} ميغابايت` : `File size exceeds ${maxMB} MB`);
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
        category: 'other',
      });
      setAttachment({ url: result.url, mimeType: file.type, name: file.name });
      toast.success(isAr ? "تم رفع الملف بنجاح" : "File uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || (isAr ? "فشل رفع الملف" : "File upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    const trimmed = questionText.trim();
    if (trimmed.length < 10) {
      toast.error(isAr ? "يرجى كتابة سؤال أكثر تفصيلاً (10 أحرف على الأقل)" : "Please write a more detailed question (at least 10 characters)");
      return;
    }
    askMutation.mutate({
      consultationId,
      question: trimmed,
      attachmentUrl: attachment?.url,
      attachmentMimeType: attachment?.mimeType,
      attachmentName: attachment?.name,
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="w-5 h-5 text-teal-600" />
          {isAr ? "اسأل طبيبك" : "Ask Your Specialist"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "هل لديك سؤال حول التقارير أو المواد المُسلَّمة؟ اكتب سؤالك وسيرد عليك الطبيب في أقرب وقت."
            : "Have a question about the reports or delivered materials? Write it below and your specialist will reply as soon as possible."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing questions + answers */}
        {loadingQ ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isAr ? "جارٍ التحميل…" : "Loading…"}
          </div>
        ) : questions && questions.length > 0 ? (
          <div className="space-y-3">
            {questions.map((q: any) => (
              <div key={q.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                {/* Patient question */}
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                      {isAr ? "سؤالك" : "Your question"} · {format(new Date(q.createdAt), "PPp")}
                    </p>
                    <p className="text-sm">{q.question}</p>
                  </div>
                </div>
                {/* Doctor answer */}
                {q.answer ? (
                  <div className="flex items-start gap-2 pl-2 border-l-2 border-teal-400">
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-0.5">
                        {isAr ? "رد الطبيب" : "Specialist reply"} · {q.answeredAt ? format(new Date(q.answeredAt), "PPp") : ""}
                      </p>
                      <p className="text-sm leading-relaxed">{q.answer}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 pl-8 text-xs text-muted-foreground italic">
                    <Clock className="w-3.5 h-3.5" />
                    {isAr ? "في انتظار رد الطبيب…" : "Awaiting specialist reply…"}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* New question form */}
        <div className="space-y-2">
          <Textarea
            placeholder={isAr
              ? "اكتب سؤالك هنا… مثال: ما هو الدواء الموصى به لهذه الحالة؟"
              : "Type your question here… e.g. What medication is recommended for this condition?"}
            className="min-h-[96px] resize-none text-sm"
            value={questionText}
            onChange={(e) => { setQuestionText(e.target.value); setSubmitted(false); }}
            maxLength={1000}
            dir={isAr ? "rtl" : "ltr"}
          />

          {/* Attachment preview */}
          {attachment && (
            <div className="flex items-center gap-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/20 px-3 py-2">
              <Paperclip className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-xs text-teal-800 dark:text-teal-300 flex-1 truncate">{attachment.name}</span>
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-1"
                onClick={() => setAttachment(null)}
                title={isAr ? "إزالة الملف" : "Remove file"}
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{questionText.length}/1000</span>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              {/* Attach file button */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1 border-teal-300 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950"
                disabled={uploading || askMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                title={isAr ? "إرفاق صورة أو ملف" : "Attach image or document"}
              >
                {uploading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Paperclip className="w-3 h-3" />}
                <span>{uploading ? (isAr ? "جارٍ الرفع…" : "Uploading…") : (isAr ? "إرفاق ملف" : "Attach file")}</span>
              </Button>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-teal-700 hover:bg-teal-800 text-white"
              disabled={askMutation.isPending || uploading || questionText.trim().length < 10}
              onClick={handleSubmit}
            >
              {askMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isAr ? "جارٍ الإرسال…" : "Sending…"}</>
                : <><Send className="w-3.5 h-3.5" />{isAr ? "إرسال السؤال" : "Submit Question"}</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "يمكنك إرفاق صورة أو ملف PDF أو مستند Word (حتى 10 ميغابايت)"
              : "You can attach an image, PDF, or Word document (up to 10 MB)"}
          </p>
          {submitted && (
            <p className="text-xs text-teal-700 dark:text-teal-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {isAr ? "تم إرسال سؤالك. سيرد عليك الطبيب قريباً." : "Question submitted. Your specialist will reply soon."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const consultationId = parseInt(id ?? "0", 10);

  const { data: consultation, isLoading } = trpc.consultation.get.useQuery(
    { id: consultationId },
    { enabled: !!consultationId && isAuthenticated }
  );

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !consultation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-4">
        <p className="text-muted-foreground">
          {isAr ? "الاستشارة غير موجودة أو غير مصرح لك." : "Consultation not found or you are not authorized."}
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className={`w-4 h-4 ${isAr ? "ml-2 rotate-180" : "mr-2"}`} />
          {isAr ? "العودة" : "Go Back"}
        </Button>
      </div>
    );
  }

  const c = consultation as any;

  // Collect all sent materials with their notes
  const sentMaterials: React.ReactNode[] = [];

  if (c.sentPdfToPatient && c.aiReportUrl) {
    sentMaterials.push(
      <MaterialCard key="pdf" icon={<FileText className="w-5 h-5" />}
        title={isAr ? "التقرير الطبي التفصيلي" : "Detailed Medical Report"}
        note={null}
        url={c.aiReportUrl} type="pdf" language={language} />
    );
  }
  if (c.sentInfographicToPatient && c.aiInfographicUrl) {
    sentMaterials.push(
      <MaterialCard key="infographic" icon={<Image className="w-5 h-5" />}
        title={isAr ? "الإنفوجرافيك الطبي" : "Medical Infographic"}
        note={null}
        url={c.aiInfographicUrl} type="image" language={language} />
    );
  }
  if (c.sentSlidesToPatient && c.aiSlideDeckUrl) {
    sentMaterials.push(
      <MaterialCard key="slides" icon={<Presentation className="w-5 h-5" />}
        title={isAr ? "العرض التقديمي" : "Slide Presentation"}
        note={null}
        url={c.aiSlideDeckUrl} type="slides" language={language} />
    );
  }
  if (c.sentPptxToPatient && c.pptxReportUrl) {
    sentMaterials.push(
      <MaterialCard key="pptx" icon={<Presentation className="w-5 h-5" />}
        title={isAr ? "ملف PPTX" : "PPTX File"}
        note={null}
        url={c.pptxReportUrl} type="slides" language={language} />
    );
  }
  if (c.sentMindMapToPatient && c.aiMindMapUrl) {
    sentMaterials.push(
      <MaterialCard key="mindmap" icon={<Network className="w-5 h-5" />}
        title={isAr ? "الخريطة الذهنية" : "Mind Map"}
        note={null}
        url={c.aiMindMapUrl} type="image" language={language} />
    );
  }
  if (c.sentVideoToPatient && c.doctorUploadedVideoUrl) {
    sentMaterials.push(
      <MaterialCard key="video" icon={<Play className="w-5 h-5" />}
        title={c.doctorUploadedVideoTitle || (isAr ? "فيديو شرح" : "Explanation Video")}
        note={c.doctorUploadedVideoNote}
        url={c.doctorUploadedVideoUrl} type="video" language={language} />
    );
  }
  if (c.sentAudioToPatient && c.doctorUploadedAudioUrl) {
    sentMaterials.push(
      <MaterialCard key="audio" icon={<Headphones className="w-5 h-5" />}
        title={c.doctorUploadedAudioTitle || (isAr ? "ملخص صوتي / بودكاست" : "Audio Summary / Podcast")}
        note={c.doctorUploadedAudioNote}
        url={c.doctorUploadedAudioUrl} type="audio" language={language} />
    );
  }
  if (c.sentOtherToPatient && c.doctorUploadedOtherUrl) {
    sentMaterials.push(
      <MaterialCard key="other" icon={<Paperclip className="w-5 h-5" />}
        title={c.doctorUploadedOtherTitle || (isAr ? "مستند إضافي" : "Additional Document")}
        note={c.doctorUploadedOtherNote}
        url={c.doctorUploadedOtherUrl} type="other" language={language} />
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Back button */}
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
        {isAr ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
      </Button>

      {/* SMC Brand Header */}
      <SMCBrandHeader language={language} />

      {/* Consultation Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">
                {isAr ? `استشارة #${c.id}` : `Consultation #${c.id}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(c.createdAt), "PPP")}
              </p>
            </div>
            <StatusBadge status={c.status} language={language} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {isAr ? "الأعراض" : "Symptoms"}
            </p>
            <p className="text-sm leading-relaxed">{c.symptoms}</p>
          </div>
          {c.specialistNotes && (
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1">
                {isAr ? "ملاحظات الطبيب" : "Specialist Notes"}
              </p>
              <p className="text-sm leading-relaxed">{c.specialistNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivered Materials */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            {isAr ? "المواد الطبية المُسلَّمة" : "Delivered Medical Materials"}
          </CardTitle>
          {sentMaterials.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "لم يتم تسليم أي مواد بعد. سيُخطرك الطبيب عند اكتمال التقارير."
                : "No materials have been delivered yet. Your specialist will notify you when reports are ready."}
            </p>
          )}
        </CardHeader>
        {sentMaterials.length > 0 && (
          <CardContent className="space-y-4">
            {sentMaterials}
          </CardContent>
        )}
      </Card>

      {/* Follow-up Questions */}
      <FollowUpSection consultationId={consultationId} language={language} />

      {/* Contact Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? "تواصل معنا" : "Contact Us"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a href="tel:00962777066005">
            <Button variant="outline" className="gap-2">
              <Phone className="w-4 h-4" />
              {isAr ? "اتصل بنا" : "Call Us"}
            </Button>
          </a>
          <a href="https://wa.me/00962777066005" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </a>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/consultations")}>
            <FileText className="w-4 h-4" />
            {isAr ? "استشارة جديدة" : "New Consultation"}
          </Button>
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground print:block hidden">
        Smart Medical Consultant — smartmedcon-jsnymp6w.manus.space — +962 777 066 005
      </div>
    </div>
  );
}
