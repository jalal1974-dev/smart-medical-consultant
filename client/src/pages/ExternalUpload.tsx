import { useState, useCallback } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle, FileImage, FileText, Loader2, Clock } from "lucide-react";

const REPORT_LABELS: Record<string, { en: string; ar: string; accept: string; maxMb: number }> = {
  infographic: { en: "Infographic", ar: "إنفوجرافيك", accept: "image/png,image/jpeg,image/webp", maxMb: 10 },
  slides:      { en: "Slide Deck", ar: "عرض تقديمي", accept: "application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation", maxMb: 50 },
  pdf:         { en: "PDF Report", ar: "تقرير PDF", accept: "application/pdf", maxMb: 50 },
  mindmap:     { en: "Mind Map", ar: "خريطة ذهنية", accept: "image/png,image/jpeg,image/webp,image/gif", maxMb: 10 },
  pptx:        { en: "PPTX Report", ar: "تقرير PPTX", accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation", maxMb: 50 },
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ExternalUpload() {
  const [, params] = useRoute("/upload/:token");
  const token = params?.token ?? "";

  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const { data: tokenInfo, isLoading: validating, error: tokenError } = trpc.uploadToken.validate.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const consume = trpc.uploadToken.consume.useMutation({
    onSuccess: () => {
      setUploaded(true);
      toast.success(lang === "ar" ? "تم الرفع بنجاح! سيتلقى المريض إشعاراً." : "Upload successful! The patient will be notified.");
    },
    onError: (e) => toast.error(lang === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const reportMeta = tokenInfo ? REPORT_LABELS[tokenInfo.reportType] : null;

  const handleFile = useCallback((file: File) => {
    if (!reportMeta) return;
    const maxBytes = reportMeta.maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(lang === "ar" ? `حجم الملف يتجاوز ${reportMeta.maxMb} ميغابايت` : `File exceeds ${reportMeta.maxMb} MB`);
      return;
    }
    setSelectedFile(file);
  }, [reportMeta, lang]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleBrowse = () => {
    if (!reportMeta) return;
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = reportMeta.accept;
    inp.onchange = () => { if (inp.files?.[0]) handleFile(inp.files[0]); };
    inp.click();
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    try {
      const base64 = await readFileAsBase64(selectedFile);
      consume.mutate({ token, fileBase64: base64, mimeType: selectedFile.type, fileName: selectedFile.name });
    } catch {
      toast.error(lang === "ar" ? "فشل قراءة الملف" : "Failed to read file");
    }
  };

  const expiresIn = tokenInfo
    ? Math.max(0, Math.round((tokenInfo.expiresAt - Date.now()) / 3600000))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Language toggle */}
      <div className="mb-6 flex gap-2">
        <Button size="sm" variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>العربية</Button>
        <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>English</Button>
      </div>

      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {lang === "ar" ? "رفع ملف طبي" : "Medical File Upload"}
          </CardTitle>
          <CardDescription>
            {lang === "ar" ? "مستشارك الطبي الذكي — منصة الاستشارات الطبية" : "Smart Medical Consultant — Medical Consultation Platform"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Loading state */}
          {validating && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>{lang === "ar" ? "جارٍ التحقق من الرابط..." : "Validating link..."}</p>
            </div>
          )}

          {/* Error state */}
          {tokenError && !validating && (
            <div className="flex flex-col items-center gap-3 py-8 text-destructive text-center">
              <AlertCircle className="h-10 w-10" />
              <p className="font-semibold text-lg">
                {lang === "ar" ? "رابط غير صالح" : "Invalid Link"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tokenError.message.includes("already been used")
                  ? (lang === "ar" ? "تم استخدام هذا الرابط بالفعل." : "This link has already been used.")
                  : tokenError.message.includes("expired")
                  ? (lang === "ar" ? "انتهت صلاحية هذا الرابط." : "This link has expired.")
                  : (lang === "ar" ? "الرابط غير صالح أو منتهي الصلاحية." : "The link is invalid or has expired.")}
              </p>
            </div>
          )}

          {/* Success state */}
          {uploaded && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-lg text-green-700">
                {lang === "ar" ? "تم الرفع بنجاح!" : "Upload Successful!"}
              </p>
              <p className="text-sm text-muted-foreground">
                {lang === "ar"
                  ? "تم حفظ الملف وسيتلقى المريض إشعاراً بالبريد الإلكتروني."
                  : "The file has been saved and the patient will receive an email notification."}
              </p>
            </div>
          )}

          {/* Upload form */}
          {tokenInfo && !uploaded && !validating && (
            <>
              {/* Consultation info */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "المريض:" : "Patient:"}</span>
                  <span className="font-medium">{tokenInfo.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "نوع الملف:" : "Report type:"}</span>
                  <span className="font-medium">
                    {reportMeta ? (lang === "ar" ? reportMeta.ar : reportMeta.en) : tokenInfo.reportType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lang === "ar" ? "ينتهي خلال:" : "Expires in:"}</span>
                  <span>{expiresIn} {lang === "ar" ? "ساعة" : "hours"}</span>
                </div>
              </div>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={handleBrowse}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors
                  ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"}`}
              >
                {selectedFile ? (
                  <>
                    {selectedFile.type.startsWith("image/")
                      ? <FileImage className="h-10 w-10 text-primary" />
                      : <FileText className="h-10 w-10 text-primary" />}
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-primary underline">
                      {lang === "ar" ? "انقر لتغيير الملف" : "Click to change file"}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="font-medium text-sm">
                      {lang === "ar" ? "اسحب الملف هنا أو انقر للاختيار" : "Drag file here or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reportMeta
                        ? (lang === "ar"
                          ? `الحد الأقصى: ${reportMeta.maxMb} ميغابايت`
                          : `Max size: ${reportMeta.maxMb} MB`)
                        : ""}
                    </p>
                  </>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedFile || consume.isPending}
                onClick={handleUpload}
              >
                {consume.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{lang === "ar" ? "جارٍ الرفع..." : "Uploading..."}</>
                  : <><Upload className="h-4 w-4 mr-2" />{lang === "ar" ? "رفع الملف وإرسال للمريض" : "Upload & Send to Patient"}</>}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        {lang === "ar"
          ? "هذا الرابط للاستخدام مرة واحدة فقط ويصلح لمدة 48 ساعة."
          : "This link is single-use and valid for 48 hours."}
      </p>
    </div>
  );
}
