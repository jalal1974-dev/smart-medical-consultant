import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
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
  ShieldAlert
} from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function PatientProfile() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const params = useParams<{ userId?: string }>();
  const [selectedConsultation, setSelectedConsultation] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");

  // Determine if this is an admin viewing another user's profile
  const adminViewUserId = params.userId ? parseInt(params.userId, 10) : null;
  const isAdminView = !!adminViewUserId && user?.role === "admin";

  // Own profile query (for /profile route)
  const { data: consultations, isLoading: loadingConsultations, refetch } = 
    trpc.consultation.getByUserId.useQuery(
      user?.id || 0,
      { enabled: !!user && !isAdminView }
    );

  // Admin view query (for /patient/:userId route)
  const { data: adminProfileData, isLoading: loadingAdminProfile } =
    trpc.profile.getProfileByUserId.useQuery(
      adminViewUserId || 0,
      { enabled: isAdminView && !!adminViewUserId }
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

  const isLoading = loading || loadingConsultations || loadingAdminProfile;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center">{t("loading")}</div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // If trying to access admin view without admin role, redirect
  if (adminViewUserId && user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  // Determine which data to show
  const displayConsultations = isAdminView
    ? (adminProfileData?.consultations || [])
    : (consultations || []);

  const displayUser = isAdminView
    ? adminProfileData?.user
    : user;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Admin View Banner */}
          {isAdminView && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Admin View — You are viewing {adminProfileData?.user?.name || `User #${adminViewUserId}`}'s profile
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                onClick={() => setLocation("/admin")}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Admin Panel
              </Button>
            </div>
          )}

          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {isAdminView
                      ? (displayUser?.name || `Patient #${adminViewUserId}`)
                      : (language === "ar" ? "ملفي الشخصي" : "My Profile")}
                  </CardTitle>
                  <CardDescription>
                    {displayUser?.email || displayUser?.name}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-2">
                    {displayUser?.subscriptionType === "free" && (language === "ar" ? "مجاني" : "Free")}
                    {displayUser?.subscriptionType === "pay_per_case" && (language === "ar" ? "دفع لكل حالة" : "Pay Per Case")}
                    {displayUser?.subscriptionType === "monthly" && (language === "ar" ? "اشتراك شهري" : "Monthly")}
                    {!displayUser?.subscriptionType && "Free"}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" 
                      ? `الاستشارات المتبقية: ${displayUser?.consultationsRemaining || 0}`
                      : `Consultations Remaining: ${displayUser?.consultationsRemaining || 0}`}
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
                  ? `Consultations (${displayConsultations.length})`
                  : (language === "ar" ? "استشاراتي" : "My Consultations")}
              </CardTitle>
              <CardDescription>
                {isAdminView
                  ? `All medical consultations for ${displayUser?.name || `User #${adminViewUserId}`}`
                  : (language === "ar" 
                      ? "عرض جميع استشاراتك الطبية وتقاريرك"
                      : "View all your medical consultations and reports")}
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
                              {new Date(consultation.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </CardDescription>
                          </div>
                          {consultation.isFree ? (
                            <Badge variant="secondary">
                              {language === "ar" ? "مجاني" : "Free"}
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              ${consultation.amount}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="details">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="details">
                              {language === "ar" ? "التفاصيل" : "Details"}
                            </TabsTrigger>
                            <TabsTrigger value="documents">
                              {language === "ar" ? "المستندات" : "Documents"}
                            </TabsTrigger>
                            <TabsTrigger value="responses">
                              {language === "ar" ? "الردود" : "Responses"}
                            </TabsTrigger>
                            <TabsTrigger value="questions">
                              {language === "ar" ? "الأسئلة" : "Questions"}
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="details" className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">
                                {language === "ar" ? "الأعراض" : "Symptoms"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {consultation.symptoms}
                              </p>
                            </div>
                            {consultation.medicalHistory && (
                              <div>
                                <h4 className="font-medium mb-2">
                                  {language === "ar" ? "التاريخ الطبي" : "Medical History"}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {consultation.medicalHistory}
                                </p>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="documents" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              {parseJsonArray(consultation.medicalReports).map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm truncate">
                                    {language === "ar" ? `تقرير طبي ${i + 1}` : `Medical Report ${i + 1}`}
                                  </span>
                                  <Download className="h-4 w-4 ml-auto" />
                                </a>
                              ))}
                              {parseJsonArray(consultation.labResults).map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted">
                                  <FileText className="h-4 w-4 text-green-500" />
                                  <span className="text-sm truncate">
                                    {language === "ar" ? `نتيجة مختبر ${i + 1}` : `Lab Result ${i + 1}`}
                                  </span>
                                  <Download className="h-4 w-4 ml-auto" />
                                </a>
                              ))}
                              {parseJsonArray(consultation.xrayImages).map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted">
                                  <ImageIcon className="h-4 w-4 text-purple-500" />
                                  <span className="text-sm truncate">
                                    {language === "ar" ? `صورة أشعة ${i + 1}` : `X-Ray ${i + 1}`}
                                  </span>
                                  <Download className="h-4 w-4 ml-auto" />
                                </a>
                              ))}
                              {parseJsonArray(consultation.otherDocuments).map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm truncate">
                                    {language === "ar" ? `مستند ${i + 1}` : `Document ${i + 1}`}
                                  </span>
                                  <Download className="h-4 w-4 ml-auto" />
                                </a>
                              ))}
                              {consultation.voiceNoteUrl && (
                                <a href={consultation.voiceNoteUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted">
                                  <Mic className="h-4 w-4 text-red-500" />
                                  <span className="text-sm">
                                    {language === "ar" ? "ملاحظة صوتية" : "Voice Note"}
                                  </span>
                                  <Download className="h-4 w-4 ml-auto" />
                                </a>
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent value="responses" className="space-y-4">
                            {consultation.status !== "completed" && consultation.status !== "follow_up" ? (
                              <div className="text-center py-4 text-muted-foreground">
                                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{language === "ar" ? "جاري معالجة استشارتك..." : "Your consultation is being processed..."}</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {consultation.aiAnalysis && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      {language === "ar" ? "التحليل الطبي" : "Medical Analysis"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {consultation.aiAnalysis}
                                    </p>
                                  </div>
                                )}
                                {consultation.reportUrl && (
                                  <a href={consultation.reportUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted w-full">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">
                                      {language === "ar" ? "تحميل التقرير الطبي" : "Download Medical Report"}
                                    </span>
                                    <Download className="h-4 w-4 ml-auto" />
                                  </a>
                                )}
                                {consultation.infographicUrl && (
                                  <a href={consultation.infographicUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted w-full">
                                    <ImageIcon className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">
                                      {language === "ar" ? "تحميل الإنفوغرافيك" : "Download Infographic"}
                                    </span>
                                    <Download className="h-4 w-4 ml-auto" />
                                  </a>
                                )}
                                {consultation.videoUrl && (
                                  <a href={consultation.videoUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted w-full">
                                    <Video className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium">
                                      {language === "ar" ? "مشاهدة الفيديو التوضيحي" : "Watch Explanatory Video"}
                                    </span>
                                    <Download className="h-4 w-4 ml-auto" />
                                  </a>
                                )}
                                {consultation.specialistNotes && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      {language === "ar" ? "ملاحظات الأخصائي" : "Specialist Notes"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {consultation.specialistNotes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="questions" className="space-y-4">
                            {consultation.questions && consultation.questions.length > 0 ? (
                              <div className="space-y-3">
                                {consultation.questions.map((q: any) => (
                                  <div key={q.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                                      <p className="text-sm font-medium">{q.question}</p>
                                    </div>
                                    {q.answer ? (
                                      <div className="flex items-start gap-2 pl-6">
                                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                        <p className="text-sm text-muted-foreground">{q.answer}</p>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 pl-6">
                                        <Clock className="h-4 w-4 text-yellow-500" />
                                        <p className="text-sm text-muted-foreground italic">
                                          {language === "ar" ? "في انتظار الرد..." : "Awaiting response..."}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                {language === "ar" ? "لا توجد أسئلة بعد" : "No questions yet"}
                              </p>
                            )}

                            {/* Only show ask question form for own profile (not admin view) */}
                            {!isAdminView && (
                              <div className="pt-4 border-t space-y-2">
                                <h4 className="font-medium text-sm">
                                  {language === "ar" ? "اطرح سؤالاً" : "Ask a Question"}
                                </h4>
                                <Textarea
                                  placeholder={language === "ar" ? "اكتب سؤالك هنا..." : "Type your question here..."}
                                  value={selectedConsultation === consultation.id ? questionText : ""}
                                  onChange={(e) => {
                                    setSelectedConsultation(consultation.id);
                                    setQuestionText(e.target.value);
                                  }}
                                  rows={3}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAskQuestion(consultation.id)}
                                  disabled={askQuestionMutation.isPending || selectedConsultation !== consultation.id}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  {language === "ar" ? "إرسال" : "Submit"}
                                </Button>
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

          {/* Medical Records (admin view only) */}
          {isAdminView && adminProfileData?.records && adminProfileData.records.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Medical Records ({adminProfileData.records.length})</CardTitle>
                <CardDescription>Uploaded medical documents for this patient</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {adminProfileData.records.map((record: any) => (
                    <a
                      key={record.id}
                      href={record.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{record.fileName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{record.category?.replace(/_/g, ' ')}</p>
                      </div>
                      <Download className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
