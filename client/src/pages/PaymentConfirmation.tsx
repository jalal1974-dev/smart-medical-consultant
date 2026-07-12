/**
 * PaymentConfirmation — post-submission landing page.
 *
 * PAYMENT FROZEN FOR LAUNCH:
 * - All consultations are free; payment status logic is hidden.
 * - The page shows a "Consultation Submitted" confirmation regardless of
 *   paymentStatus in the DB (which will always be "completed" for free submissions).
 * - PayPal-specific copy and retry CTAs are suppressed.
 * - The "Print Receipt" button is kept as a neutral confirmation printout.
 *
 * To re-enable payment UI: remove the PAYMENT FROZEN block and restore the
 * getStatusIcon/Title/Description helpers from git history.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { Header } from "@/components/Header";
import { CheckCircle2, Download, ArrowLeft, Loader2, LayoutDashboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function PaymentConfirmation() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payment-confirmation/:consultationId");

  const consultationId = params?.consultationId ? parseInt(params.consultationId) : null;

  const { data: consultation, isLoading } = trpc.consultation.get.useQuery(
    { id: consultationId! },
    { enabled: !!consultationId && isAuthenticated }
  );

  // Auth is handled by ProtectedRoute in App.tsx — this is a safety net only
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">
              {language === "ar" ? "جاري التحميل..." : "Loading your confirmation..."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-destructive">
                {language === "ar" ? "استشارة غير موجودة" : "Consultation Not Found"}
              </CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "لم نتمكن من العثور على هذه الاستشارة. ربما تم حذفها أو أن الرابط غير صحيح."
                  : "We couldn't find this consultation. It may have been removed or the link is incorrect."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/dashboard")} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusLabel = () => {
    switch (consultation.status) {
      case "submitted":       return language === "ar" ? "تم الإرسال" : "Submitted";
      case "ai_processing":   return language === "ar" ? "قيد التحليل" : "AI Processing";
      case "specialist_review": return language === "ar" ? "مراجعة الأخصائي" : "Specialist Review";
      case "completed":       return language === "ar" ? "مكتمل" : "Completed";
      case "follow_up":       return language === "ar" ? "متابعة" : "Follow-up";
      default:                return consultation.status;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* ── Confirmation Card ─────────────────────────────────────────── */}
          <Card>
            <CardContent className="pt-6">
              {/* PAYMENT FROZEN — always show free consultation success */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-2">
                  {language === "ar" ? "تم تقديم استشارتك!" : "Consultation Submitted!"}
                </h1>
                <p className="text-muted-foreground">
                  {language === "ar"
                    ? "تم استلام استشارتك بنجاح. سيقوم فريقنا الطبي بمراجعة حالتك وإرسال التقرير المفصل قريبًا."
                    : "Your consultation has been received. Our medical team will review your case and send the detailed report soon."}
                </p>
                {/* Launch-stage free badge */}
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-medium">
                  🎉 {language === "ar" ? "استشارة مجانية — مرحلة الإطلاق" : "Free Consultation — Launch Stage"}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Receipt Details */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {language === "ar" ? "تفاصيل الاستشارة" : "Consultation Details"}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "رقم الاستشارة" : "Consultation ID"}
                    </p>
                    <p className="font-medium">#{consultation.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "التاريخ" : "Date"}
                    </p>
                    <p className="font-medium">{formatDate(consultation.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "المبلغ" : "Amount"}
                    </p>
                    <p className="font-medium text-green-600 text-lg">
                      {language === "ar" ? "مجاني" : "Free"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "اسم المريض" : "Patient Name"}
                    </p>
                    <p className="font-medium">{consultation.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "البريد الإلكتروني" : "Email"}
                    </p>
                    <p className="font-medium">{consultation.patientEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "حالة الاستشارة" : "Status"}
                    </p>
                    <p className="font-medium">{statusLabel()}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Next Steps */}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">
                  {language === "ar" ? "الخطوات التالية" : "What Happens Next"}
                </h2>
                <ol className="space-y-2 text-muted-foreground list-none">
                  {[
                    language === "ar"
                      ? "سيقوم نظام الذكاء الاصطناعي لدينا بتحليل تقاريرك الطبية وأعراضك"
                      : "Our AI system will analyze your medical reports and symptoms",
                    language === "ar"
                      ? "سيراجع أخصائيونا الطبيون نتائج التحليل للتأكد من دقتها"
                      : "Our medical specialists will review the AI analysis for accuracy",
                    language === "ar"
                      ? "ستتلقى تقريرًا مفصلاً مع مواد توضيحية في لوحة التحكم"
                      : "You'll receive a detailed report with educational materials in your dashboard",
                    language === "ar"
                      ? "يمكنك مناقشة التقرير مع طبيبك المعالج لاتخاذ القرارات المناسبة"
                      : "You can discuss the report with your treating physician to make informed decisions",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button onClick={() => setLocation("/dashboard")} className="flex-1">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {language === "ar" ? "عرض لوحة التحكم" : "View Dashboard"}
                </Button>
                <Button variant="outline" onClick={() => window.print()} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  {language === "ar" ? "طباعة التأكيد" : "Print Confirmation"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Support Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === "ar" ? "هل تحتاج إلى مساعدة؟" : "Need Help?"}
              </CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "إذا كان لديك أي أسئلة حول استشارتك، لا تتردد في الاتصال بنا."
                  : "If you have any questions about your consultation, feel free to contact us."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/contact")}>
                {language === "ar" ? "اتصل بالدعم" : "Contact Support"}
              </Button>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
