import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Header } from "./components/Header";
import Home from "./pages/Home";
import Videos from "./pages/Videos";
import Podcasts from "./pages/Podcasts";
import Consultations from "./pages/Consultations";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import PatientProfile from "./pages/PatientProfile";
import Analytics from "./pages/Analytics";

function Router() {
  return (
    <>
      <Header />
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/videos"} component={Videos} />
        <Route path={"/podcasts"} component={Podcasts} />
        <Route path={"/consultations"} component={Consultations} />
        <Route path={"/dashboard"} component={Dashboard} />
        <Route path="/profile" component={PatientProfile} />
        <Route path="/analytics" component={Analytics} />
        <Route path={"/admin"} component={AdminPanel} />
        <Route path="/payment-confirmation/:consultationId" component={PaymentConfirmation} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
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
