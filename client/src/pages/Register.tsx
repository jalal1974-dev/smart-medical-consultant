import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, User, Mail, Lock, ArrowRight, Shield, FolderHeart, Zap, Gift } from "lucide-react";

type Step = "account" | "success";

interface AccountData {
  username: string;
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("account");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [accountData, setAccountData] = useState<AccountData>({
    username: "",
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<AccountData>>({});

  const registerMutation = trpc.auth.register.useMutation();
  const utils = trpc.useUtils();

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
      await registerMutation.mutateAsync({
        username: accountData.username,
        email: accountData.email,
        name: accountData.name,
        password: accountData.password,
      });
      await utils.auth.me.invalidate();
      setStep("success");
      toast.success("Account created! Your free consultation is ready.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo.jpeg" alt="Smart Medical Consultant" className="h-14 mx-auto mb-3 cursor-pointer rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Create Your Free Account</h1>
          <p className="text-slate-400 text-sm mt-1">Register now — your first consultation is on us</p>
        </div>

        {/* Step 1: Account Info */}
        {step === "account" && (
          <Card className="bg-slate-800/80 border-slate-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" /> Account Information
              </CardTitle>
              <CardDescription className="text-slate-400">Create your secure account — completely free</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Free consultation banner */}
              <div className="flex items-center gap-3 p-3 bg-green-900/30 border border-green-700/50 rounded-lg mb-5">
                <Gift className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-green-300 font-medium text-sm">1 Free Consultation Included</p>
                  <p className="text-slate-400 text-xs">Register today and get your first AI-powered medical consultation at no cost. Each additional consultation is $5.</p>
                </div>
              </div>

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
                  <p className="text-xs text-slate-400">Your password is encrypted with bcrypt (12 rounds) — industry-standard security used by banks.</p>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Creating Account..." : (
                    <span className="flex items-center gap-2">Create Free Account <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>

                <p className="text-center text-slate-400 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Success */}
        {step === "success" && (
          <Card className="bg-slate-800/80 border-slate-700 shadow-2xl text-center">
            <CardContent className="pt-10 pb-8 space-y-5">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome aboard!</h2>
                <p className="text-slate-400 mt-2">Your account is ready with 1 free consultation</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-400">1</p>
                  <p className="text-slate-400">Free Consultation</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-400">$5</p>
                  <p className="text-slate-400">Each Additional</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg text-left">
                <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-xs text-slate-400">Submit your first consultation now. Our AI will analyze your case and generate a full medical report, infographic, and slide deck.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/consultations")} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base py-5">
                  <span className="flex items-center gap-2"><Zap className="w-5 h-5" /> Start My Free Consultation</span>
                </Button>
                <Button onClick={() => navigate("/my-profile")} variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  <FolderHeart className="w-4 h-4 mr-2" /> View My Medical Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
