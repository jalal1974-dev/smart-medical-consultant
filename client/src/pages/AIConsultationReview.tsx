import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, FileText, Image, Presentation, Network, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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

  // Filter consultations that need review
  const pendingReview = consultations?.filter(
    c => c.status === "specialist_review" && c.specialistApprovalStatus === "pending_review"
  ) || [];

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
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {consultation.preferredLanguage === "ar" ? "العربية" : "English"}
                    </Badge>
                    <Badge variant="outline">
                      {consultation.status}
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

                {/* Generated Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "ar" ? "المحتوى المُنشأ" : "Generated Content"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selected.aiReportUrl && (
                        <a
                          href={selected.aiReportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="font-medium">{language === "ar" ? "تقرير PDF" : "PDF Report"}</span>
                        </a>
                      )}
                      {selected.aiInfographicUrl && (
                        <a
                          href={selected.aiInfographicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <Image className="w-5 h-5 text-primary" />
                          <span className="font-medium">{language === "ar" ? "إنفوجرافيك" : "Infographic"}</span>
                        </a>
                      )}
                      {selected.aiSlideDeckUrl && (
                        <a
                          href={selected.aiSlideDeckUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <Presentation className="w-5 h-5 text-primary" />
                          <span className="font-medium">{language === "ar" ? "عرض تقديمي" : "Slide Deck"}</span>
                        </a>
                      )}
                      {selected.aiMindMapUrl && (
                        <a
                          href={selected.aiMindMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <Network className="w-5 h-5 text-primary" />
                          <span className="font-medium">{language === "ar" ? "خريطة ذهنية" : "Mind Map"}</span>
                        </a>
                      )}
                    </div>
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
