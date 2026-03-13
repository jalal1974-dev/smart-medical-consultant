import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock, LogIn, Shield } from "lucide-react";
import { getLoginUrl, getGoogleLoginUrl } from "@/const";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.loginLocal.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Welcome back!");
      navigate("/dashboard");
    },
    onError: (err) => {
      setError(err.message || "Invalid username or password");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter your username and password");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

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
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        <Card className="bg-slate-800/80 border-slate-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LogIn className="w-5 h-5 text-blue-400" /> Sign In
            </CardTitle>
            <CardDescription className="text-slate-400">
              Use your username and password to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">Username</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="your_username"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(null); }}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-800 px-2 text-slate-500">or continue with</span>
                </div>
              </div>

              {/* Google OAuth */}
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
                Sign in with Google
              </Button>

              {/* Manus Account fallback */}
              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 text-sm"
                onClick={() => { window.location.href = getLoginUrl(); }}
              >
                Sign in with Manus Account
              </Button>

              <p className="text-center text-slate-400 text-sm">
                Don't have an account?{" "}
                <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                  Create one for $1
                </Link>
              </p>
            </form>

            <div className="flex items-center gap-2 mt-4 p-3 bg-slate-700/30 rounded-lg">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-xs text-slate-500">
                Your credentials are protected with industry-standard bcrypt encryption.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
