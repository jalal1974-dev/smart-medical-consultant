import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  CreditCard,
  Crown,
  FileText,
  Download,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  Presentation,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

export default function AdminCustomerView() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const params = useParams<{ userId: string }>();
  const userId = parseInt(params.userId || "0", 10);

  const isAr = language === "ar";

  const { data: customer, isLoading: loadingCustomer } = trpc.admin.getUserById.useQuery(
    { userId },
    { enabled: !!userId && isAuthenticated }
  );

  const { data: consultations, isLoading: loadingConsultations } = trpc.consultation.getByUserId.useQuery(
    userId,
    { enabled: !!userId && isAuthenticated }
  );

  if (loading || loadingCustomer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "processing") return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { en: string; ar: string }> = {
      submitted: { en: "Submitted", ar: "مُقدَّمة" },
      processing: { en: "Processing", ar: "قيد المعالجة" },
      completed: { en: "Completed", ar: "مكتملة" },
      follow_up: { en: "Follow-up", ar: "متابعة" },
    };
    return isAr ? (map[status]?.ar ?? status) : (map[status]?.en ?? status);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-5xl mx-auto">
        {/* Back */}
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => setLocation("/admin/customers")}
        >
          <ArrowLeft className="w-4 h-4" />
          {isAr ? "العودة إلى قائمة العملاء" : "Back to Customers"}
        </Button>

        {/* Customer header */}
        {customer && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {customer.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt={customer.name || ""}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl font-bold">
                      {customer.name || (isAr ? "بدون اسم" : "No name")}
                    </h1>
                    {customer.role === "admin" ? (
                      <Badge className="bg-purple-600 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        {isAr ? "مدير" : "Admin"}
                      </Badge>
                    ) : customer.planType === "premium" ? (
                      <Badge className="bg-amber-500 text-white">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {isAr ? "مميز" : "Premium"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {isAr ? "مجاني" : "Free"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {customer.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {isAr ? "انضم في" : "Joined"}{" "}
                      {new Date(customer.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {isAr
                        ? `${customer.freeConsultationsUsed}/${customer.freeConsultationsTotal} استشارة مستخدمة`
                        : `${customer.freeConsultationsUsed}/${customer.freeConsultationsTotal} consultations used`}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consultations */}
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {isAr ? "الاستشارات" : "Consultations"}
          {consultations && (
            <Badge variant="secondary">{consultations.length}</Badge>
          )}
        </h2>

        {loadingConsultations ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !consultations || consultations.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {isAr ? "لا توجد استشارات بعد" : "No consultations yet"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {consultations.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{c.patientName}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {new Date(c.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                        {" · "}#{c.id}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon(c.status)}
                      <Badge variant="outline" className="text-xs">
                        {statusLabel(c.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {c.symptoms}
                  </p>

                  {/* Materials visibility */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {c.aiReportUrl && (
                      <Badge
                        variant={c.reportApproved ? "default" : "secondary"}
                        className="text-xs gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        {isAr ? "التقرير" : "Report"}
                        {c.reportApproved ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Clock className="w-3 h-3 opacity-60" />
                        )}
                      </Badge>
                    )}
                    {c.aiInfographicUrl && (
                      <Badge
                        variant={c.infographicApproved ? "default" : "secondary"}
                        className="text-xs gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        {isAr ? "الإنفوجرافيك" : "Infographic"}
                        {c.infographicApproved ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Clock className="w-3 h-3 opacity-60" />
                        )}
                      </Badge>
                    )}
                    {c.aiSlideDeckUrl && (
                      <Badge
                        variant={c.slideDeckApproved ? "default" : "secondary"}
                        className="text-xs gap-1"
                      >
                        <Presentation className="w-3 h-3" />
                        {isAr ? "الشرائح" : "Slides"}
                        {c.slideDeckApproved ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <Clock className="w-3 h-3 opacity-60" />
                        )}
                      </Badge>
                    )}
                  </div>

                  {/* Download links for approved materials */}
                  <div className="flex flex-wrap gap-2">
                    {c.aiReportUrl && c.reportApproved && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" asChild>
                        <a href={c.aiReportUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3" />
                          {isAr ? "تحميل التقرير" : "Download Report"}
                        </a>
                      </Button>
                    )}
                    {c.aiInfographicUrl && c.infographicApproved && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" asChild>
                        <a href={c.aiInfographicUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3" />
                          {isAr ? "تحميل الإنفوجرافيك" : "Download Infographic"}
                        </a>
                      </Button>
                    )}
                    {c.aiSlideDeckUrl && c.slideDeckApproved && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" asChild>
                        <a href={c.aiSlideDeckUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3" />
                          {isAr ? "تحميل الشرائح" : "Download Slides"}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
