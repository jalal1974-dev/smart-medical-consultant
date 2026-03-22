import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Header } from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Videos from "./pages/Videos";
import Podcasts from "./pages/Podcasts";
import Consultations from "./pages/Consultations";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import AIConsultationReview from "./pages/AIConsultationReview";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import PatientProfile from "./pages/PatientProfile";
import MyProfile from "./pages/MyProfile";
import Analytics from "./pages/Analytics";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import BlogManagement from "./pages/BlogManagement";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Activate from "./pages/Activate";
import AdminCustomers from "./pages/AdminCustomers";
import AdminCustomerView from "./pages/AdminCustomerView";
import MedicalConsultationGenerator from "./pages/MedicalConsultationGenerator";
import { useEffect } from "react";
import { updatePageSEO, updateCanonicalURL } from "./lib/seo";

function Router() {
  const [location] = useLocation();

  // Update SEO on route change
  useEffect(() => {
    const path = location.split('?')[0];
    updateCanonicalURL(path);

    const routeToPageMap: Record<string, string> = {
      '/': 'home',
      '/videos': 'videos',
      '/podcasts': 'podcasts',
      '/consultations': 'consultations',
      '/dashboard': 'dashboard',
      '/analytics': 'analytics',
      '/admin': 'admin',
      '/blog': 'blog'
    };

    const pageKey = routeToPageMap[path];
    if (pageKey) {
      updatePageSEO(pageKey as any);
    }
  }, [location]);

  return (
    <>
      <Header />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          <Switch>
            <Route path={"/"} component={Home} />
            <Route path={"/videos"} component={Videos} />
            <Route path={"/podcasts"} component={Podcasts} />
            <Route path={"/consultations"} component={Consultations} />
            <Route path={"/dashboard"} component={Dashboard} />
            <Route path="/profile" component={PatientProfile} />
            <Route path="/patient/:userId" component={PatientProfile} />
            <Route path="/my-profile" component={MyProfile} />
            <Route path="/analytics" component={Analytics} />
            <Route path={"/admin"} component={AdminPanel} />
            <Route path={"/admin/ai-review"} component={AIConsultationReview} />
            <Route path="/admin/customers" component={AdminCustomers} />
            <Route path="/admin/customer/:userId" component={AdminCustomerView} />
            <Route path="/payment-confirmation/:consultationId" component={PaymentConfirmation} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:slug" component={BlogArticle} />
            <Route path="/admin/blog" component={BlogManagement} />
            <Route path="/register" component={Register} />
            <Route path="/login" component={Login} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            {/* Voluntary upgrade page — users can pay $1 for 10 consultations */}
            <Route path="/activate" component={Activate} />
            {/* Direct Python API consultation PPTX generator */}
            <Route path="/generate" component={MedicalConsultationGenerator} />
            <Route path={"/404"} component={NotFound} />
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
