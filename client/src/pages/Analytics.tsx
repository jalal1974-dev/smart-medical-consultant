import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, Clock, CheckCircle, MessageSquare, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@shared/i18n";
import { Header } from "@/components/Header";

export default function Analytics() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "all":
        return { startDate: undefined, endDate: undefined };
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const { startDate, endDate } = getDateRange();
  const { data: analytics, isLoading } = trpc.admin.analytics.useQuery({ startDate, endDate });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">
            {language === "ar" ? "غير مصرح لك بالوصول إلى هذه الصفحة" : "You are not authorized to access this page"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {language === "ar" ? "لوحة التحليلات" : "Analytics Dashboard"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {language === "ar" 
                ? "تتبع أداء الاستشارات والمقاييس الرئيسية"
                : "Track consultation performance and key metrics"}
            </p>
          </div>

          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{language === "ar" ? "آخر 7 أيام" : "Last 7 days"}</SelectItem>
              <SelectItem value="30d">{language === "ar" ? "آخر 30 يوم" : "Last 30 days"}</SelectItem>
              <SelectItem value="90d">{language === "ar" ? "آخر 90 يوم" : "Last 90 days"}</SelectItem>
              <SelectItem value="all">{language === "ar" ? "كل الوقت" : "All time"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === "ar" ? "إجمالي الاستشارات" : "Total Consultations"}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.consultations.totalConsultations}</div>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" 
                      ? `${analytics.consultations.freeConsultations} مجاني، ${analytics.consultations.paidConsultations} مدفوع`
                      : `${analytics.consultations.freeConsultations} free, ${analytics.consultations.paidConsultations} paid`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === "ar" ? "إجمالي الإيرادات" : "Total Revenue"}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.consultations.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" 
                      ? `من ${analytics.consultations.paidConsultations} استشارة مدفوعة`
                      : `from ${analytics.consultations.paidConsultations} paid consultations`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === "ar" ? "متوسط وقت الاستجابة" : "Avg Response Time"}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.consultations.averageResponseTime.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "من الإرسال إلى الإكمال" : "from submission to completion"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === "ar" ? "معدل الإكمال" : "Completion Rate"}
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.consultations.completionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "استشارات مكتملة" : "completed consultations"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "توزيع حالة الاستشارات" : "Consultation Status Distribution"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "عدد الاستشارات حسب الحالة" : "Number of consultations by status"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.consultations.statusDistribution).map(([status, count]) => {
                    const total = analytics.consultations.totalConsultations;
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    const statusLabels: Record<string, { en: string; ar: string }> = {
                      submitted: { en: "Submitted", ar: "تم الإرسال" },
                      ai_processing: { en: "AI Processing", ar: "قيد التحليل" },
                      specialist_review: { en: "Specialist Review", ar: "مراجعة الأخصائي" },
                      completed: { en: "Completed", ar: "مكتمل" },
                      follow_up: { en: "Follow-up", ar: "متابعة" },
                    };

                    return (
                      <div key={status} className="flex items-center">
                        <div className="w-32 text-sm font-medium">
                          {language === "ar" ? statusLabels[status]?.ar : statusLabels[status]?.en}
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-sm text-right">
                          {count} ({percentage.toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Question Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "تحليلات الأسئلة" : "Question Analytics"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "أسئلة المتابعة من المرضى" : "Follow-up questions from patients"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === "ar" ? "إجمالي الأسئلة" : "Total Questions"}
                    </p>
                    <p className="text-2xl font-bold">{analytics.questions.totalQuestions}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === "ar" ? "تمت الإجابة" : "Answered"}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.questions.answeredQuestions}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === "ar" ? "في الانتظار" : "Pending"}
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {analytics.questions.unansweredQuestions}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {language === "ar" ? "معدل الإجابة" : "Answer Rate"}
                      </p>
                      <p className="text-2xl font-bold">{analytics.questions.answerRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {language === "ar" ? "متوسط وقت الاستجابة" : "Avg Response Time"}
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.questions.averageQuestionResponseTime.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {language === "ar" ? "لا توجد بيانات متاحة" : "No data available"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
