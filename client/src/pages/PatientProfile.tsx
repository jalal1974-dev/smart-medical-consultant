import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Image as ImageIcon,
  Video,
  Mic,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  ArrowLeft,
  Users,
  ClipboardList,
  CheckSquare,
  Hourglass,
  FolderOpen,
  CalendarDays,
} from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function PatientProfile() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const params = useParams<{ userId?: string }>();
  const [selectedConsultation, setSelectedConsultation] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");

  // Determine if admin is viewing another user's profile
  const targetUserId = params?.userId ? parseInt(params.userId, 10) : null;
  const isAdminView = !!targetUserId && user?.role === "admin";

  // Own profile query (used when no userId param)
  const { data: consultations, isLoading: loadingConsultations, refetch } =
    trpc.consultation.getByUserId.useQuery(
      user?.id || 0,
      { enabled: !!user && !isAdminView }
    );

  // Admin view query (used when userId param is present)
  const { data: adminProfile, isLoading: loadingAdminProfile } =
    trpc.profile.getProfileByUserId.useQuery(
      { userId: targetUserId! },
      { enabled: isAdminView && !!targetUserId }
    );

  const askQuestionMutation = trpc.consultation.askQuestion.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم إرسال السؤال بنجاح" : "Question submitted successfully");
      setQuestionText("");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleAskQuestion = (consultationId: number) => {
    if (!questionText.trim()) {
      toast.error(language === "ar" ? "الرجاء كتابة سؤال" : "Please enter a question");
      return;
    }
    askQuestionMutation.mutate({ consultationId, question: questionText });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted": return "bg-blue-500";
      case "ai_processing": return "bg-yellow-500";
      case "specialist_review": return "bg-orange-500";
      case "completed": return "bg-green-500";
      case "follow_up": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted": return <Clock className="h-4 w-4" />;
      case "ai_processing": return <AlertCircle className="h-4 w-4 animate-pulse" />;
      case "specialist_review": return <FileText className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "follow_up": return <MessageSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, { en: string; ar: string }> = {
      submitted: { en: "Submitted", ar: "تم الإرسال" },
      ai_processing: { en: "AI Processing", ar: "معالجة الذكاء الاصطناعي" },
      specialist_review: { en: "Specialist Review", ar: "مراجعة الأخصائي" },
      completed: { en: "Completed", ar: "مكتمل" },
      follow_up: { en: "Follow-up", ar: "متابعة" },
    };
    return statusMap[status]?.[language] || status;
  };

  const parseJsonArray = (jsonString: string | null): string[] => {
    if (!jsonString) return [];
    try { return JSON.parse(jsonString); } catch { return []; }
  };

  // Redirect non-admin users away from /patient/:userId
  if (!loading && !isAuthenticated) {
    setLocation("/");
    return null;
  }
  if (!loading && targetUserId && user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const isLoading = loading || (isAdminView ? loadingAdminProfile : loadingConsultations);
  if (isLoading) {
    return (
      <main className="flex-1 container py-8">
        <div className="text-center">{t("loading")}</div>
      </main>
    );
  }

  // Data sources depending on mode
  const displayConsultations = isAdminView
    ? (adminProfile?.consultations ?? [])
    : (consultations ?? []);
  const stats = isAdminView ? adminProfile?.stats : null;
  const patientUser = isAdminView ? adminProfile?.user : user;

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Admin Banner */}
        {isAdminView && (
          <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === "ar"
                  ? `عرض ملف المريض: ${patientUser?.name || patientUser?.email}`
                  : `Admin View — Patient: ${patientUser?.name || patientUser?.email}`}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin")}
              className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {language === "ar" ? "العودة للوحة الإدارة" : "Back to Admin Panel"}
            </Button>
          </div>
        )}

        {/* Patient Stats Summary Card (admin view only) */}
        {isAdminView && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="text-center p-4">
              <div className="flex flex-col items-center gap-1">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                <p className="text-2xl font-bold">{stats.totalConsultations}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "إجمالي الاستشارات" : "Total Consultations"}
                </p>
              </div>
            </Card>
            <Card className="text-center p-4">
              <div className="flex flex-col items-center gap-1">
                <CheckSquare className="h-5 w-5 text-green-500" />
                <p className="text-2xl font-bold text-green-600">{stats.completedConsultations}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "مكتملة" : "Completed"}
                </p>
              </div>
            </Card>
            <Card className="text-center p-4">
              <div className="flex flex-col items-center gap-1">
                <Hourglass className="h-5 w-5 text-orange-500" />
                <p className="text-2xl font-bold text-orange-600">{stats.pendingConsultations}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "قيد الانتظار" : "Pending"}
                </p>
              </div>
            </Card>
            <Card className="text-center p-4">
              <div className="flex flex-col items-center gap-1">
                <FolderOpen className="h-5 w-5 text-purple-500" />
                <p className="text-2xl font-bold text-purple-600">{stats.totalRecords}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "السجلات الطبية" : "Medical Records"}
                </p>
              </div>
            </Card>
            <Card className="text-center p-4">
              <div className="flex flex-col items-center gap-1">
                <CalendarDays className="h-5 w-5 text-cyan-500" />
                <p className="text-2xl font-bold text-cyan-600">{stats.consultationsRemaining}</p>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "استشارات متبقية" : "Remaining"}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {isAdminView
                    ? (language === "ar" ? "ملف المريض" : "Patient Profile")
                    : (language === "ar" ? "ملفي الشخصي" : "My Profile")}
                </CardTitle>
                <CardDescription>
                  {patientUser?.name || patientUser?.email}
                  {isAdminView && patientUser?.email && patientUser?.name && (
                    <span className="ml-2 text-xs text-muted-foreground">({patientUser.email})</span>
                  )}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex gap-2 mb-2 justify-end flex-wrap">
                  <Badge variant="outline">
                    {patientUser?.subscriptionType === "free" && (language === "ar" ? "مجاني" : "Free")}
                    {patientUser?.subscriptionType === "pay_per_case" && (language === "ar" ? "دفع لكل حالة" : "Pay Per Case")}
                    {patientUser?.subscriptionType === "monthly" && (language === "ar" ? "اشتراك شهري" : "Monthly")}
                  </Badge>
                  {(patientUser as any)?.planType === "premium" ? (
                    <Badge className="bg-amber-500 text-white">{language === "ar" ? "بريميوم" : "Premium"}</Badge>
                  ) : (
                    <Badge variant="secondary">{language === "ar" ? "خطة مجانية" : "Free Plan"}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar"
                    ? `الاستشارات المتبقية: ${patientUser?.consultationsRemaining || 0}`
                    : `Consultations Remaining: ${patientUser?.consultationsRemaining || 0}`}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Consultations List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdminView
                ? (language === "ar" ? "استشارات المريض" : "Patient Consultations")
                : (language === "ar" ? "استشاراتي" : "My Consultations")}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "عرض جميع الاستشارات الطبية والتقارير"
                : "View all medical consultations and reports"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!displayConsultations || displayConsultations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === "ar" ? "لا توجد استشارات بعد" : "No consultations yet"}
              </div>
            ) : (
              <div className="space-y-4">
                {displayConsultations.map((consultation: any) => (
                  <Card key={consultation.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">
                              {language === "ar"
                                ? `استشارة #${consultation.id}`
                                : `Consultation #${consultation.id}`}
                            </CardTitle>
                            <Badge className={getStatusColor(consultation.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(consultation.status)}
                                {getStatusText(consultation.status)}
                              </span>
                            </Badge>
                          </div>
                          <CardDescription>
                            {new Date(consultation.createdAt).toLocaleDateString(
                              language === "ar" ? "ar-EG" : "en-US",
                              { year: "numeric", month: "long", day: "numeric" }
                            )}
                          </CardDescription>
                        </div>
                        {consultation.isFree ? (
                          <Badge variant="secondary">{language === "ar" ? "مجاني" : "Free"}</Badge>
                        ) : (
                          <Badge variant="default">${consultation.amount}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="details">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="details">{language === "ar" ? "التفاصيل" : "Details"}</TabsTrigger>
                          <TabsTrigger value="documents">{language === "ar" ? "المستندات" : "Documents"}</TabsTrigger>
                          <TabsTrigger value="responses">{language === "ar" ? "الردود" : "Responses"}</TabsTrigger>
                          <TabsTrigger value="questions">{language === "ar" ? "الأسئلة" : "Questions"}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">{language === "ar" ? "الأعراض" : "Symptoms"}</h4>
                            <p className="text-sm text-muted-foreground">{consultation.symptoms}</p>
                          </div>
                          {consultation.medicalHistory && (
                            <div>
                              <h4 className="font-medium mb-2">{language === "ar" ? "التاريخ الطبي" : "Medical History"}</h4>
                              <p className="text-sm text-muted-foreground">{consultation.medicalHistory}</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="documents" className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {parseJsonArray(consultation.medicalReports).length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  {language === "ar" ? "التقارير الطبية" : "Medical Reports"}
                                </h4>
                                <div className="space-y-2">
                                  {parseJsonArray(consultation.medicalReports).map((url, idx) => (
                                    <Button key={idx} variant="outline" size="sm" className="w-full justify-start" asChild>
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4 mr-2" />
                                        {language === "ar" ? `تقرير ${idx + 1}` : `Report ${idx + 1}`}
                                      </a>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {parseJsonArray(consultation.labResults).length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  {language === "ar" ? "نتائج التحاليل" : "Lab Results"}
                                </h4>
                                <div className="space-y-2">
                                  {parseJsonArray(consultation.labResults).map((url, idx) => (
                                    <Button key={idx} variant="outline" size="sm" className="w-full justify-start" asChild>
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4 mr-2" />
                                        {language === "ar" ? `تحليل ${idx + 1}` : `Result ${idx + 1}`}
                                      </a>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {parseJsonArray(consultation.xrayImages).length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  {language === "ar" ? "صور الأشعة" : "X-ray Images"}
                                </h4>
                                <div className="space-y-2">
                                  {parseJsonArray(consultation.xrayImages).map((url, idx) => (
                                    <Button key={idx} variant="outline" size="sm" className="w-full justify-start" asChild>
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4 mr-2" />
                                        {language === "ar" ? `أشعة ${idx + 1}` : `X-ray ${idx + 1}`}
                                      </a>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="responses" className="space-y-4">
                          {consultation.status === "completed" || consultation.status === "follow_up" ? (
                            <div className="space-y-4">
                              {consultation.aiReportUrl && (
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {language === "ar" ? "تقرير الذكاء الاصطناعي" : "AI Analysis Report"}
                                  </h4>
                                  <Button variant="outline" asChild>
                                    <a href={consultation.aiReportUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4 mr-2" />
                                      {language === "ar" ? "تحميل التقرير" : "Download Report"}
                                    </a>
                                  </Button>
                                </div>
                              )}
                              {consultation.infographicUrl && (
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    {language === "ar" ? "الرسومات التوضيحية" : "Infographic"}
                                  </h4>
                                  <Button variant="outline" asChild>
                                    <a href={consultation.infographicUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4 mr-2" />
                                      {language === "ar" ? "عرض الرسم" : "View Infographic"}
                                    </a>
                                  </Button>
                                </div>
                              )}
                              {consultation.aiVideoUrl && (
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Video className="h-4 w-4" />
                                    {language === "ar" ? "فيديو توضيحي" : "Explanation Video"}
                                  </h4>
                                  <Button variant="outline" asChild>
                                    <a href={consultation.aiVideoUrl} target="_blank" rel="noopener noreferrer">
                                      <Video className="h-4 w-4 mr-2" />
                                      {language === "ar" ? "مشاهدة الفيديو" : "Watch Video"}
                                    </a>
                                  </Button>
                                </div>
                              )}
                              {consultation.aiAudioUrl && (
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Mic className="h-4 w-4" />
                                    {language === "ar" ? "شرح صوتي" : "Audio Explanation"}
                                  </h4>
                                  <Button variant="outline" asChild>
                                    <a href={consultation.aiAudioUrl} target="_blank" rel="noopener noreferrer">
                                      <Mic className="h-4 w-4 mr-2" />
                                      {language === "ar" ? "استماع" : "Listen"}
                                    </a>
                                  </Button>
                                </div>
                              )}
                              {consultation.specialistNotes && (
                                <div>
                                  <h4 className="font-medium mb-2">
                                    {language === "ar" ? "ملاحظات الأخصائي" : "Specialist Notes"}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">{consultation.specialistNotes}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              {language === "ar"
                                ? "سيتم إضافة الردود عند اكتمال التحليل"
                                : "Responses will be added when analysis is complete"}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="questions" className="space-y-4">
                          {/* Only show ask-question form for own profile */}
                          {!isAdminView && (
                            <div className="space-y-2">
                              <h4 className="font-medium">{language === "ar" ? "اطرح سؤالاً" : "Ask a Question"}</h4>
                              <Textarea
                                placeholder={language === "ar"
                                  ? "اكتب سؤالك حول هذه الاستشارة..."
                                  : "Write your question about this consultation..."}
                                value={selectedConsultation === consultation.id ? questionText : ""}
                                onChange={(e) => {
                                  setSelectedConsultation(consultation.id);
                                  setQuestionText(e.target.value);
                                }}
                                rows={3}
                              />
                              <Button
                                onClick={() => handleAskQuestion(consultation.id)}
                                disabled={askQuestionMutation.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {language === "ar" ? "إرسال السؤال" : "Send Question"}
                              </Button>
                            </div>
                          )}
                          {consultation.questions && consultation.questions.length > 0 && (
                            <div className="space-y-4 mt-6">
                              <h4 className="font-medium">
                                {language === "ar" ? "الأسئلة السابقة" : "Previous Questions"}
                              </h4>
                              {consultation.questions.map((q: any) => (
                                <Card key={q.id}>
                                  <CardHeader>
                                    <CardDescription>
                                      {new Date(q.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div>
                                      <p className="font-medium text-sm">{language === "ar" ? "السؤال:" : "Question:"}</p>
                                      <p className="text-sm text-muted-foreground">{q.question}</p>
                                    </div>
                                    {q.answer ? (
                                      <div>
                                        <p className="font-medium text-sm text-green-600">{language === "ar" ? "الإجابة:" : "Answer:"}</p>
                                        <p className="text-sm text-muted-foreground">{q.answer}</p>
                                      </div>
                                    ) : (
                                      <Badge variant="outline">
                                        {language === "ar" ? "في انتظار الرد" : "Pending Response"}
                                      </Badge>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
