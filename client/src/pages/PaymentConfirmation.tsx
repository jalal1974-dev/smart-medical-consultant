import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Header } from "@/components/Header";
import { CheckCircle2, XCircle, Clock, Download, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function PaymentConfirmation() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payment-confirmation/:consultationId");
  
  const consultationId = params?.consultationId ? parseInt(params.consultationId) : null;
  
  const { data: consultation, isLoading } = trpc.consultation.get.useQuery(
    { id: consultationId! },
    { enabled: !!consultationId && isAuthenticated }
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">
                {language === "ar" ? "استشارة غير موجودة" : "Consultation Not Found"}
              </CardTitle>
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

  const getStatusIcon = () => {
    switch (consultation.paymentStatus) {
      case "completed":
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case "failed":
        return <XCircle className="h-16 w-16 text-destructive" />;
      case "pending":
        return <Clock className="h-16 w-16 text-yellow-500" />;
      default:
        return <Clock className="h-16 w-16 text-muted-foreground" />;
    }
  };

  const getStatusTitle = () => {
    switch (consultation.paymentStatus) {
      case "completed":
        return language === "ar" ? "تم الدفع بنجاح!" : "Payment Successful!";
      case "failed":
        return language === "ar" ? "فشل الدفع" : "Payment Failed";
      case "pending":
        return language === "ar" ? "الدفع قيد المعالجة" : "Payment Pending";
      default:
        return language === "ar" ? "حالة الدفع" : "Payment Status";
    }
  };

  const getStatusDescription = () => {
    switch (consultation.paymentStatus) {
      case "completed":
        return language === "ar"
          ? "تم استلام دفعتك بنجاح. سيقوم فريقنا الطبي بمراجعة حالتك وإرسال التقرير المفصل قريبًا."
          : "Your payment has been received successfully. Our medical team will review your case and send the detailed report soon.";
      case "failed":
        return language === "ar"
          ? "لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى أو الاتصال بالدعم."
          : "We couldn't process your payment. Please try again or contact support.";
      case "pending":
        return language === "ar"
          ? "دفعتك قيد المعالجة. سنرسل لك تأكيدًا عند اكتمال المعاملة."
          : "Your payment is being processed. We'll send you a confirmation once the transaction is complete.";
      default:
        return "";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Status Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">{getStatusIcon()}</div>
                <h1 className="text-3xl font-bold mb-2">{getStatusTitle()}</h1>
                <p className="text-muted-foreground">{getStatusDescription()}</p>
              </div>

              <Separator className="my-6" />

              {/* Receipt Details */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {language === "ar" ? "تفاصيل الإيصال" : "Receipt Details"}
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
                    <p className="font-medium text-lg">
                      {consultation.amount === 0
                        ? language === "ar"
                          ? "مجاني"
                          : "Free"
                        : `$${consultation.amount}`}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "طريقة الدفع" : "Payment Method"}
                    </p>
                    <p className="font-medium">
                      {consultation.amount === 0
                        ? language === "ar"
                          ? "استشارة مجانية"
                          : "Free Consultation"
                        : "PayPal"}
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

                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "حالة الاستشارة" : "Consultation Status"}
                    </p>
                    <p className="font-medium capitalize">
                      {consultation.status === "submitted" && (language === "ar" ? "تم الإرسال" : "Submitted")}
                      {consultation.status === "ai_processing" && (language === "ar" ? "قيد التحليل" : "AI Processing")}
                      {consultation.status === "specialist_review" && (language === "ar" ? "مراجعة الأخصائي" : "Specialist Review")}
                      {consultation.status === "completed" && (language === "ar" ? "مكتمل" : "Completed")}
                      {consultation.status === "follow_up" && (language === "ar" ? "متابعة" : "Follow-up")}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Next Steps */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {language === "ar" ? "الخطوات التالية" : "Next Steps"}
                </h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">1.</span>
                    <span>
                      {language === "ar"
                        ? "سيقوم نظام الذكاء الاصطناعي لدينا بتحليل تقاريرك الطبية وأعراضك"
                        : "Our AI system will analyze your medical reports and symptoms"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">2.</span>
                    <span>
                      {language === "ar"
                        ? "سيراجع أخصائيونا الطبيون نتائج التحليل للتأكد من دقتها"
                        : "Our medical specialists will review the AI analysis for accuracy"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">3.</span>
                    <span>
                      {language === "ar"
                        ? "ستتلقى تقريرًا مفصلاً مع فيديوهات توضيحية ورسوم بيانية في لوحة التحكم"
                        : "You'll receive a detailed report with explanatory videos and infographics in your dashboard"}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">4.</span>
                    <span>
                      {language === "ar"
                        ? "يمكنك مناقشة التقرير مع طبيبك المعالج لاتخاذ القرارات المناسبة"
                        : "You can discuss the report with your treating physician to make informed decisions"}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button onClick={() => setLocation("/dashboard")} className="flex-1">
                  {language === "ar" ? "عرض لوحة التحكم" : "View Dashboard"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {language === "ar" ? "طباعة الإيصال" : "Print Receipt"}
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
                  ? "إذا كان لديك أي أسئلة حول دفعتك أو استشارتك، لا تتردد في الاتصال بنا."
                  : "If you have any questions about your payment or consultation, feel free to contact us."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                {language === "ar" ? "اتصل بالدعم" : "Contact Support"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
