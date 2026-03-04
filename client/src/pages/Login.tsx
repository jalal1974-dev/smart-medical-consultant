import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock, LogIn, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";

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
                <Label className="text-slate-300">Password</Label>
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
                  <span className="bg-slate-800 px-2 text-slate-500">or</span>
                </div>
              </div>

              {/* OAuth login option */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
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
