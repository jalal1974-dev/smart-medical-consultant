import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Users,
  Search,
  Eye,
  Crown,
  User,
  Mail,
  Calendar,
  CreditCard,
  ArrowLeft,
} from "lucide-react";

export default function AdminCustomers() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = trpc.admin.users.useQuery();

  const isAr = language === "ar";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const filtered = (users || []).filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const planBadge = (planType: string, role: string) => {
    if (role === "admin")
      return (
        <Badge className="bg-purple-600 text-white">
          <Crown className="w-3 h-3 mr-1" />
          {isAr ? "مدير" : "Admin"}
        </Badge>
      );
    if (planType === "premium")
      return (
        <Badge className="bg-amber-500 text-white">
          <CreditCard className="w-3 h-3 mr-1" />
          {isAr ? "مميز" : "Premium"}
        </Badge>
      );
    return (
      <Badge variant="secondary">
        <User className="w-3 h-3 mr-1" />
        {isAr ? "مجاني" : "Free"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-6xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => setLocation("/admin")}
        >
          <ArrowLeft className="w-4 h-4" />
          {isAr ? "العودة إلى لوحة التحكم" : "Back to Admin Panel"}
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {isAr ? "إدارة العملاء" : "Customer Management"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isAr
                  ? `${users?.length || 0} مستخدم مسجل`
                  : `${users?.length || 0} registered users`}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث بالاسم أو البريد الإلكتروني..." : "Search by name or email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {isAr ? "لا يوجد مستخدمون" : "No users found"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((u) => (
              <Card key={u.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Avatar + info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name || ""}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">
                            {u.name || (isAr ? "بدون اسم" : "No name")}
                          </span>
                          {planBadge(u.planType, u.role)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                          {u.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(u.createdAt).toLocaleDateString(
                              isAr ? "ar-SA" : "en-US"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quota info + view button */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium">
                          {u.freeConsultationsUsed}/{u.freeConsultationsTotal}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isAr ? "استشارات مستخدمة" : "consultations used"}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setLocation(`/admin/customer/${u.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                        {isAr ? "عرض الملف" : "View Profile"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
