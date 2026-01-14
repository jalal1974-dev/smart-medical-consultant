import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Calendar, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";

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
          <h1 className="text-4xl font-bold mb-2">{t("myConsultations")}</h1>
          <p className="text-xl text-muted-foreground">
            {user?.hasUsedFreeConsultation ? t("freeConsultationUsed") : t("freeConsultation")}
          </p>
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
                  {consultation.aiAnalysis && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium mb-2">AI Analysis</p>
                      <p className="text-sm text-muted-foreground mb-3">{consultation.aiAnalysis}</p>
                      <div className="flex gap-2 flex-wrap">
                        {consultation.aiReportUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={consultation.aiReportUrl} target="_blank" rel="noopener noreferrer">
                              Download PDF Report
                            </a>
                          </Button>
                        )}
                        {consultation.aiVideoUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={consultation.aiVideoUrl} target="_blank" rel="noopener noreferrer">
                              Watch Video Explanation
                            </a>
                          </Button>
                        )}
                        {consultation.aiInfographicUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={consultation.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                              View Infographic
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
