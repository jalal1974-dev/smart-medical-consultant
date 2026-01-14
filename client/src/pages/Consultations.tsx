import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Consultations() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    description: "",
    language: language,
    scheduledAt: "",
  });

  const createConsultation = trpc.consultation.create.useMutation({
    onSuccess: () => {
      toast.success(t("consultationBooked"));
      setFormData({
        patientName: "",
        patientEmail: "",
        patientPhone: "",
        description: "",
        language: language,
        scheduledAt: "",
      });
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("consultationError"));
    },
  });

  const handleSubmit = (e: React.FormEvent, isFree: boolean) => {
    e.preventDefault();
    
    if (!formData.patientName || !formData.patientEmail || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    createConsultation.mutate({
      ...formData,
      isFree,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container max-w-3xl">
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
        <div className="container max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{t("consultationTitle")}</CardTitle>
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

  const hasFreeConsultation = !user?.hasUsedFreeConsultation;

  return (
    <div className="min-h-screen py-12">
      <div className="container max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("consultationTitle")}</h1>
          <p className="text-xl text-muted-foreground">{t("heroSubtitle")}</p>
        </div>

        {hasFreeConsultation && (
          <Alert className="mb-6 border-primary">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle>{t("freeConsultation")}</AlertTitle>
            <AlertDescription>
              You are eligible for one free consultation. Book now to get started!
            </AlertDescription>
          </Alert>
        )}

        {!hasFreeConsultation && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("freeConsultationUsed")}</AlertTitle>
            <AlertDescription>
              {t("consultationFee")}: $50.00
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("consultationTitle")}</CardTitle>
            <CardDescription>
              Fill in the form below to book your consultation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="patientName">{t("patientName")} *</Label>
                <Input
                  id="patientName"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientEmail">{t("patientEmail")} *</Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={formData.patientEmail}
                  onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientPhone">{t("patientPhone")}</Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={formData.patientPhone}
                  onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{t("preferredLanguage")} *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value as "en" | "ar" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">{t("scheduleDate")}</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("consultationReason")} *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              <div className="flex gap-4">
                {hasFreeConsultation && (
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={createConsultation.isPending}
                    className="flex-1"
                  >
                    {createConsultation.isPending ? t("loading") : t("bookFree")}
                  </Button>
                )}
                {!hasFreeConsultation && (
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, false)}
                    disabled={createConsultation.isPending}
                    className="flex-1"
                  >
                    {createConsultation.isPending ? t("loading") : `${t("payNow")} - $50.00`}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
