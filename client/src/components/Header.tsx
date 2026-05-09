import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Menu, X, User, LogOut, LayoutDashboard, FolderHeart, Bell } from "lucide-react";
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
import { useLocation as useWouterLocation } from "wouter";

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [location] = useLocation();
  const [, navigate] = useWouterLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();

  // Unread consultation badge — only fetched for admins
  const { data: unreadData } = trpc.admin.unreadConsultationCount.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Patient notification bell — only for non-admin authenticated users
  const isPatient = isAuthenticated && user?.role !== "admin";
  const { data: notifData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isPatient,
    refetchInterval: 30_000,
  });
  const { data: notifList } = trpc.notifications.getAll.useQuery(undefined, {
    enabled: isPatient,
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });
  const unreadNotifCount = notifData?.count ?? 0;
  const notifications = notifList ?? [];

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  const handleBellOpen = () => {
    if (unreadNotifCount > 0) {
      markAllReadMutation.mutate();
    }
  };

  const navItems = [
    { path: "/", label: t("home") },
    { path: "/blog", label: language === "ar" ? "المدونة" : "Blog" },
    { path: "/videos", label: t("videos") },
    { path: "/podcasts", label: t("podcasts") },
    { path: "/consultations", label: t("consultations") },
    { path: "/contact", label: language === "ar" ? "اتصل بنا" : "Contact" },
  ];

  if (isAuthenticated) {
    navItems.push({ path: "/dashboard", label: t("dashboard") });
  }

  if (user?.role === "admin") {
    navItems.push({ path: "/admin", label: t("admin") });
    navItems.push({ path: "/admin/blog", label: language === "ar" ? "إدارة المدونة" : "Blog Mgmt" });
    navItems.push({ path: "/admin/report-log", label: language === "ar" ? "سجل التقارير" : "Report Log" });
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
              className={`relative text-sm font-medium transition-colors hover:text-primary ${
                location === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
              {item.path === "/admin" && unreadCount > 0 && (
                <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />

          {/* Patient notification bell */}
          {isPatient && (
            <DropdownMenu onOpenChange={(open) => open && handleBellOpen()}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>{language === "ar" ? "الإشعارات" : "Notifications"}</span>
                  {notifications.length > 0 && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {notifications.length} {language === "ar" ? "إشعار" : "total"}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {language === "ar" ? "لا توجد إشعارات" : "No notifications yet"}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                      onClick={() => navigate("/dashboard")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                        {notif.body}
                      </p>
                      <span className="text-[10px] text-muted-foreground pl-4">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-center text-xs text-primary cursor-pointer justify-center"
                      onClick={() => navigate("/dashboard")}
                    >
                      {language === "ar" ? "عرض لوحة التحكم" : "Go to Dashboard"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile notification bell */}
          {isPatient && (
            <DropdownMenu onOpenChange={(open) => open && handleBellOpen()}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>{language === "ar" ? "الإشعارات" : "Notifications"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {language === "ar" ? "لا توجد إشعارات" : "No notifications yet"}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                      onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {!notif.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                        <span className="text-sm font-medium">{notif.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{notif.body}</p>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            className="p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`relative inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                  location === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
                {item.path === "/admin" && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
                    <Link href="/register">{language === "ar" ? "إنشاء حساب مجاناً" : "Register Free"}</Link>
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
