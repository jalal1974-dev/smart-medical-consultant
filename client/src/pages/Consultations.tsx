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
import { Upload, FileText, Image as ImageIcon, FlaskConical, FileStack } from "lucide-react";
import { Header } from "@/components/Header";

export default function Consultations() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
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
      
      // Reset form
      setFormData({
        patientName: "",
        patientEmail: "",
        patientPhone: "",
        symptoms: "",
        medicalHistory: "",
        preferredLanguage: language as "en" | "ar",
      });
      setMedicalReports([]);
      setLabResults([]);
      setXrayImages([]);
      setOtherDocuments([]);

      // If not free, redirect to payment (PayPal integration would go here)
      if (!isFree) {
        toast.info(t("paymentRequired"));
        // TODO: Integrate PayPal payment
      }
    } catch (error: any) {
      toast.error(error.message || t("consultationError"));
    }
  };

  // Simulated file upload handler (in production, this would upload to S3)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const files = e.target.files;
    if (!files) return;

    // TODO: Implement actual S3 upload using storagePut
    // For now, we'll simulate with local file names
    const fileUrls = Array.from(files).map(f => `https://storage.example.com/${f.name}`);
    setter(prev => [...prev, ...fileUrls]);
    toast.success(`${files.length} file(s) uploaded`);
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
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <Label htmlFor="medicalReports" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="h-5 w-5" />
                        {language === "ar" ? "التقارير الطبية" : "Medical Reports"}
                      </Label>
                      <Input
                        id="medicalReports"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, setMedicalReports)}
                        className="mt-2"
                      />
                      {medicalReports.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {medicalReports.length} {language === "ar" ? "ملف" : "file(s)"}
                        </p>
                      )}
                    </div>

                    {/* Lab Results */}
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <Label htmlFor="labResults" className="flex items-center gap-2 cursor-pointer">
                        <FlaskConical className="h-5 w-5" />
                        {language === "ar" ? "نتائج التحاليل" : "Lab Results"}
                      </Label>
                      <Input
                        id="labResults"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, setLabResults)}
                        className="mt-2"
                      />
                      {labResults.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {labResults.length} {language === "ar" ? "ملف" : "file(s)"}
                        </p>
                      )}
                    </div>

                    {/* X-ray Images */}
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <Label htmlFor="xrayImages" className="flex items-center gap-2 cursor-pointer">
                        <ImageIcon className="h-5 w-5" />
                        {language === "ar" ? "صور الأشعة" : "X-ray Images"}
                      </Label>
                      <Input
                        id="xrayImages"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.dicom"
                        onChange={(e) => handleFileUpload(e, setXrayImages)}
                        className="mt-2"
                      />
                      {xrayImages.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {xrayImages.length} {language === "ar" ? "ملف" : "file(s)"}
                        </p>
                      )}
                    </div>

                    {/* Other Documents */}
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <Label htmlFor="otherDocuments" className="flex items-center gap-2 cursor-pointer">
                        <FileStack className="h-5 w-5" />
                        {language === "ar" ? "مستندات أخرى" : "Other Documents"}
                      </Label>
                      <Input
                        id="otherDocuments"
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e, setOtherDocuments)}
                        className="mt-2"
                      />
                      {otherDocuments.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {otherDocuments.length} {language === "ar" ? "ملف" : "file(s)"}
                        </p>
                      )}
                    </div>
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
