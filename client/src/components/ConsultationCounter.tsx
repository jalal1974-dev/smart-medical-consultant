import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, CreditCard, CheckCircle, Loader2, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = "ASf2uGtL-Pbz9991-fnuAJCG1vT_7q5KtZcYO8WMwgvSVz7GMBQ7GpTF_me500piU8CKe7nrB25i-Ssn";

const PLANS = [
  {
    id: "basic" as const,
    name: "Basic",
    nameAr: "الأساسي",
    consultations: 5,
    amount: 5,
    pricePerConsultation: "$1.00",
    popular: false,
    features: ["5 consultations", "AI analysis", "Infographic report"],
    featuresAr: ["5 استشارات", "تحليل بالذكاء الاصطناعي", "تقرير إنفوجرافيك"],
  },
  {
    id: "standard" as const,
    name: "Standard",
    nameAr: "القياسي",
    consultations: 15,
    amount: 12,
    pricePerConsultation: "$0.80",
    popular: true,
    features: ["15 consultations", "AI analysis", "Infographic + slides", "Priority processing"],
    featuresAr: ["15 استشارة", "تحليل بالذكاء الاصطناعي", "إنفوجرافيك + شرائح", "معالجة ذات أولوية"],
  },
  {
    id: "premium" as const,
    name: "Premium",
    nameAr: "المميز",
    consultations: 30,
    amount: 20,
    pricePerConsultation: "$0.67",
    popular: false,
    features: ["30 consultations", "AI analysis", "All materials", "Priority processing", "Deep research"],
    featuresAr: ["30 استشارة", "تحليل بالذكاء الاصطناعي", "جميع المواد", "معالجة ذات أولوية", "بحث معمق"],
  },
];

interface ConsultationCounterProps {
  language: "en" | "ar";
}

export function ConsultationCounter({ language }: ConsultationCounterProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const { data: status, refetch } = trpc.subscription.getStatus.useQuery();
  const purchaseMutation = trpc.subscription.purchaseConsultations.useMutation({
    onSuccess: (data) => {
      setPurchaseComplete(true);
      refetch();
      toast.success(
        language === "ar"
          ? `تم إضافة ${data.consultationsGranted} استشارة إلى حسابك!`
          : `${data.consultationsGranted} consultations added to your account!`
      );
    },
    onError: (err) => {
      toast.error(err.message || (language === "ar" ? "فشل الشراء" : "Purchase failed"));
    },
  });

  const remaining = status?.consultationsRemaining ?? 0;
  const isLow = remaining <= 2;
  const isEmpty = remaining === 0;

  const loadPayPal = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setPaypalReady(false);
    setPurchaseComplete(false);

    // Load PayPal SDK if not already loaded
    if (!window.paypal) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
      script.onload = () => renderPayPalButton(plan);
      document.body.appendChild(script);
    } else {
      renderPayPalButton(plan);
    }
  };

  const renderPayPalButton = (plan: typeof PLANS[0]) => {
    setPaypalReady(true);
    setTimeout(() => {
      const container = document.getElementById(`paypal-button-${plan.id}`);
      if (!container || !window.paypal) return;
      container.innerHTML = "";
      window.paypal.Buttons({
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: plan.amount.toFixed(2) } }],
          });
        },
        onApprove: async (data: any) => {
          setPaypalLoading(true);
          try {
            await purchaseMutation.mutateAsync({
              paypalOrderId: data.orderID,
              paypalPayerId: data.payerID,
              plan: plan.id,
            });
          } finally {
            setPaypalLoading(false);
          }
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
          toast.error(language === "ar" ? "خطأ في الدفع" : "Payment error");
        },
      }).render(`#paypal-button-${plan.id}`);
    }, 100);
  };

  const isAr = language === "ar";

  return (
    <>
      {/* Counter Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
          isEmpty
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50"
            : isLow
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50"
            : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50"
        }`}
        onClick={() => setOpen(true)}
      >
        {isEmpty ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : isLow ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <Zap className="w-4 h-4 text-blue-500" />
        )}
        <span className={`text-sm font-medium ${isEmpty ? "text-red-700 dark:text-red-300" : isLow ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"}`}>
          {isAr ? `${remaining} استشارة متبقية` : `${remaining} consultations left`}
        </span>
        {(isEmpty || isLow) && (
          <Badge variant="outline" className={`text-xs ${isEmpty ? "border-red-400 text-red-600" : "border-amber-400 text-amber-600"}`}>
            {isAr ? "اشحن الآن" : "Top up"}
          </Badge>
        )}
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedPlan(null); setPurchaseComplete(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              {isAr ? "شراء استشارات إضافية" : "Purchase More Consultations"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? `لديك ${remaining} استشارة متبقية. اختر خطة لإضافة المزيد.`
                : `You have ${remaining} consultations remaining. Choose a plan to add more.`}
            </DialogDescription>
          </DialogHeader>

          {/* Current Balance */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{isAr ? "رصيد الاستشارات" : "Consultation Balance"}</span>
              <span className={`text-sm font-bold ${isEmpty ? "text-red-500" : isLow ? "text-amber-500" : "text-green-500"}`}>
                {remaining} {isAr ? "متبقية" : "remaining"}
              </span>
            </div>
            <Progress value={Math.min((remaining / 10) * 100, 100)} className="h-2" />
          </div>

          {purchaseComplete ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300">
                {isAr ? "تم الشراء بنجاح!" : "Purchase Successful!"}
              </h3>
              <p className="text-muted-foreground">
                {isAr
                  ? "تمت إضافة الاستشارات إلى حسابك."
                  : "Consultations have been added to your account."}
              </p>
              <Button onClick={() => setOpen(false)} className="bg-green-600 hover:bg-green-700">
                {isAr ? "رائع، شكراً!" : "Great, thanks!"}
              </Button>
            </div>
          ) : selectedPlan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <p className="font-semibold">{isAr ? selectedPlan.nameAr : selectedPlan.name} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan.consultations} {isAr ? "استشارة" : "consultations"} — ${selectedPlan.amount}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                  {isAr ? "تغيير" : "Change"}
                </Button>
              </div>

              {paypalLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-muted-foreground">{isAr ? "جاري المعالجة..." : "Processing..."}</span>
                </div>
              ) : (
                <div>
                  {!paypalReady && (
                    <div className="flex items-center justify-center py-4 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">{isAr ? "جاري تحميل PayPal..." : "Loading PayPal..."}</span>
                    </div>
                  )}
                  <div id={`paypal-button-${selectedPlan.id}`} className="min-h-[50px]" />
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${plan.popular ? "border-blue-400 dark:border-blue-600 ring-1 ring-blue-400" : ""}`}
                  onClick={() => loadPayPal(plan)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {plan.popular && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        {isAr ? plan.nameAr : plan.name}
                        {plan.popular && (
                          <Badge className="bg-blue-500 text-white text-xs">
                            {isAr ? "الأكثر شيوعاً" : "Most Popular"}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${plan.amount}</p>
                        <p className="text-xs text-muted-foreground">{plan.pricePerConsultation}/{isAr ? "استشارة" : "consultation"}</p>
                      </div>
                    </div>
                    <CardDescription>
                      {plan.consultations} {isAr ? "استشارة طبية" : "medical consultations"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1">
                      {(isAr ? plan.featuresAr : plan.features).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isAr ? `اشتر الآن — $${plan.amount}` : `Buy Now — $${plan.amount}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
