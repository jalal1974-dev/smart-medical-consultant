/**
 * ProtectedRoute — wraps any page that requires authentication.
 *
 * Behaviour:
 * - While auth is loading  → shows a centered spinner (no flash of login redirect)
 * - Not authenticated      → redirects to /login?next=<current-path>
 * - Authenticated          → renders children
 *
 * AdminRoute additionally checks role === "admin" and shows a 403 card for
 * authenticated non-admin users instead of bouncing them to login.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

// ─── Shared loading spinner ───────────────────────────────────────────────────
function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  if (loading) return <AuthLoading />;

  if (!isAuthenticated) {
    // Preserve the intended destination so login can redirect back
    const next = encodeURIComponent(location);
    return <Redirect to={`/login?next=${next}`} />;
  }

  return <>{children}</>;
}

// ─── AdminRoute ───────────────────────────────────────────────────────────────
export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const [location] = useLocation();

  if (loading) return <AuthLoading />;

  if (!isAuthenticated) {
    const next = encodeURIComponent(location);
    return <Redirect to={`/login?next=${next}`} />;
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              This page is restricted to administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/">Return to Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
