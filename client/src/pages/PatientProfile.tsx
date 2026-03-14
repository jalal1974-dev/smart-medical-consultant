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
  Send
} from "lucide-react";
import { useLocation } from "wouter";

export default function PatientProfile() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedConsultation, setSelectedConsultation] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");

  const { data: consultations, isLoading: loadingConsultations, refetch } = 
    trpc.consultation.getByUserId.useQuery(
      user?.id || 0,
      { enabled: !!user }
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

    askQuestionMutation.mutate({
      consultationId,
      question: questionText,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-500";
      case "ai_processing":
        return "bg-yellow-500";
      case "specialist_review":
        return "bg-orange-500";
      case "completed":
        return "bg-green-500";
      case "follow_up":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <Clock className="h-4 w-4" />;
      case "ai_processing":
        return <AlertCircle className="h-4 w-4 animate-pulse" />;
      case "specialist_review":
        return <FileText className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "follow_up":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  if (loading || loadingConsultations) {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {language === "ar" ? "ملفي الشخصي" : "My Profile"}
                  </CardTitle>
                  <CardDescription>
                    {user?.name || user?.email}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-2">
                    {user?.subscriptionType === "free" && (language === "ar" ? "مجاني" : "Free")}
                    {user?.subscriptionType === "pay_per_case" && (language === "ar" ? "دفع لكل حالة" : "Pay Per Case")}
                    {user?.subscriptionType === "monthly" && (language === "ar" ? "اشتراك شهري" : "Monthly")}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" 
                      ? `الاستشارات المتبقية: ${user?.consultationsRemaining || 0}`
                      : `Consultations Remaining: ${user?.consultationsRemaining || 0}`}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Consultations List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "ar" ? "استشاراتي" : "My Consultations"}
              </CardTitle>
              <CardDescription>
                {language === "ar" 
                  ? "عرض جميع استشاراتك الطبية وتقاريرك"
                  : "View all your medical consultations and reports"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!consultations || consultations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === "ar" 
                    ? "لا توجد استشارات بعد"
                    : "No consultations yet"}
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation: any) => (
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
                            {/* Uploaded Documents */}
                            <div className="grid gap-4 md:grid-cols-2">
                              {parseJsonArray(consultation.medicalReports).length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {language === "ar" ? "التقارير الطبية" : "Medical Reports"}
                                  </h4>
                                  <div className="space-y-2">
                                    {parseJsonArray(consultation.medicalReports).map((url, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                        asChild
                                      >
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
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                        asChild
                                      >
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
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                        asChild
                                      >
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
                                {/* AI Generated Reports — only show when approved by admin */}
                                {consultation.aiReportUrl && consultation.reportApproved && (
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

                                {/* Infographic — only show when approved by admin */}
                                {consultation.aiInfographicUrl && consultation.infographicApproved && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <ImageIcon className="h-4 w-4" />
                                      {language === "ar" ? "الرسومات التوضيحية" : "Infographic"}
                                    </h4>
                                    <Button variant="outline" asChild>
                                      <a href={consultation.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4 mr-2" />
                                        {language === "ar" ? "عرض الرسم" : "View Infographic"}
                                      </a>
                                    </Button>
                                  </div>
                                )}

                                {/* Slide Deck — only show when approved by admin */}
                                {consultation.aiSlideDeckUrl && consultation.slideDeckApproved && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <Download className="h-4 w-4" />
                                      {language === "ar" ? "عرض الشرائح" : "Slide Deck"}
                                    </h4>
                                    <Button variant="outline" asChild>
                                      <a href={consultation.aiSlideDeckUrl} target="_blank" rel="noopener noreferrer" download>
                                        <Download className="h-4 w-4 mr-2" />
                                        {language === "ar" ? "تحميل العرض" : "Download Slides"}
                                      </a>
                                    </Button>
                                  </div>
                                )}

                                {/* Explanation Videos */}
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

                                {/* Audio Explanations */}
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

                                {/* Specialist Notes */}
                                {consultation.specialistNotes && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      {language === "ar" ? "ملاحظات الأخصائي" : "Specialist Notes"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {consultation.specialistNotes}
                                    </p>
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
                            {/* Ask Question Form */}
                            <div className="space-y-2">
                              <h4 className="font-medium">
                                {language === "ar" ? "اطرح سؤالاً" : "Ask a Question"}
                              </h4>
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

                            {/* Previous Questions */}
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
                                        <p className="font-medium text-sm">
                                          {language === "ar" ? "السؤال:" : "Question:"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{q.question}</p>
                                      </div>
                                      {q.answer ? (
                                        <div>
                                          <p className="font-medium text-sm text-green-600">
                                            {language === "ar" ? "الإجابة:" : "Answer:"}
                                          </p>
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
    </div>
  );
}
