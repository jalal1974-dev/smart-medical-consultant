import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Zap, CreditCard, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = "ASf2uGtL-Pbz9991-fnuAJCG1vT_7q5KtZcYO8WMwgvSVz7GMBQ7GpTF_me500piU8CKe7nrB25i-Ssn";
const CONSULTATION_PRICE = 5;

interface ConsultationCounterProps {
  language: "en" | "ar";
}

export function ConsultationCounter({ language }: ConsultationCounterProps) {
  const [open, setOpen] = useState(false);
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
          ? `تمت إضافة ${data.consultationsGranted} استشارة إلى حسابك!`
          : `${data.consultationsGranted} consultation added to your account!`
      );
    },
    onError: (err) => {
      toast.error(err.message || (language === "ar" ? "فشل الدفع" : "Payment failed"));
    },
  });

  const remaining = status?.consultationsRemaining ?? 0;
  const isLow = remaining <= 1;
  const isEmpty = remaining === 0;
  const isAr = language === "ar";

  const handleOpen = () => {
    setOpen(true);
    setPurchaseComplete(false);
    setPaypalReady(false);
    // Load PayPal SDK
    if (!window.paypal) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
      script.onload = () => renderPayPalButton();
      document.body.appendChild(script);
    } else {
      setTimeout(() => renderPayPalButton(), 200);
    }
  };

  const renderPayPalButton = () => {
    setPaypalReady(true);
    setTimeout(() => {
      const container = document.getElementById("paypal-single-consultation");
      if (!container || !window.paypal) return;
      container.innerHTML = "";
      window.paypal.Buttons({
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: CONSULTATION_PRICE.toFixed(2) } }],
          });
        },
        onApprove: async (data: any) => {
          setPaypalLoading(true);
          try {
            await purchaseMutation.mutateAsync({
              paypalOrderId: data.orderID,
              paypalPayerId: data.payerID,
              plan: "basic",
            });
          } finally {
            setPaypalLoading(false);
          }
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
          toast.error(isAr ? "خطأ في الدفع" : "Payment error");
        },
      }).render("#paypal-single-consultation");
    }, 100);
  };

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
        onClick={handleOpen}
      >
        {isEmpty ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : isLow ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <Zap className="w-4 h-4 text-blue-500" />
        )}
        <span className={`text-sm font-medium ${isEmpty ? "text-red-700 dark:text-red-300" : isLow ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"}`}>
          {isAr ? `${remaining} استشارة متبقية` : `${remaining} consultation${remaining !== 1 ? "s" : ""} left`}
        </span>
        {(isEmpty || isLow) && (
          <Badge variant="outline" className={`text-xs ${isEmpty ? "border-red-400 text-red-600" : "border-amber-400 text-amber-600"}`}>
            {isAr ? "أضف استشارة" : "Add one"}
          </Badge>
        )}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPurchaseComplete(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              {isAr ? "إضافة استشارة طبية" : "Add a Medical Consultation"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? `لديك ${remaining} استشارة متبقية. أضف استشارة جديدة مقابل $${CONSULTATION_PRICE}.`
                : `You have ${remaining} consultation${remaining !== 1 ? "s" : ""} remaining. Add one for $${CONSULTATION_PRICE}.`}
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
            <Progress value={Math.min((remaining / 5) * 100, 100)} className="h-2" />
          </div>

          {purchaseComplete ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300">
                {isAr ? "تمت الإضافة بنجاح!" : "Consultation Added!"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isAr
                  ? "تمت إضافة استشارة واحدة إلى حسابك."
                  : "One consultation has been added to your account."}
              </p>
              <Button onClick={() => setOpen(false)} className="bg-green-600 hover:bg-green-700">
                {isAr ? "رائع، شكراً!" : "Great, thanks!"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pricing summary */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <p className="font-semibold">{isAr ? "استشارة طبية واحدة" : "1 Medical Consultation"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isAr ? "تحليل بالذكاء الاصطناعي + تقرير كامل" : "AI analysis + full report"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">${CONSULTATION_PRICE}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "دفعة واحدة" : "one-time"}</p>
                </div>
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
                  <div id="paypal-single-consultation" className="min-h-[50px]" />
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    <CreditCard className="w-3 h-3 inline mr-1" />
                    {isAr ? "دفع آمن عبر PayPal" : "Secure payment via PayPal"}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
