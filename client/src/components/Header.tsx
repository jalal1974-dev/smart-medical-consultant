import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  const navItems = [
    { path: "/", label: t("home") },
    { path: "/videos", label: t("videos") },
    { path: "/podcasts", label: t("podcasts") },
    { path: "/consultations", label: t("consultations") },
  ];

  if (isAuthenticated) {
    navItems.push({ path: "/dashboard", label: t("dashboard") });
  }

  if (user?.role === "admin") {
    navItems.push({ path: "/admin", label: t("admin") });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="Logo" className="h-10 w-10 rounded-md object-cover" />
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">
              {language === "en" ? t("siteName") : t("siteName")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("siteTagline")}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              {t("signOut")}
            </Button>
          ) : (
            <Button size="sm" asChild>
              <a href={getLoginUrl()}>{t("signIn")}</a>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t">
              <LanguageToggle />
              {isAuthenticated ? (
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  {t("signOut")}
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <a href={getLoginUrl()}>{t("signIn")}</a>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
