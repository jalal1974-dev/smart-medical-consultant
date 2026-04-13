import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  FileText, Image, Presentation, Map, Download, Upload,
  RefreshCw, ChevronLeft, ChevronRight, ExternalLink, ClipboardList,
} from "lucide-react";

const REPORT_TYPE_LABELS: Record<string, { label: string; labelAr: string; icon: React.ReactNode; color: string }> = {
  infographic:       { label: "Infographic",        labelAr: "إنفوجرافيك",         icon: <Image className="w-3.5 h-3.5" />,        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  pdf:               { label: "PDF Report",          labelAr: "تقرير PDF",           icon: <FileText className="w-3.5 h-3.5" />,     color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  slides:            { label: "Slide Deck",          labelAr: "عرض الشرائح",         icon: <Presentation className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  mindmap:           { label: "Mind Map",            labelAr: "خريطة ذهنية",         icon: <Map className="w-3.5 h-3.5" />,          color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  pptx:              { label: "PPTX Report",         labelAr: "تقرير PPTX",          icon: <Download className="w-3.5 h-3.5" />,     color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  all:               { label: "All Reports",         labelAr: "جميع التقارير",       icon: <RefreshCw className="w-3.5 h-3.5" />,    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  upload_infographic:{ label: "Upload Infographic",  labelAr: "رفع إنفوجرافيك",     icon: <Upload className="w-3.5 h-3.5" />,       color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  upload_pptx:       { label: "Upload PPTX",         labelAr: "رفع PPTX",            icon: <Upload className="w-3.5 h-3.5" />,       color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
};

const ACTION_LABELS: Record<string, { label: string; labelAr: string }> = {
  generate:   { label: "Generate",   labelAr: "توليد" },
  regenerate: { label: "Regenerate", labelAr: "إعادة توليد" },
  upload:     { label: "Upload",     labelAr: "رفع" },
};

const PAGE_SIZE = 20;

export default function AdminReportLog() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.admin.getReportLogs.useQuery(
    {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      reportType: filterType === "all" ? undefined : filterType,
    },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Auth guard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>This page is restricted to administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen py-10">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Report Generation Log</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Audit trail of all admin-triggered report actions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(REPORT_TYPE_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Actions", value: total },
            { label: "Generates",    value: logs.filter(l => l.action === "generate").length },
            { label: "Regenerates",  value: logs.filter(l => l.action === "regenerate").length },
            { label: "Uploads",      value: logs.filter(l => l.action === "upload").length },
          ].map(stat => (
            <Card key={stat.label} className="text-center py-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                Loading log entries…
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No log entries yet.</p>
                <p className="text-sm mt-1">Report generation actions will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Timestamp</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Admin</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Report Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Patient</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Consultation</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => {
                      const typeInfo = REPORT_TYPE_LABELS[log.reportType] ?? { label: log.reportType, labelAr: log.reportType, icon: null, color: "bg-gray-100 text-gray-700" };
                      const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, labelAr: log.action };
                      return (
                        <tr key={log.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                          {/* Timestamp */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                            </span>
                          </td>
                          {/* Admin */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {log.adminName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium leading-tight">{log.adminName}</p>
                                <p className="text-xs text-muted-foreground">ID #{log.adminId}</p>
                              </div>
                            </div>
                          </td>
                          {/* Action */}
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs gap-1">
                              {actionInfo.label}
                            </Badge>
                          </td>
                          {/* Report Type */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.icon}
                              {typeInfo.label}
                            </span>
                          </td>
                          {/* Patient */}
                          <td className="px-4 py-3">
                            <p className="font-medium">{log.patientName}</p>
                          </td>
                          {/* Consultation ID */}
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-primary"
                              onClick={() => navigate("/admin")}
                            >
                              #{log.consultationId}
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            {log.status === "success" ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs">
                                ✓ Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                ✗ Failed
                              </Badge>
                            )}
                            {log.errorMessage && (
                              <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={log.errorMessage}>
                                {log.errorMessage}
                              </p>
                            )}
                          </td>
                          {/* Output URL */}
                          <td className="px-4 py-3">
                            {log.outputUrl ? (
                              <a
                                href={log.outputUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="text-sm font-medium px-2">
                Page {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
