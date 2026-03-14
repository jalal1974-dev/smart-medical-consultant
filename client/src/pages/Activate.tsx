import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Gift, Shield, Loader2, LogOut } from "lucide-react";

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Activate() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const utils = trpc.useUtils();

  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);

  const activateMutation = trpc.auth.activateWithPaypal.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setActivated(true);
      toast.success("Account activated! You now have 10 consultations.");
      setTimeout(() => navigate("/dashboard"), 2000);
    },
    onError: (err) => {
      toast.error(err.message || "Activation failed. Please contact support.");
    },
  });

  // If user is already premium, redirect to dashboard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    const isPremium = (user as any).freeConsultationsTotal > 1 ||
      (user as any).free_consultations_total > 1 ||
      (user as any).subscriptionType === "pay_per_case" ||
      (user as any).subscription_type === "pay_per_case";
    if (isPremium) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  // Load PayPal SDK
  useEffect(() => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      setPaypalError("PayPal is not configured. Please contact support.");
      return;
    }
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.onload = () => setPaypalLoaded(true);
    script.onerror = () => setPaypalError("Failed to load PayPal. Please refresh and try again.");
    document.body.appendChild(script);
  }, []);

  // Render PayPal buttons
  useEffect(() => {
    if (!paypalLoaded || !paypalContainerRef.current || paypalRendered.current || !user) return;
    paypalRendered.current = true;

    window.paypal.Buttons({
      style: { layout: "vertical", color: "blue", shape: "rect", label: "pay", height: 50 },
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: "1.00", currency_code: "USD" },
            description: "Smart Medical Consultant – Account Activation (10 consultations)",
          }],
          application_context: {
            brand_name: "Smart Medical Consultant",
            user_action: "PAY_NOW",
          },
        });
      },
      onApprove: async (data: any, actions: any) => {
        try {
          const order = await actions.order.capture();
          await activateMutation.mutateAsync({
            paypalOrderId: order.id,
            paypalPayerId: order.payer?.payer_id,
          });
        } catch (err: any) {
          toast.error(err.message || "Payment confirmation failed. Please contact support.");
        }
      },
      onError: (err: any) => {
        console.error("PayPal error:", err);
        toast.error("Payment failed. Please try again.");
      },
      onCancel: () => {
        toast.info("Payment cancelled. You can try again when ready.");
      },
    }).render(paypalContainerRef.current);
  }, [paypalLoaded, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (activated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Account Activated!</h1>
          <p className="text-slate-400">Redirecting you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img
              src="/logo.png"
              alt="Smart Medical Consultant"
              className="h-14 mx-auto mb-3 cursor-pointer"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </Link>
          <h1 className="text-2xl font-bold text-white">One Last Step</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome{user?.name ? `, ${user.name}` : ""}! Activate your account to get started.
          </p>
        </div>

        <Card className="bg-slate-800/80 border-slate-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-400" /> Activate Your Account
            </CardTitle>
            <CardDescription className="text-slate-400">
              One-time $1 fee — unlocks 10 AI-powered medical consultations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* What you get */}
            <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border border-green-700/50 rounded-xl p-4">
              <p className="text-green-300 font-semibold text-sm mb-2">What you get for $1:</p>
              <ul className="space-y-1.5 text-sm text-slate-300">
                {[
                  "10 AI-powered medical consultations",
                  "Specialist-reviewed analysis reports",
                  "Personalised infographics & slide decks",
                  "Secure document storage",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* PayPal button */}
            {paypalError ? (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
                {paypalError}
              </div>
            ) : !paypalLoaded ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading payment…</span>
              </div>
            ) : (
              <div ref={paypalContainerRef} />
            )}

            <div className="flex items-start gap-2 p-3 bg-slate-700/30 rounded-lg">
              <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">
                Payments are processed securely by PayPal. We never store your card details.
              </p>
            </div>

            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-300 text-sm"
              onClick={async () => { await logout(); navigate("/"); }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out and return to homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
