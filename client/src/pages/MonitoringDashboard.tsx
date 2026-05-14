import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  FileText,
  Brain,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  ai_processing: "AI Processing",
  ai_complete: "AI Complete",
  specialist_review: "Specialist Review",
  doctor_reviewed: "Doctor Reviewed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "#94a3b8",
  ai_processing: "#60a5fa",
  ai_complete: "#34d399",
  specialist_review: "#f59e0b",
  doctor_reviewed: "#a78bfa",
  completed: "#22c55e",
  cancelled: "#f87171",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  urgent: "#f97316",
  moderate: "#eab308",
  routine: "#22c55e",
};

const FILTER_LABELS: Record<string, string> = {
  missing_both: "Missing Both (Analysis & Report)",
  missing_analysis: "Missing AI Analysis",
  missing_report: "Missing PDF Report",
  all_incomplete: "All Incomplete (not completed/cancelled)",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted`}>
            <Icon className={`w-5 h-5 ${accent}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MonitoringDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [drillFilter, setDrillFilter] = useState<
    "missing_both" | "missing_analysis" | "missing_report" | "all_incomplete"
  >("missing_both");

  // Redirect non-admins
  if (!authLoading && (!user || user.role !== "admin")) {
    navigate("/");
    return null;
  }

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.admin.getMonitoringStats.useQuery(undefined, {
    refetchInterval: 60_000, // auto-refresh every 60 s
  });

  const {
    data: drillRows,
    isLoading: drillLoading,
    refetch: refetchDrill,
  } = trpc.admin.getMissingDataConsultations.useQuery(
    { filter: drillFilter },
    { placeholderData: (prev: any) => prev }
  );

  function handleRefresh() {
    refetchStats();
    refetchDrill();
    toast.success("Dashboard refreshed");
  }

  const isLoading = statsLoading || authLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-1 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Admin Panel
          </Button>
          <div className="w-px h-5 bg-border" />
          <h1 className="text-lg font-semibold">Consultation Monitoring</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── Summary cards ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="pt-5 pb-4 h-24" />
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Consultations"
                value={stats.total}
                icon={FileText}
                accent="text-foreground"
              />
              <StatCard
                title="Completed"
                value={stats.completed}
                sub={`${Math.round((stats.completed / (stats.total || 1)) * 100)}% of total`}
                icon={CheckCircle2}
                accent="text-green-500"
              />
              <StatCard
                title="Missing AI Analysis"
                value={stats.missingAnalysis}
                sub={`${stats.completedMissingAnalysis} completed but missing`}
                icon={Brain}
                accent={stats.missingAnalysis > 0 ? "text-amber-500" : "text-green-500"}
              />
              <StatCard
                title="Missing PDF Report"
                value={stats.missingReport}
                sub={`${stats.completedMissingReport} completed but missing`}
                icon={AlertTriangle}
                accent={stats.completedMissingReport > 0 ? "text-red-500" : stats.missingReport > 0 ? "text-amber-500" : "text-green-500"}
              />
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status bar chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Consultations by Status
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Distribution across all workflow stages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={stats.byStatus.filter((s) => s.count > 0)}
                      margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
                    >
                      <XAxis
                        dataKey="status"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        tickFormatter={(v) => STATUS_LABELS[v] ?? v}
                      />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(v, _, p) => [
                          v,
                          STATUS_LABELS[p.payload.status] ?? p.payload.status,
                        ]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stats.byStatus
                          .filter((s) => s.count > 0)
                          .map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority pie chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Consultations by Priority
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Breakdown of case urgency levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats.byPriority.filter((p) => p.count > 0)}
                        dataKey="count"
                        nameKey="priority"
                        cx="50%"
                        cy="45%"
                        outerRadius={75}
                        label={({ priority, percent }) =>
                          `${priority} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {stats.byPriority
                          .filter((p) => p.count > 0)
                          .map((entry) => (
                            <Cell
                              key={entry.priority}
                              fill={PRIORITY_COLORS[entry.priority] ?? "#94a3b8"}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [v, name]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── Data health summary ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Data Health Overview
                </CardTitle>
                <CardDescription className="text-xs">
                  Completeness of AI-generated content across all consultations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    {
                      label: "Have AI Analysis",
                      value: stats.total - stats.missingAnalysis,
                      total: stats.total,
                      ok: true,
                    },
                    {
                      label: "Missing AI Analysis",
                      value: stats.missingAnalysis,
                      total: stats.total,
                      ok: stats.missingAnalysis === 0,
                    },
                    {
                      label: "Have PDF Report",
                      value: stats.total - stats.missingReport,
                      total: stats.total,
                      ok: true,
                    },
                    {
                      label: "Missing PDF Report",
                      value: stats.missingReport,
                      total: stats.total,
                      ok: stats.missingReport === 0,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      {item.ok ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-base">{item.value}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((item.value / (item.total || 1)) * 100)}%
                          of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* ── Drilldown table ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Consultation Drilldown
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {drillRows
                    ? `${drillRows.length} consultation${drillRows.length !== 1 ? "s" : ""} match the selected filter`
                    : "Loading…"}
                </CardDescription>
              </div>
              <Select
                value={drillFilter}
                onValueChange={(v) => setDrillFilter(v as typeof drillFilter)}
              >
                <SelectTrigger className="w-full sm:w-72 text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILTER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {drillLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Loading…
              </div>
            ) : drillRows && drillRows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-center">Analysis</TableHead>
                      <TableHead className="text-center">PDF Report</TableHead>
                      <TableHead className="text-center">Archived PDF</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillRows.map((row) => (
                      <TableRow key={row.id} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground">
                          #{row.id}
                        </TableCell>
                        <TableCell className="font-medium max-w-[140px] truncate">
                          {row.patientName || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              borderColor: STATUS_COLORS[row.status] ?? "#94a3b8",
                              color: STATUS_COLORS[row.status] ?? "#94a3b8",
                            }}
                          >
                            {STATUS_LABELS[row.status] ?? row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.priority ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                borderColor:
                                  PRIORITY_COLORS[row.priority] ?? "#94a3b8",
                                color:
                                  PRIORITY_COLORS[row.priority] ?? "#94a3b8",
                              }}
                            >
                              {row.priority}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.hasAnalysis ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.hasReport ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.hasArchivedPdf ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-amber-400 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(row.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <p className="text-sm font-medium text-foreground">
                  All clear!
                </p>
                <p className="text-xs">
                  No consultations match the selected filter.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
