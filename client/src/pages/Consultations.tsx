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

  const handleWhatsAppSubmit = () => {
    // Validate required fields
    if (!formData.patientName || !formData.patientEmail || !formData.symptoms) {
      toast.error(language === "ar" ? "الرجاء ملء الحقول المطلوبة" : "Please fill in required fields");
      return;
    }

    // Build WhatsApp message
    let message = `🏥 *استشارة طبية جديدة / New Medical Consultation*\n\n` +
      `👤 *${language === "ar" ? "اسم المريض" : "Patient Name"}:* ${formData.patientName}\n` +
      `📧 *${language === "ar" ? "البريد الإلكتروني" : "Email"}:* ${formData.patientEmail}\n` +
      `📞 *${language === "ar" ? "الهاتف" : "Phone"}:* ${formData.patientPhone || "N/A"}\n` +
      `🌐 *${language === "ar" ? "اللغة المفضلة" : "Preferred Language"}:* ${formData.preferredLanguage === "ar" ? "العربية" : "English"}\n\n` +
      `🩺 *${language === "ar" ? "الأعراض الرئيسية" : "Main Symptoms"}:*\n${formData.symptoms}\n\n` +
      `📋 *${language === "ar" ? "التاريخ الطبي" : "Medical History"}:*\n${formData.medicalHistory || "N/A"}\n\n`;

    // Add document counts if any
    let documentsInfo = "";
    if (medicalReports.length > 0) documentsInfo += `📄 ${language === "ar" ? "تقارير طبية" : "Medical Reports"}: ${medicalReports.length}\n`;
    if (labResults.length > 0) documentsInfo += `🧪 ${language === "ar" ? "نتائج تحاليل" : "Lab Results"}: ${labResults.length}\n`;
    if (xrayImages.length > 0) documentsInfo += `🩻 ${language === "ar" ? "صور أشعة" : "X-ray Images"}: ${xrayImages.length}\n`;
    if (otherDocuments.length > 0) documentsInfo += `📎 ${language === "ar" ? "مستندات أخرى" : "Other Documents"}: ${otherDocuments.length}\n`;
    
    if (documentsInfo) {
      message += `\n*${language === "ar" ? "المستندات المرفقة" : "Attached Documents"}:*\n${documentsInfo}`;
    }

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/00962777066005?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, "_blank");
    
    toast.success(language === "ar" ? "سيتم فتح واتساب..." : "Opening WhatsApp...");
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
                <div className="space-y-4">
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
                  
                  {/* WhatsApp Submission Option */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {language === "ar" ? "أو" : "Or"}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={handleWhatsAppSubmit}
                    className="w-full gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    {language === "ar" ? "إرسال عبر واتساب" : "Submit via WhatsApp"}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    {language === "ar" 
                      ? "سيتم فتح واتساب مع رسالة جاهزة تحتوي على معلومات الاستشارة"
                      : "WhatsApp will open with a pre-filled message containing your consultation details"}
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
