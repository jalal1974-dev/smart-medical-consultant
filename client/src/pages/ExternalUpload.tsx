import { useState, useCallback, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle, FileImage, FileText, Loader2, Clock, X, Image } from "lucide-react";

const REPORT_META: Record<string, { en: string; ar: string; accept: string; maxMb: number; hint_en: string; hint_ar: string; isImage: boolean }> = {
  infographic: {
    en: "Infographic", ar: "إنفوجرافيك",
    accept: "image/png,image/jpeg,image/webp",
    maxMb: 10,
    hint_en: "PNG, JPG, or WEBP image — max 10 MB",
    hint_ar: "صورة PNG أو JPG أو WEBP — الحد الأقصى 10 ميغابايت",
    isImage: true,
  },
  slides: {
    en: "Slide Deck", ar: "عرض تقديمي",
    accept: "application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxMb: 50,
    hint_en: "PDF or PPTX file — max 50 MB",
    hint_ar: "ملف PDF أو PPTX — الحد الأقصى 50 ميغابايت",
    isImage: false,
  },
  pdf: {
    en: "PDF Report", ar: "تقرير PDF",
    accept: "application/pdf",
    maxMb: 50,
    hint_en: "PDF file — max 50 MB",
    hint_ar: "ملف PDF — الحد الأقصى 50 ميغابايت",
    isImage: false,
  },
  mindmap: {
    en: "Mind Map", ar: "خريطة ذهنية",
    accept: "image/png,image/jpeg,image/webp,image/gif",
    maxMb: 10,
    hint_en: "PNG, JPG, WEBP, or GIF image — max 10 MB",
    hint_ar: "صورة PNG أو JPG أو WEBP أو GIF — الحد الأقصى 10 ميغابايت",
    isImage: true,
  },
  pptx: {
    en: "PPTX Report", ar: "تقرير PPTX",
    accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxMb: 50,
    hint_en: "PPTX file — max 50 MB",
    hint_ar: "ملف PPTX — الحد الأقصى 50 ميغابايت",
    isImage: false,
  },
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImagePreview(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export default function ExternalUpload() {
  const [, params] = useRoute("/upload/:token");
  const token = params?.token ?? "";

  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tokenInfo, isLoading: validating, error: tokenError } = trpc.uploadToken.validate.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const consume = trpc.uploadToken.consume.useMutation({
    onSuccess: (data) => {
      setUploaded(true);
      setUploadedFileUrl(data.fileUrl);
      toast.success(lang === "ar" ? "تم الرفع بنجاح! سيتلقى المريض إشعاراً." : "Upload successful! The patient will be notified.");
    },
    onError: (e) => toast.error(lang === "ar" ? `فشل الرفع: ${e.message}` : `Upload failed: ${e.message}`),
  });

  const meta = tokenInfo ? REPORT_META[tokenInfo.reportType] : null;

  const handleFile = useCallback(async (file: File) => {
    if (!meta) return;
    const maxBytes = meta.maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(lang === "ar" ? `حجم الملف يتجاوز ${meta.maxMb} ميغابايت` : `File exceeds ${meta.maxMb} MB`);
      return;
    }
    setSelectedFile(file);
    if (meta.isImage && file.type.startsWith("image/")) {
      const preview = await getImagePreview(file);
      setPreviewUrl(preview);
    } else {
      setPreviewUrl(null);
    }
  }, [meta, lang]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleBrowse = () => {
    if (!meta) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.accept = meta.accept;
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const expiresIn = tokenInfo ? Math.max(0, Math.round((tokenInfo.expiresAt - Date.now()) / 3600000)) : 0;
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center p-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleInputChange} />

      {/* Language toggle */}
      <div className="mb-6 flex gap-2">
        <Button size="sm" variant={isAr ? "default" : "outline"} onClick={() => setLang("ar")}>العربية</Button>
        <Button size="sm" variant={!isAr ? "default" : "outline"} onClick={() => setLang("en")}>English</Button>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isAr ? "رفع ملف طبي" : "Medical File Upload"}
          </CardTitle>
          <CardDescription className="text-base">
            {isAr ? "مستشارك الطبي الذكي" : "Smart Medical Consultant"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Loading */}
          {validating && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm">{isAr ? "جارٍ التحقق من الرابط..." : "Validating link..."}</p>
            </div>
          )}

          {/* Error */}
          {tokenError && !validating && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="font-bold text-lg text-destructive">
                  {isAr ? "رابط غير صالح" : "Invalid Link"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tokenError.message.includes("already been used")
                    ? (isAr ? "تم استخدام هذا الرابط بالفعل." : "This link has already been used.")
                    : tokenError.message.includes("expired")
                    ? (isAr ? "انتهت صلاحية هذا الرابط." : "This link has expired.")
                    : (isAr ? "الرابط غير صالح أو منتهي الصلاحية." : "The link is invalid or has expired.")}
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {uploaded && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-xl text-green-700 dark:text-green-400">
                  {isAr ? "تم الرفع بنجاح!" : "Upload Successful!"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAr
                    ? "تم حفظ الملف وسيتلقى المريض إشعاراً بالبريد الإلكتروني."
                    : "The file has been saved and the patient will receive an email notification."}
                </p>
              </div>
              {/* Show image preview if infographic */}
              {previewUrl && (
                <img src={previewUrl} alt="uploaded" className="mt-2 max-h-48 rounded-lg border object-contain shadow" />
              )}
              {uploadedFileUrl && !previewUrl && (
                <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                  {isAr ? "عرض الملف المرفوع" : "View uploaded file"}
                </a>
              )}
            </div>
          )}

          {/* Upload form */}
          {tokenInfo && !uploaded && !validating && (
            <>
              {/* Consultation info */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{isAr ? "المريض:" : "Patient:"}</span>
                  <span className="font-semibold">{tokenInfo.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{isAr ? "نوع الملف:" : "Report type:"}</span>
                  <span className="font-semibold text-primary">
                    {meta ? (isAr ? meta.ar : meta.en) : tokenInfo.reportType}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{isAr ? "ينتهي خلال:" : "Expires in:"}</span>
                  <span>{expiresIn} {isAr ? "ساعة" : "hours"}</span>
                </div>
                {meta && (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-muted-foreground">
                      {isAr ? `الصيغ المقبولة: ${meta.hint_ar}` : `Accepted formats: ${meta.hint_en}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={handleBrowse}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all select-none
                  ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/20"}`}
              >
                {selectedFile ? (
                  <>
                    {/* Preview for images */}
                    {previewUrl ? (
                      <div className="relative">
                        <img src={previewUrl} alt="preview" className="max-h-40 max-w-full rounded-lg border object-contain shadow" />
                        <button
                          onClick={clearFile}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow hover:bg-destructive/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <button
                          onClick={clearFile}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow hover:bg-destructive/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="font-medium text-sm text-center">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-primary">{isAr ? "انقر لتغيير الملف" : "Click to change file"}</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      {meta?.isImage
                        ? <Image className="h-8 w-8 text-muted-foreground" />
                        : <FileText className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">
                        {isAr ? "اسحب الملف هنا أو انقر للاختيار" : "Drag file here or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {meta ? (isAr ? meta.hint_ar : meta.hint_en) : ""}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Upload button */}
              <Button
                className="w-full h-12 text-base font-semibold"
                size="lg"
                disabled={!selectedFile || consume.isPending}
                onClick={handleUpload}
              >
                {consume.isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" />{isAr ? "جارٍ الرفع..." : "Uploading..."}</>
                ) : (
                  <><Upload className="h-5 w-5 mr-2" />{isAr ? "رفع الملف وإرسال للمريض" : "Upload & Send to Patient"}</>
                )}
              </Button>

              {/* Upload progress hint */}
              {consume.isPending && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  {isAr ? "يرجى الانتظار، جارٍ رفع الملف..." : "Please wait, uploading file..."}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-sm">
        {isAr
          ? "هذا الرابط للاستخدام مرة واحدة فقط ويصلح لمدة 48 ساعة. بعد الرفع، سيتلقى المريض إشعاراً تلقائياً."
          : "This link is single-use and valid for 48 hours. After upload, the patient will be notified automatically."}
      </p>
    </div>
  );
}
