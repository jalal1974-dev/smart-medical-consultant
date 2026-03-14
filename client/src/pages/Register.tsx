import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Eye, EyeOff, CheckCircle, User, Mail, Lock, CreditCard,
  Upload, ArrowRight, ArrowLeft, Shield, Gift, FolderHeart, Sparkles, Zap,
} from "lucide-react";
import { getGoogleLoginUrl } from "@/const";

// Steps: account → plan → payment (only if premium) → success
type Step = "account" | "plan" | "payment" | "success";

interface AccountData {
  username: string;
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Register() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("account");
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "premium" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);

  const [accountData, setAccountData] = useState<AccountData>({
    username: "",
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<AccountData>>({});

  const registerMutation = trpc.auth.register.useMutation();
  const confirmPaymentMutation = trpc.auth.confirmPaypalPayment.useMutation();
  const utils = trpc.useUtils();

  // Load PayPal SDK only when on the payment step
  useEffect(() => {
    if (step !== "payment") return;
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
  }, [step]);

  // Render PayPal buttons
  useEffect(() => {
    if (!paypalLoaded || !paypalContainerRef.current || paypalRendered.current || !userId) return;
    paypalRendered.current = true;

    window.paypal.Buttons({
      style: { layout: "vertical", color: "blue", shape: "rect", label: "pay", height: 50 },
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: "1.00", currency_code: "USD" },
            description: "Smart Medical Consultant – Premium Plan (10 consultations)",
          }],
          application_context: { brand_name: "Smart Medical Consultant", user_action: "PAY_NOW" },
        });
      },
      onApprove: async (_data: any, actions: any) => {
        try {
          const order = await actions.order.capture();
          await confirmPaymentMutation.mutateAsync({
            userId: userId!,
            paypalOrderId: order.id,
            paypalPayerId: order.payer?.payer_id,
          });
          await utils.auth.me.invalidate();
          setStep("success");
          toast.success("Payment successful! You now have 10 consultations.");
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
  }, [paypalLoaded, userId]);

  const validateAccount = (): boolean => {
    const newErrors: Partial<AccountData> = {};
    if (!accountData.username || accountData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(accountData.username)) {
      newErrors.username = "Only letters, numbers, and underscores allowed";
    }
    if (!accountData.name || accountData.name.trim().length < 1) {
      newErrors.name = "Full name is required";
    }
    if (!accountData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountData.email)) {
      newErrors.email = "Valid email address is required";
    }
    if (!accountData.password || accountData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (accountData.password !== accountData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAccount()) return;
    try {
      const result = await registerMutation.mutateAsync({
        username: accountData.username,
        email: accountData.email,
        name: accountData.name,
        password: accountData.password,
      });
      setUserId(result.userId);
      setStep("plan");
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Registration failed";
      if (msg.toLowerCase().includes("username")) {
        setErrors(prev => ({ ...prev, username: msg }));
      } else if (msg.toLowerCase().includes("email")) {
        setErrors(prev => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    }
  };

  const handlePlanSelect = (plan: "free" | "premium") => {
    setSelectedPlan(plan);
    if (plan === "free") {
      // Free plan: log in and go straight to success
      utils.auth.me.invalidate();
      setStep("success");
    } else {
      // Premium plan: go to PayPal payment
      setStep("payment");
    }
  };

  // Step definitions — "plan" replaces old "upload" in the indicator
  const steps = [
    { id: "account", label: "Account", icon: User },
    { id: "plan",    label: "Plan",    icon: Sparkles },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "success", label: "Done",    icon: CheckCircle },
  ];

  // For free-plan users, "payment" step is skipped so show it as completed once on success
  const getStepIndex = (s: Step) => {
    if (s === "success" && selectedPlan === "free") return 3; // jump to last
    return steps.findIndex(x => x.id === s);
  };
  const currentStepIndex = getStepIndex(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
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
          <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
          <p className="text-slate-400 text-sm mt-1">Join Smart Medical Consultant today</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            // For free plan, skip payment step visually
            const isSkipped = selectedPlan === "free" && s.id === "payment" && step === "success";
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isSkipped   ? "bg-slate-700 border-slate-600 text-slate-500" :
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                    isCurrent   ? "bg-blue-600 border-blue-500 text-white" :
                                  "bg-slate-800 border-slate-600 text-slate-400"
                  }`}>
                    {isCompleted && !isSkipped ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium ${
                    isSkipped   ? "text-slate-600" :
                    isCurrent   ? "text-blue-400" :
                    isCompleted ? "text-green-400" :
                                  "text-slate-500"
                  }`}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mb-5 mx-1 ${idx < currentStepIndex ? "bg-green-500" : "bg-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Account Info ── */}
        {step === "account" && (
          <Card className="bg-slate-800/80 border-slate-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" /> Account Information
              </CardTitle>
              <CardDescription className="text-slate-400">Create your secure account credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <Label className="text-slate-300">Full Name</Label>
                  <Input
                    placeholder="Dr. Ahmed Al-Rashid"
                    value={accountData.name}
                    onChange={e => setAccountData(p => ({ ...p, name: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 mt-1"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label className="text-slate-300">Username</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="ahmed_rashid"
                      value={accountData.username}
                      onChange={e => setAccountData(p => ({ ...p, username: e.target.value.toLowerCase() }))}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
                    />
                  </div>
                  {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                  <Label className="text-slate-300">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="ahmed@example.com"
                      value={accountData.email}
                      onChange={e => setAccountData(p => ({ ...p, email: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label className="text-slate-300">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={accountData.password}
                      onChange={e => setAccountData(p => ({ ...p, password: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label className="text-slate-300">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={accountData.confirmPassword}
                      onChange={e => setAccountData(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9 pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-950/50 rounded-lg border border-blue-800/50">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-400">Your password is encrypted with bcrypt — industry-standard security used by banks.</p>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Creating Account…" : (
                    <span className="flex items-center gap-2">Continue <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-500">or register with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-600 text-slate-200 hover:bg-slate-700 bg-slate-700/50 flex items-center gap-3"
                  onClick={() => { window.location.href = getGoogleLoginUrl(); }}
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </Button>

                <p className="text-center text-slate-400 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Choose Your Plan ── */}
        {step === "plan" && (
          <Card className="bg-slate-800/80 border-slate-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" /> Choose Your Plan
              </CardTitle>
              <CardDescription className="text-slate-400">
                Select the plan that works best for you — you can always upgrade later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Free Plan Card */}
              <button
                onClick={() => handlePlanSelect("free")}
                className="w-full text-left rounded-xl border-2 border-slate-600 hover:border-blue-500 bg-slate-700/40 hover:bg-slate-700/70 p-5 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-600 group-hover:bg-blue-900/50 flex items-center justify-center shrink-0 transition-colors">
                      <Zap className="w-5 h-5 text-slate-300 group-hover:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-base">Free Plan</p>
                      <p className="text-slate-400 text-sm">Get started at no cost</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-500 text-slate-300 shrink-0 mt-0.5">Free</Badge>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" /> 1 AI-powered medical consultation</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Full AI analysis report</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Specialist review included</li>
                </ul>
                <p className="mt-3 text-xs text-slate-500">You can upgrade to 10 consultations for $1 at any time from your dashboard.</p>
              </button>

              {/* Premium Plan Card */}
              <button
                onClick={() => handlePlanSelect("premium")}
                className="w-full text-left rounded-xl border-2 border-blue-500 bg-gradient-to-br from-blue-900/50 to-indigo-900/50 hover:from-blue-900/70 hover:to-indigo-900/70 p-5 transition-all relative overflow-hidden group"
              >
                {/* Popular badge */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-yellow-500 text-yellow-950 font-semibold text-xs">Most Popular</Badge>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600/50 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-base">Premium Plan</p>
                    <p className="text-blue-300 text-sm font-medium">$1 one-time payment</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  {[
                    "10 AI-powered medical consultations",
                    "Detailed analysis reports & infographics",
                    "Personalised slide deck for each case",
                    "Specialist-reviewed results",
                    "Bilingual support (English & Arabic)",
                    "Priority support",
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-blue-200 text-sm font-medium">10× more consultations</span>
                  <span className="text-white font-bold text-lg">$1.00 →</span>
                </div>
              </button>

              <button
                onClick={() => setStep("account")}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 mx-auto pt-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to account details
              </button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Payment (Premium only) ── */}
        {step === "payment" && (
          <Card className="bg-slate-800/80 border-slate-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" /> Complete Payment
              </CardTitle>
              <CardDescription className="text-slate-400">One-time $1 — unlocks 10 AI-powered consultations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border border-green-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-white">What you get for $1</span>
                </div>
                <ul className="space-y-2">
                  {[
                    "10 AI-powered medical consultations",
                    "Detailed medical analysis reports",
                    "Visual infographics of your health data",
                    "Specialist review of your case",
                    "Bilingual support (English & Arabic)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300 font-medium">Premium Plan</span>
                <Badge className="bg-blue-600 text-white text-base px-3 py-1">$1.00 USD</Badge>
              </div>

              {paypalError && (
                <Alert className="border-red-700 bg-red-900/30">
                  <AlertDescription className="text-red-300">{paypalError}</AlertDescription>
                </Alert>
              )}

              {!paypalLoaded && !paypalError && (
                <div className="text-center py-6 text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading PayPal…
                </div>
              )}

              <div ref={paypalContainerRef} className={paypalLoaded ? "block" : "hidden"} />

              <button
                onClick={() => setStep("plan")}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Back to plan selection
              </button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Success ── */}
        {step === "success" && (
          <Card className="bg-slate-800/80 border-slate-700 shadow-2xl text-center">
            <CardContent className="pt-10 pb-8 space-y-5">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome aboard!</h2>
                {selectedPlan === "premium" ? (
                  <p className="text-slate-400 mt-2">Your account is ready with <span className="text-blue-400 font-semibold">10 consultations</span></p>
                ) : (
                  <p className="text-slate-400 mt-2">Your free account is ready with <span className="text-blue-400 font-semibold">1 consultation</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-400">{selectedPlan === "premium" ? "10" : "1"}</p>
                  <p className="text-slate-400">Consultation{selectedPlan === "premium" ? "s" : ""}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-400">AI</p>
                  <p className="text-slate-400">Powered Analysis</p>
                </div>
              </div>
              {selectedPlan === "free" && (
                <div className="p-3 bg-blue-900/30 border border-blue-700/40 rounded-lg text-blue-300 text-sm">
                  <Sparkles className="w-4 h-4 inline mr-1.5 text-yellow-400" />
                  You can upgrade to 10 consultations for $1 at any time from your dashboard.
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/my-profile")} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base py-5">
                  <span className="flex items-center gap-2"><FolderHeart className="w-5 h-5" /> View My Medical Profile</span>
                </Button>
                <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
