import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Header } from "@/components/Header";
import { useLocation } from "wouter";
import { FileUpload } from "@/components/FileUpload";

export default function Consultations() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const createMutation = trpc.consultation.create.useMutation();

  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    symptoms: "",
    medicalHistory: "",
    preferredLanguage: language as "en" | "ar",
  });

  // File upload states (URLs will be stored after upload to S3)
  const [medicalReports, setMedicalReports] = useState<string[]>([]);
  const [labResults, setLabResults] = useState<string[]>([]);
  const [xrayImages, setXrayImages] = useState<string[]>([]);
  const [otherDocuments, setOtherDocuments] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent, isFree: boolean) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error(t("loginRequired"));
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        ...formData,
        medicalReports,
        labResults,
        xrayImages,
        otherDocuments,
        isFree,
      });

      toast.success(t("consultationBooked"));
      
      // Redirect to payment confirmation page
      setLocation(`/payment-confirmation/${result.consultationId}`);
    } catch (error: any) {
      toast.error(error.message || t("consultationError"));
    }
  };

  const handleFileUploadComplete = (
    url: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => [...prev, url]);
  };

  const handleFileRemove = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
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
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card className="max-w-2xl mx-auto">
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
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t("consultationTitle")}</CardTitle>
              <CardDescription>
                {language === "ar" 
                  ? "قدم معلوماتك الطبية وسنقوم بتحليلها باستخدام الذكاء الاصطناعي تحت إشراف أطبائنا المتخصصين"
                  : "Submit your medical information and we'll analyze it using AI under the supervision of our medical specialists"}
              </CardDescription>
              {!user?.hasUsedFreeConsultation && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t("freeConsultation")}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => handleSubmit(e, !user?.hasUsedFreeConsultation)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    {language === "ar" ? "المعلومات الأساسية" : "Basic Information"}
                  </h3>
                  
                  <div>
                    <Label htmlFor="patientName">{t("patientName")}</Label>
                    <Input
                      id="patientName"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="patientEmail">{t("patientEmail")}</Label>
                    <Input
                      id="patientEmail"
                      type="email"
                      value={formData.patientEmail}
                      onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="patientPhone">{t("patientPhone")}</Label>
                    <Input
                      id="patientPhone"
                      type="tel"
                      value={formData.patientPhone}
                      onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferredLanguage">{t("preferredLanguage")}</Label>
                    <Select
                      value={formData.preferredLanguage}
                      onValueChange={(value: "en" | "ar") => setFormData({ ...formData, preferredLanguage: value })}
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
                </div>

                {/* Medical Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    {language === "ar" ? "المعلومات الطبية" : "Medical Information"}
                  </h3>

                  <div>
                    <Label htmlFor="symptoms">
                      {language === "ar" ? "الأعراض الرئيسية" : "Main Symptoms"}
                    </Label>
                    <Textarea
                      id="symptoms"
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      placeholder={language === "ar" 
                        ? "صف الأعراض التي تعاني منها بالتفصيل..."
                        : "Describe your symptoms in detail..."}
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="medicalHistory">
                      {language === "ar" ? "التاريخ الطبي" : "Medical History"}
                    </Label>
                    <Textarea
                      id="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                      placeholder={language === "ar" 
                        ? "الأمراض السابقة، العمليات الجراحية، الأدوية الحالية..."
                        : "Previous illnesses, surgeries, current medications..."}
                      rows={4}
                    />
                  </div>
                </div>

                {/* File Uploads */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    {language === "ar" ? "المستندات الطبية" : "Medical Documents"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" 
                      ? "قم بتحميل التقارير الطبية، نتائج التحاليل، الأشعة، أو أي مستندات طبية أخرى"
                      : "Upload medical reports, lab results, X-rays, or any other medical documents"}
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Medical Reports */}
                    <FileUpload
                      category="medical_report"
                      label={language === "ar" ? "التقارير الطبية" : "Medical Reports"}
                      description={language === "ar" ? "ملفات PDF أو Word" : "PDF or Word files"}
                      onUploadComplete={(url) => handleFileUploadComplete(url, setMedicalReports)}
                      onRemove={() => handleFileRemove(medicalReports.length - 1, setMedicalReports)}
                    />

                    {/* Lab Results */}
                    <FileUpload
                      category="lab_result"
                      label={language === "ar" ? "نتائج التحاليل" : "Lab Results"}
                      description={language === "ar" ? "ملفات PDF أو صور" : "PDF or image files"}
                      onUploadComplete={(url) => handleFileUploadComplete(url, setLabResults)}
                      onRemove={() => handleFileRemove(labResults.length - 1, setLabResults)}
                    />

                    {/* X-ray Images */}
                    <FileUpload
                      category="xray"
                      label={language === "ar" ? "صور الأشعة" : "X-ray Images"}
                      description={language === "ar" ? "صور الأشعة السينية" : "X-ray image files"}
                      onUploadComplete={(url) => handleFileUploadComplete(url, setXrayImages)}
                      onRemove={() => handleFileRemove(xrayImages.length - 1, setXrayImages)}
                    />

                    {/* Other Documents */}
                    <FileUpload
                      category="other"
                      label={language === "ar" ? "مستندات أخرى" : "Other Documents"}
                      description={language === "ar" ? "أي مستندات طبية أخرى" : "Any other medical documents"}
                      onUploadComplete={(url) => handleFileUploadComplete(url, setOtherDocuments)}
                      onRemove={() => handleFileRemove(otherDocuments.length - 1, setOtherDocuments)}
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  {!user?.hasUsedFreeConsultation ? (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={createMutation.isPending}
                      className="flex-1"
                    >
                      {createMutation.isPending ? t("loading") : t("bookFree")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      disabled={createMutation.isPending}
                      onClick={(e) => handleSubmit(e as any, false)}
                      className="flex-1"
                    >
                      {createMutation.isPending ? t("loading") : `${t("submit")} - $5`}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
