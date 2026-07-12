import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Header } from "./components/Header";
import Footer from "./components/Footer";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";

// ── Public pages ──────────────────────────────────────────────────────────────
import Home from "./pages/Home";
import Videos from "./pages/Videos";
import Podcasts from "./pages/Podcasts";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ExternalUpload from "./pages/ExternalUpload";
import SymptomChecker from "./pages/SymptomChecker";

// ── Protected patient pages ───────────────────────────────────────────────────
import Consultations from "./pages/Consultations";
import Dashboard from "./pages/Dashboard";
import PatientProfile from "./pages/PatientProfile";
import MyProfile from "./pages/MyProfile";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import MedicalHistoryCollection from "./pages/MedicalHistoryCollection";
import MedicalAvatarSession from "./pages/MedicalAvatarSession";
import ConsultationDetail from "./pages/ConsultationDetail";

// ── Admin-only pages ──────────────────────────────────────────────────────────
import AdminPanel from "./pages/AdminPanel";
import MonitoringDashboard from "./pages/MonitoringDashboard";
import AIConsultationReview from "./pages/AIConsultationReview";
import AdminReportLog from "./pages/AdminReportLog";
import BlogManagement from "./pages/BlogManagement";

import { useEffect } from "react";
import { updatePageSEO, updateCanonicalURL } from "./lib/seo";

function Router() {
  const [location] = useLocation();

  // Update SEO on route change
  useEffect(() => {
    const path = location.split("?")[0];
    updateCanonicalURL(path);
    const routeToPageMap: Record<string, string> = {
      "/": "home",
      "/videos": "videos",
      "/podcasts": "podcasts",
      "/consultations": "consultations",
      "/dashboard": "dashboard",
      "/admin": "admin",
      "/blog": "blog",
    };
    const pageKey = routeToPageMap[path];
    if (pageKey) updatePageSEO(pageKey as any);
  }, [location]);

  return (
    <>
      <Header />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          <Switch>
            {/* ── Public routes ──────────────────────────────────────────── */}
            <Route path="/" component={Home} />
            <Route path="/videos" component={Videos} />
            <Route path="/podcasts" component={Podcasts} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:slug" component={BlogArticle} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/contact" component={Contact} />
            <Route path="/register" component={Register} />
            <Route path="/login" component={Login} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            {/* Token-gated external upload — public by design (token is the secret) */}
            <Route path="/upload/:token" component={ExternalUpload} />
            {/* Symptom checker is intentionally public */}
            <Route path="/symptom-checker" component={SymptomChecker} />

            {/* ── Protected patient routes ───────────────────────────────── */}
            <Route path="/consultations">
              <ProtectedRoute><Consultations /></ProtectedRoute>
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            </Route>
            <Route path="/profile">
              <ProtectedRoute><PatientProfile /></ProtectedRoute>
            </Route>
            <Route path="/patient/:userId">
              {(params) => (
                <ProtectedRoute><PatientProfile /></ProtectedRoute>
              )}
            </Route>
            <Route path="/my-profile">
              <ProtectedRoute><MyProfile /></ProtectedRoute>
            </Route>
            {/* PaymentConfirmation is the post-submission landing page — always protected */}
            <Route path="/payment-confirmation/:consultationId">
              <ProtectedRoute><PaymentConfirmation /></ProtectedRoute>
            </Route>
            <Route path="/consultation/history-collection">
              <ProtectedRoute><MedicalHistoryCollection /></ProtectedRoute>
            </Route>
            <Route path="/consultation/:id/avatar">
              {(params) => (
                <ProtectedRoute><MedicalAvatarSession /></ProtectedRoute>
              )}
            </Route>
            <Route path="/consultation/:id">
              {(params) => (
                <ProtectedRoute><ConsultationDetail /></ProtectedRoute>
              )}
            </Route>

            {/* ── Admin-only routes ──────────────────────────────────────── */}
            <Route path="/admin">
              <AdminRoute><AdminPanel /></AdminRoute>
            </Route>
            <Route path="/admin/ai-review">
              <AdminRoute><AIConsultationReview /></AdminRoute>
            </Route>
            <Route path="/admin/report-log">
              <AdminRoute><AdminReportLog /></AdminRoute>
            </Route>
            <Route path="/admin/monitoring">
              <AdminRoute><MonitoringDashboard /></AdminRoute>
            </Route>
            <Route path="/admin/blog">
              <AdminRoute><BlogManagement /></AdminRoute>
            </Route>

            {/* ── Fallback ───────────────────────────────────────────────── */}
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
