import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, FileText, Image, Presentation, Network, Download, Play, Headphones, Paperclip, Phone, MessageCircle, ExternalLink, CheckCircle } from "lucide-react";
import { format } from "date-fns";

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
  subtitle,
  url,
  type,
  language,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  url: string;
  type: "pdf" | "image" | "slides" | "video" | "audio" | "other";
  language: string;
}) {
  const isAr = language === "ar";

  const actionLabel = {
    pdf: isAr ? "فتح التقرير" : "Open Report",
    image: isAr ? "عرض الصورة" : "View Image",
    slides: isAr ? "فتح العرض" : "Open Slides",
    video: isAr ? "مشاهدة الفيديو" : "Watch Video",
    audio: isAr ? "الاستماع" : "Listen",
    other: isAr ? "فتح الملف" : "Open File",
  }[type];

  const ActionIcon = {
    pdf: Download,
    image: ExternalLink,
    slides: ExternalLink,
    video: Play,
    audio: Headphones,
    other: Download,
  }[type];

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0 text-teal-700 dark:text-teal-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <ActionIcon className="w-3.5 h-3.5" />
          {actionLabel}
        </Button>
      </a>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, language }: { status: string; language: string }) {
  const isAr = language === "ar";
  const map: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    submitted:         { label: "Submitted",          labelAr: "مُقدَّم",              variant: "secondary" },
    ai_processing:     { label: "AI Processing",      labelAr: "قيد المعالجة",         variant: "secondary" },
    specialist_review: { label: "Under Review",       labelAr: "قيد المراجعة",         variant: "default" },
    completed:         { label: "Completed",          labelAr: "مكتمل",               variant: "default" },
    rejected:          { label: "Needs More Info",    labelAr: "يحتاج مزيداً من المعلومات", variant: "destructive" },
  };
  const info = map[status] ?? { label: status, labelAr: status, variant: "secondary" as const };
  return <Badge variant={info.variant}>{isAr ? info.labelAr : info.label}</Badge>;
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
        <p className="text-muted-foreground">{isAr ? "الاستشارة غير موجودة أو غير مصرح لك." : "Consultation not found or you are not authorized."}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isAr ? "العودة" : "Go Back"}
        </Button>
      </div>
    );
  }

  const c = consultation as any;

  // Collect all sent materials
  const sentMaterials: React.ReactNode[] = [];

  if (c.sentPdfToPatient && c.aiReportUrl) {
    sentMaterials.push(
      <MaterialCard key="pdf" icon={<FileText className="w-5 h-5" />} title={isAr ? "التقرير الطبي التفصيلي" : "Detailed Medical Report"} subtitle={isAr ? "تقرير PDF شامل" : "Comprehensive PDF report"} url={c.aiReportUrl} type="pdf" language={language} />
    );
  }
  if (c.sentInfographicToPatient && c.aiInfographicUrl) {
    sentMaterials.push(
      <MaterialCard key="infographic" icon={<Image className="w-5 h-5" />} title={isAr ? "الإنفوجرافيك الطبي" : "Medical Infographic"} subtitle={isAr ? "ملخص بصري" : "Visual summary"} url={c.aiInfographicUrl} type="image" language={language} />
    );
  }
  if (c.sentSlidesToPatient && c.aiSlideDeckUrl) {
    sentMaterials.push(
      <MaterialCard key="slides" icon={<Presentation className="w-5 h-5" />} title={isAr ? "العرض التقديمي" : "Slide Presentation"} subtitle={isAr ? "شرائح تعليمية" : "Educational slides"} url={c.aiSlideDeckUrl} type="slides" language={language} />
    );
  }
  if (c.sentPptxToPatient && c.pptxReportUrl) {
    sentMaterials.push(
      <MaterialCard key="pptx" icon={<Presentation className="w-5 h-5" />} title={isAr ? "ملف PPTX" : "PPTX File"} subtitle={isAr ? "قابل للتعديل" : "Editable presentation"} url={c.pptxReportUrl} type="slides" language={language} />
    );
  }
  if (c.sentMindMapToPatient && c.aiMindMapUrl) {
    sentMaterials.push(
      <MaterialCard key="mindmap" icon={<Network className="w-5 h-5" />} title={isAr ? "الخريطة الذهنية" : "Mind Map"} subtitle={isAr ? "خريطة التشخيص" : "Diagnostic map"} url={c.aiMindMapUrl} type="image" language={language} />
    );
  }
  if (c.sentVideoToPatient && c.doctorUploadedVideoUrl) {
    sentMaterials.push(
      <MaterialCard key="video" icon={<Play className="w-5 h-5" />} title={c.doctorUploadedVideoTitle || (isAr ? "فيديو شرح" : "Explanation Video")} subtitle={isAr ? "من الطبيب المعالج" : "From your specialist"} url={c.doctorUploadedVideoUrl} type="video" language={language} />
    );
  }
  if (c.sentAudioToPatient && c.doctorUploadedAudioUrl) {
    sentMaterials.push(
      <MaterialCard key="audio" icon={<Headphones className="w-5 h-5" />} title={c.doctorUploadedAudioTitle || (isAr ? "ملخص صوتي / بودكاست" : "Audio Summary / Podcast")} subtitle={isAr ? "من الطبيب المعالج" : "From your specialist"} url={c.doctorUploadedAudioUrl} type="audio" language={language} />
    );
  }
  if (c.sentOtherToPatient && c.doctorUploadedOtherUrl) {
    sentMaterials.push(
      <MaterialCard key="other" icon={<Paperclip className="w-5 h-5" />} title={c.doctorUploadedOtherTitle || (isAr ? "مستند إضافي" : "Additional Document")} subtitle={isAr ? "من الطبيب المعالج" : "From your specialist"} url={c.doctorUploadedOtherUrl} type="other" language={language} />
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
          <CardContent className="space-y-3">
            {sentMaterials}
          </CardContent>
        )}
      </Card>

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
