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
                          <p className="text-sm text-muted-foreground">{consultation.description}</p>
                        </div>
                      </div>
                      {consultation.scheduledAt && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{t("scheduleDate")}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(consultation.scheduledAt), "PPpp")}
                            </p>
                          </div>
                        </div>
                      )}
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
                            {consultation.language === "en" ? "English" : "العربية"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {consultation.adminNotes && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Admin Notes</p>
                      <p className="text-sm text-muted-foreground">{consultation.adminNotes}</p>
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
