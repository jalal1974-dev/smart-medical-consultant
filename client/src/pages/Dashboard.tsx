import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Calendar, DollarSign, FileText, Play, Headphones, Clock, Download, Presentation, Map } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { SatisfactionSurvey } from "@/components/SatisfactionSurvey";
import { ConsultationTimeline } from "@/components/ConsultationTimeline";
import { useState } from "react";

function CompletedConsultationSurvey({ consultationId, language }: { consultationId: number; language: "en" | "ar" }) {
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const { data: existingSurvey } = trpc.survey.getBySurvey.useQuery({ consultationId });

  if (existingSurvey || surveySubmitted) {
    return (
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">
          {language === "ar" ? "شكراً لك على تقييمك!" : "Thank you for your feedback!"}
        </p>
      </div>
    );
  }

  if (!showSurvey) {
    return (
      <div className="mt-4">
        <Button onClick={() => setShowSurvey(true)} variant="outline" className="w-full">
          {language === "ar" ? "قيّم تجربتك" : "Rate Your Experience"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <SatisfactionSurvey
        consultationId={consultationId}
        onComplete={() => {
          setSurveySubmitted(true);
          setShowSurvey(false);
        }}
      />
    </div>
  );
}

function ContinueWatchingSection({ language }: { language: "en" | "ar" }) {
  const { data: continueWatching, isLoading } = trpc.media.getContinueWatching.useQuery();

  if (isLoading) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          {language === "en" ? "Continue Watching" : "استكمال المشاهدة"}
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardHeader>
                <div className="h-6 bg-muted rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!continueWatching || continueWatching.length === 0) {
    return null; // Don't show section if no items
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {language === "en" ? "Continue Watching" : "استكمال المشاهدة"}
        </h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {continueWatching.map((item) => {
          const media = item.media as any;
          if (!media) return null;

          const title = language === "en" ? media.titleEn : media.titleAr;
          const progressPercent = (item.progress / item.duration) * 100;
          const remainingTime = Math.ceil((item.duration - item.progress) / 60); // minutes

          const linkPath = item.mediaType === "video" ? "/videos" : "/podcasts";

          return (
            <Link key={`${item.mediaType}-${item.mediaId}`} href={linkPath}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="relative aspect-video bg-muted">
                  {media.thumbnailUrl ? (
                    <img
                      src={media.thumbnailUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.mediaType === "video" ? (
                        <Play className="w-12 h-12 text-muted-foreground" />
                      ) : (
                        <Headphones className="w-12 h-12 text-primary" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    {item.mediaType === "video" ? (
                      <Play className="w-12 h-12 text-white" />
                    ) : (
                      <Headphones className="w-12 h-12 text-white" />
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-base">{title}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    {language === "en"
                      ? `${remainingTime} min remaining`
                      : `${remainingTime} دقيقة متبقية`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const { data: consultations, isLoading: consultationsLoading } = trpc.consultation.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading || consultationsLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-12">
        <div className="container max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard")}</CardTitle>
              <CardDescription>{t("loginRequired")}</CardDescription>
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {t(status as any)}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      refunded: "outline",
    };
    const labels: Record<string, string> = {
      pending: t("paymentRequired"),
      completed: t("paymentCompleted"),
      failed: t("paymentFailed"),
      refunded: "Refunded",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("dashboard")}</h1>
          <p className="text-xl text-muted-foreground">
            {user?.hasUsedFreeConsultation ? t("freeConsultationUsed") : t("freeConsultation")}
          </p>
        </div>

        {/* Continue Watching Section */}
        <ContinueWatchingSection language={language} />

        {/* Consultations Section */}
        <div className="mt-12 mb-6">
          <h2 className="text-2xl font-bold">{t("myConsultations")}</h2>
        </div>

        {!consultations || consultations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">{t("noConsultations")}</p>
              <Button asChild>
                <a href="/consultations">{t("bookConsultation")}</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card key={consultation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {consultation.patientName}
                        {consultation.isFree && (
                          <Badge variant="outline">{t("free")}</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{consultation.patientEmail}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {(() => {
                        const priority = consultation.priority || 'routine';
                        switch (priority) {
                          case 'critical':
                            return <Badge variant="destructive" className="gap-1">🔴 {language === "ar" ? "حرج" : "Critical"}</Badge>;
                          case 'urgent':
                            return <Badge variant="default" className="gap-1 bg-orange-500">🟠 {language === "ar" ? "عاجل" : "Urgent"}</Badge>;
                          default:
                            return <Badge variant="secondary" className="gap-1">🔵 {language === "ar" ? "روتيني" : "Routine"}</Badge>;
                        }
                      })()}
                      {getStatusBadge(consultation.status)}
                      {getPaymentBadge(consultation.paymentStatus)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{t("consultationReason")}</p>
                          <p className="text-sm text-muted-foreground">{consultation.symptoms}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Submitted Date</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(consultation.createdAt), "PPpp")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{t("amount")}</p>
                          <p className="text-sm text-muted-foreground">
                            {consultation.isFree ? t("free") : `$${consultation.amount}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="text-sm font-medium">{t("preferredLanguage")}</p>
                          <p className="text-sm text-muted-foreground">
                            {consultation.preferredLanguage === "en" ? "English" : "العربية"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {consultation.specialistNotes && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Specialist Notes</p>
                      <p className="text-sm text-muted-foreground">{consultation.specialistNotes}</p>
                    </div>
                  )}
                  {/* Uploaded Medical Documents */}
                  {(consultation.medicalReports?.length > 0 || consultation.labResults?.length > 0 || consultation.xrayImages?.length > 0 || consultation.otherDocuments?.length > 0) && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                      <p className="text-sm font-medium mb-3">{language === "ar" ? "المستندات الطبية المرفقة" : "Uploaded Medical Documents"}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {consultation.medicalReports && JSON.parse(consultation.medicalReports).map((url: string, idx: number) => (
                          <Button key={idx} size="sm" variant="outline" asChild className="justify-start">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              {language === "ar" ? `تقرير طبي ${idx + 1}` : `Medical Report ${idx + 1}`}
                            </a>
                          </Button>
                        ))}
                        {consultation.labResults && JSON.parse(consultation.labResults).map((url: string, idx: number) => (
                          <Button key={idx} size="sm" variant="outline" asChild className="justify-start">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              {language === "ar" ? `نتيجة تحليل ${idx + 1}` : `Lab Result ${idx + 1}`}
                            </a>
                          </Button>
                        ))}
                        {consultation.xrayImages && JSON.parse(consultation.xrayImages).map((url: string, idx: number) => (
                          <Button key={idx} size="sm" variant="outline" asChild className="justify-start">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              {language === "ar" ? `صورة أشعة ${idx + 1}` : `X-ray Image ${idx + 1}`}
                            </a>
                          </Button>
                        ))}
                        {consultation.otherDocuments && JSON.parse(consultation.otherDocuments).map((url: string, idx: number) => (
                          <Button key={idx} size="sm" variant="outline" asChild className="justify-start">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              {language === "ar" ? `مستند ${idx + 1}` : `Document ${idx + 1}`}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Consultation Timeline */}
                  <div className="mt-4">
                    <ConsultationTimeline
                      consultationStatus={consultation.status}
                      createdAt={new Date(consultation.createdAt)}
                      language={language}
                    />
                  </div>
                  {consultation.aiAnalysis && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium mb-2">{language === "ar" ? "التحليل الطبي" : "Medical Analysis"}</p>
                      <p className="text-sm text-muted-foreground mb-3">{consultation.aiAnalysis}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {consultation.aiReportUrl && (
                          <Button size="sm" variant="outline" asChild className="justify-start">
                            <a href={consultation.aiReportUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              {language === "ar" ? "التقرير الطبي" : "Medical Report"}
                            </a>
                          </Button>
                        )}
                        {consultation.aiInfographicUrl && (
                          <Button size="sm" variant="outline" asChild className="justify-start">
                            <a href={consultation.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              {language === "ar" ? "الإنفوجرافيك" : "Infographic"}
                            </a>
                          </Button>
                        )}
                        {consultation.aiSlideDeckUrl && (
                          <Button size="sm" variant="outline" asChild className="justify-start">
                            <a href={consultation.aiSlideDeckUrl} target="_blank" rel="noopener noreferrer">
                              <Presentation className="w-4 h-4 mr-2" />
                              {language === "ar" ? "العرض التقديمي" : "Slide Deck"}
                            </a>
                          </Button>
                        )}
                        {consultation.aiMindMapUrl && (
                          <Button size="sm" variant="outline" asChild className="justify-start">
                            <a href={consultation.aiMindMapUrl} target="_blank" rel="noopener noreferrer">
                              <Map className="w-4 h-4 mr-2" />
                              {language === "ar" ? "الخريطة الذهنية" : "Mind Map"}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {consultation.followUpNotes && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-medium mb-1">Treatment Follow-up</p>
                      <p className="text-sm text-muted-foreground">{consultation.followUpNotes}</p>
                      {consultation.followUpStatus && (
                        <Badge className="mt-2" variant={consultation.followUpStatus === 'approved' ? 'default' : consultation.followUpStatus === 'concerns' ? 'destructive' : 'secondary'}>
                          {consultation.followUpStatus}
                        </Badge>
                      )}
                    </div>
                  )}
                  {/* Show satisfaction survey for completed consultations */}
                  {consultation.status === 'completed' && (
                    <CompletedConsultationSurvey consultationId={consultation.id} language={language} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
