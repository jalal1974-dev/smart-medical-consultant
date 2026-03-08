import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Menu, X, User, LogOut, LayoutDashboard, FolderHeart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    { path: "/blog", label: language === "ar" ? "المدونة" : "Blog" },
    { path: "/videos", label: t("videos") },
    { path: "/podcasts", label: t("podcasts") },
    { path: "/consultations", label: t("consultations") },
  ];

  if (isAuthenticated) {
    navItems.push({ path: "/dashboard", label: t("dashboard") });
  }

  if (user?.role === "admin") {
    navItems.push({ path: "/analytics", label: language === "ar" ? "التحليلات" : "Analytics" });
    navItems.push({ path: "/admin", label: t("admin") });
    navItems.push({ path: "/admin/blog", label: language === "ar" ? "إدارة المدونة" : "Blog Mgmt" });
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                    {user?.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t("dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-profile" className="cursor-pointer">
                    <FolderHeart className="mr-2 h-4 w-4" />
                    {language === "ar" ? "ملفي الطبي" : "My Medical Profile"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/login">{language === "ar" ? "تسجيل الدخول" : "Sign In"}</Link>
              </Button>
              <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/register">{language === "ar" ? "إنشاء حساب" : "Register"}</Link>
              </Button>
            </div>
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
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user?.name || "User"}</span>
                      {user?.email && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("signOut")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link href="/login">{language === "ar" ? "تسجيل الدخول" : "Sign In"}</Link>
                  </Button>
                  <Button size="sm" asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/register">{language === "ar" ? "إنشاء حساب ($1)" : "Register ($1)"}</Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
