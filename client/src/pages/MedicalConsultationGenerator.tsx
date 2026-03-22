import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  FileDown,
  Loader2,
  Stethoscope,
  User,
  ClipboardList,
  Pill,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface FormData {
  patientName: string;
  age: string;
  gender: string;
  symptoms: string;
  medicalHistory: string;
  medications: string;
  language: "ar" | "en";
}

const INITIAL_FORM: FormData = {
  patientName: "",
  age: "",
  gender: "",
  symptoms: "",
  medicalHistory: "",
  medications: "",
  language: "ar",
};

const LABELS = {
  ar: {
    pageTitle: "توليد الاستشارة الطبية",
    pageDesc: "أدخل بيانات المريض لتوليد تقرير استشارة طبية احترافي بصيغة PowerPoint",
    patientName: "اسم المريض",
    patientNamePlaceholder: "أدخل اسم المريض الكامل",
    age: "العمر",
    agePlaceholder: "مثال: 45",
    gender: "الجنس",
    genderPlaceholder: "اختر الجنس",
    male: "ذكر",
    female: "أنثى",
    symptoms: "الأعراض الحالية",
    symptomsPlaceholder: "صف أعراض المريض بالتفصيل...",
    medicalHistory: "التاريخ الطبي (اختياري)",
    medicalHistoryPlaceholder: "الأمراض المزمنة، العمليات السابقة...",
    medications: "الأدوية الحالية (اختياري)",
    medicationsPlaceholder: "أسماء الأدوية والجرعات...",
    language: "لغة التقرير",
    arabic: "العربية",
    english: "الإنجليزية",
    generate: "توليد الاستشارة",
    generating: "جاري التوليد...",
    generatingDesc: "يتم تحليل البيانات وإنشاء التقرير (2-5 ثوانٍ)...",
    successTitle: "تم توليد التقرير بنجاح!",
    successDesc: "تم إنشاء ملف PowerPoint وبدأ التحميل تلقائياً.",
    downloadAgain: "تحميل مرة أخرى",
    newConsultation: "استشارة جديدة",
    errorTitle: "فشل توليد التقرير",
    retry: "إعادة المحاولة",
    required: "هذا الحقل مطلوب",
    symptomsRequired: "يرجى وصف الأعراض (5 أحرف على الأقل)",
    loginRequired: "يجب تسجيل الدخول أولاً",
  },
  en: {
    pageTitle: "Medical Consultation Generator",
    pageDesc: "Enter patient data to generate a professional medical consultation report in PowerPoint format",
    patientName: "Patient Name",
    patientNamePlaceholder: "Enter full patient name",
    age: "Age",
    agePlaceholder: "e.g. 45",
    gender: "Gender",
    genderPlaceholder: "Select gender",
    male: "Male",
    female: "Female",
    symptoms: "Current Symptoms",
    symptomsPlaceholder: "Describe the patient's symptoms in detail...",
    medicalHistory: "Medical History (optional)",
    medicalHistoryPlaceholder: "Chronic conditions, previous surgeries...",
    medications: "Current Medications (optional)",
    medicationsPlaceholder: "Medication names and dosages...",
    language: "Report Language",
    arabic: "Arabic",
    english: "English",
    generate: "Generate Consultation",
    generating: "Generating...",
    generatingDesc: "Analyzing data and creating report (2-5 seconds)...",
    successTitle: "Report Generated Successfully!",
    successDesc: "The PowerPoint file has been created and download started automatically.",
    downloadAgain: "Download Again",
    newConsultation: "New Consultation",
    errorTitle: "Report Generation Failed",
    retry: "Retry",
    required: "This field is required",
    symptomsRequired: "Please describe symptoms (at least 5 characters)",
    loginRequired: "Please log in first",
  },
};

export default function MedicalConsultationGenerator() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language: appLanguage } = useLanguage();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, language: appLanguage === "ar" ? "ar" : "en" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [lastResult, setLastResult] = useState<{ downloadUrl: string; filename: string } | null>(null);

  const L = LABELS[appLanguage === "ar" ? "ar" : "en"];
  const isRtl = appLanguage === "ar";

  const generateMutation = trpc.generate.consultationPptx.useMutation({
    onSuccess: (data) => {
      setLastResult({ downloadUrl: data.downloadUrl, filename: data.filename });
      triggerDownload(data.downloadUrl, data.filename);
      toast.success(L.successTitle, { description: L.successDesc });
    },
    onError: (error) => {
      toast.error(L.errorTitle, { description: error.message });
    },
  });

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.patientName.trim()) newErrors.patientName = L.required;
    if (form.symptoms.trim().length < 5) newErrors.symptoms = L.symptomsRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(L.loginRequired);
      setLocation("/login");
      return;
    }
    if (!validate()) return;

    generateMutation.mutate({
      patientName: form.patientName.trim(),
      age: form.age ? parseInt(form.age, 10) : undefined,
      gender: form.gender || undefined,
      symptoms: form.symptoms.trim(),
      medicalHistory: form.medicalHistory.trim() || undefined,
      medications: form.medications.trim() || undefined,
      language: form.language,
    });
  };

  const handleReset = () => {
    setForm({ ...INITIAL_FORM, language: form.language });
    setErrors({});
    setLastResult(null);
    generateMutation.reset();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isRtl ? "dir-rtl" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Page Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{L.pageTitle}</h1>
            <p className="text-muted-foreground">{L.pageDesc}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                Claude AI
              </Badge>
              <Badge variant="outline" className="text-xs">
                <FileDown className="h-3 w-3 mr-1 text-blue-500" />
                PowerPoint (.pptx)
              </Badge>
              <Badge variant="outline" className="text-xs">
                ⚡ 2-5 seconds
              </Badge>
            </div>
          </div>

          {/* Success State */}
          {lastResult && !generateMutation.isPending && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">{L.successTitle}</p>
                      <p className="text-sm text-green-700 dark:text-green-400">{L.successDesc}</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1 font-mono">{lastResult.filename}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300"
                        onClick={() => triggerDownload(lastResult.downloadUrl, lastResult.filename)}
                      >
                        <FileDown className="h-3 w-3 mr-1" />
                        {L.downloadAgain}
                      </Button>
                      <Button size="sm" onClick={handleReset}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {L.newConsultation}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {L.patientName.split(" ")[0]} {isRtl ? "بيانات المريض" : "Patient Information"}
              </CardTitle>
              <CardDescription>{L.pageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Language Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">{L.language}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={form.language === "ar" ? "default" : "outline"}
                      onClick={() => setForm(f => ({ ...f, language: "ar" }))}
                    >
                      {L.arabic}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.language === "en" ? "default" : "outline"}
                      onClick={() => setForm(f => ({ ...f, language: "en" }))}
                    >
                      {L.english}
                    </Button>
                  </div>
                </div>

                {/* Patient Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="patientName" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {L.patientName} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientName"
                    placeholder={L.patientNamePlaceholder}
                    value={form.patientName}
                    onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                    className={errors.patientName ? "border-destructive" : ""}
                    dir="auto"
                  />
                  {errors.patientName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.patientName}
                    </p>
                  )}
                </div>

                {/* Age + Gender row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="age">{L.age}</Label>
                    <Input
                      id="age"
                      type="number"
                      min={1}
                      max={120}
                      placeholder={L.agePlaceholder}
                      value={form.age}
                      onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">{L.gender}</Label>
                    <Select
                      value={form.gender}
                      onValueChange={v => setForm(f => ({ ...f, gender: v }))}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder={L.genderPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={form.language === "ar" ? "ذكر" : "male"}>
                          {L.male}
                        </SelectItem>
                        <SelectItem value={form.language === "ar" ? "أنثى" : "female"}>
                          {L.female}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="space-y-1.5">
                  <Label htmlFor="symptoms" className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {L.symptoms} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="symptoms"
                    placeholder={L.symptomsPlaceholder}
                    value={form.symptoms}
                    onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
                    rows={4}
                    className={errors.symptoms ? "border-destructive" : ""}
                    dir="auto"
                  />
                  {errors.symptoms && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.symptoms}
                    </p>
                  )}
                </div>

                {/* Medical History */}
                <div className="space-y-1.5">
                  <Label htmlFor="medicalHistory" className="flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {L.medicalHistory}
                  </Label>
                  <Textarea
                    id="medicalHistory"
                    placeholder={L.medicalHistoryPlaceholder}
                    value={form.medicalHistory}
                    onChange={e => setForm(f => ({ ...f, medicalHistory: e.target.value }))}
                    rows={3}
                    dir="auto"
                  />
                </div>

                {/* Medications */}
                <div className="space-y-1.5">
                  <Label htmlFor="medications" className="flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5" />
                    {L.medications}
                  </Label>
                  <Textarea
                    id="medications"
                    placeholder={L.medicationsPlaceholder}
                    value={form.medications}
                    onChange={e => setForm(f => ({ ...f, medications: e.target.value }))}
                    rows={2}
                    dir="auto"
                  />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  {generateMutation.isPending ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="font-medium">{L.generating}</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">{L.generatingDesc}</p>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full animate-pulse w-3/4" />
                      </div>
                    </div>
                  ) : generateMutation.isError ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{generateMutation.error?.message}</p>
                      </div>
                      <Button type="submit" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {L.retry}
                      </Button>
                    </div>
                  ) : (
                    <Button type="submit" className="w-full" size="lg" disabled={!isAuthenticated}>
                      <FileDown className="h-4 w-4 mr-2" />
                      {L.generate}
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
