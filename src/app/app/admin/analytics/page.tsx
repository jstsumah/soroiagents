"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../app-provider";
import { getAnalyticsData } from "@/services/analytics-service";
import type { AnalyticsOverview } from "@/services/analytics-service";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import {
  Loader2, Download, Users, UserCheck, UserX, TrendingUp,
  MessageSquare, BarChart3, Globe, RefreshCw, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

// ─── Tier colours matching existing CSS tokens ────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  "Rack Rates": "#9CA3AF",
  Brass:        "#B45309",
  Bronze:       "#78350F",
  Silver:       "#6B7280",
  Gold:         "#B68D6A",
  Preferred:    "#7B6A58",
  "Super Preferred": "#4B3832",
  Platinum:     "#374151",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "#16a34a",
  pending:  "#d97706",
  inactive: "#dc2626",
};

const TYPE_COLORS: Record<string, string> = {
  international: "#7B6A58",
  local:         "#B68D6A",
};

const CHART_PALETTE = [
  "#7B6A58", "#B68D6A", "#4B3832", "#9CA3AF",
  "#B45309", "#78350F", "#6B7280", "#374151",
];

// ─── Date range helpers ───────────────────────────────────────────────────────
type RangeKey = "7d" | "30d" | "90d" | "ytd";

function getRangeDates(key: RangeKey): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start: string;
  if (key === "7d") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    start = d.toISOString().slice(0, 10);
  } else if (key === "30d") {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    start = d.toISOString().slice(0, 10);
  } else if (key === "90d") {
    const d = new Date(now); d.setDate(d.getDate() - 90);
    start = d.toISOString().slice(0, 10);
  } else {
    start = `${now.getFullYear()}-01-01`;
  }
  return { start, end };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtAction(action: string) {
  return action.replace(/\./g, " › ").replace(/_/g, " ");
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, title, value, sub, accent = false,
}: { icon: React.ReactNode; title: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card className={`relative overflow-hidden transition-shadow hover:shadow-md ${accent ? "border-primary/40" : ""}`}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-gradient-to-br from-primary to-accent" />
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
      <BarChart3 className="h-8 w-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name ?? p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Export helper ────────────────────────────────────────────────────────────
function exportToExcel(data: AnalyticsOverview, range: RangeKey) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Metric: "Total Agents", Value: data.totalAgents },
    { Metric: "Active Agents", Value: data.activeAgents },
    { Metric: "Pending Agents", Value: data.pendingAgents },
    { Metric: "Total Downloads (period)", Value: data.totalDownloads },
    { Metric: "Total Chat Sessions (period)", Value: data.totalChatSessions },
    { Metric: "Open Chat Sessions", Value: data.openChatSessions },
  ]), "Overview");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.agentGrowth), "Agent Growth");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.tierDistribution), "Tier Distribution");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.countryDistribution), "Top Countries");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.topDownloads), "Top Downloads");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.supportVolume), "Support Volume");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.adminActionSummary), "Admin Actions");

  XLSX.writeFile(wb, `soroi-analytics-${range}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [range, setRange] = React.useState<RangeKey>("30d");
  const [data, setData] = React.useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);

  // Auth guard
  React.useEffect(() => {
    if (!authLoading && user?.role === "Agent") {
      router.replace("/app/agent/dashboard");
    }
  }, [user?.role, authLoading, router]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, end } = getRangeDates(range);
      const result = await getAnalyticsData(start, end);
      setData(result);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  if (authLoading || (!data && isLoading) || !user || user.role === "Agent") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePct = data && data.totalAgents > 0
    ? ((data.activeAgents / data.totalAgents) * 100).toFixed(0)
    : "0";

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Agent portal insights and engagement metrics.
            {lastRefreshed && (
              <span className="ml-2 text-xs opacity-60">
                Last updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-40" id="analytics-range-selector">
              <Calendar className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} id="analytics-refresh-btn">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {data && (
            <Button variant="outline" onClick={() => exportToExcel(data, range)} id="analytics-export-btn">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing data...
        </div>
      )}

      {data && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-primary/10 border border-primary/20 p-1 rounded-xl w-fit" id="analytics-tabs">
            {["overview", "engagement", "support", "demographics"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize rounded-lg px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                id={`analytics-tab-${tab}`}
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ══════════════════════════════════════
              TAB 1 — OVERVIEW
          ══════════════════════════════════════ */}
          <TabsContent value="overview" className="mt-6 flex flex-col gap-8">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon={<Users className="h-5 w-5" />} title="Total Agents" value={data.totalAgents} accent />
              <StatCard icon={<UserCheck className="h-5 w-5" />} title="Active Agents" value={data.activeAgents} sub={`${activePct}% of total`} />
              <StatCard icon={<UserX className="h-5 w-5" />} title="Pending" value={data.pendingAgents} sub="Awaiting activation" />
              <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Downloads" value={data.totalDownloads} sub="In selected period" />
              <StatCard icon={<MessageSquare className="h-5 w-5" />} title="Chat Sessions" value={data.totalChatSessions} sub="In selected period" />
              <StatCard icon={<MessageSquare className="h-5 w-5" />} title="Open Chats" value={data.openChatSessions} sub="Currently unresolved" />
            </div>

            {/* Agent growth chart */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Registrations Over Time</CardTitle>
                <CardDescription>New agent signups per day in the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.agentGrowth.length === 0 ? (
                  <EmptyState message="No registrations in this period." />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.agentGrowth} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7B6A58" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#7B6A58" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="signups" name="Signups" stroke="#7B6A58" strokeWidth={2} fill="url(#growthGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status + Type pie */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Status Breakdown</CardTitle>
                  <CardDescription>All agents by account status.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={data.statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {data.statusDistribution.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#9CA3AF"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, String(n)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex flex-col gap-2 text-sm">
                    {data.statusDistribution.map((s) => (
                      <li key={s.status} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] ?? "#9CA3AF" }} />
                        <span className="capitalize">{s.status}</span>
                        <Badge variant="outline" className="ml-auto">{s.count}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent Type Distribution</CardTitle>
                  <CardDescription>Local vs. International agents.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={data.typeDistribution} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {data.typeDistribution.map((entry) => (
                          <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#9CA3AF"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, String(n)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex flex-col gap-2 text-sm">
                    {data.typeDistribution.map((t) => (
                      <li key={t.type} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: TYPE_COLORS[t.type] ?? "#9CA3AF" }} />
                        <span className="capitalize">{t.type}</span>
                        <Badge variant="outline" className="ml-auto">{t.count}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 2 — ENGAGEMENT
          ══════════════════════════════════════ */}
          <TabsContent value="engagement" className="mt-6 flex flex-col gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Top Downloaded Resources</CardTitle>
                <CardDescription>
                  Most frequently accessed rates, brochures, and training materials in this period.
                  {data.totalDownloads === 0 && (
                    <span className="ml-2 text-muted-foreground text-xs">(Download tracking starts accumulating from the moment this feature is deployed.)</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.topDownloads.length === 0 ? (
                  <EmptyState message="No download events recorded yet in this period." />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={data.topDownloads}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="title"
                        width={160}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" name="Downloads" radius={[0, 4, 4, 0]}>
                        {data.topDownloads.map((_, i) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Download breakdown table */}
            {data.topDownloads.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Download Details</CardTitle>
                  <CardDescription>All tracked downloads ranked by frequency.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">#</th>
                          <th className="text-left py-2 pr-4 font-medium">Resource</th>
                          <th className="text-left py-2 pr-4 font-medium">Type</th>
                          <th className="text-right py-2 font-medium">Downloads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topDownloads.map((item, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 pr-4 text-muted-foreground">{i + 1}</td>
                            <td className="py-2.5 pr-4 font-medium">{item.title}</td>
                            <td className="py-2.5 pr-4">
                              <Badge variant="outline" className="capitalize text-xs">{fmtAction(item.action)}</Badge>
                            </td>
                            <td className="py-2.5 text-right font-bold">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 3 — SUPPORT
          ══════════════════════════════════════ */}
          <TabsContent value="support" className="mt-6 flex flex-col gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<MessageSquare className="h-5 w-5" />} title="Total Sessions" value={data.totalChatSessions} />
              <StatCard icon={<MessageSquare className="h-5 w-5" />} title="Open Sessions" value={data.openChatSessions} sub="Awaiting resolution" />
              <StatCard
                icon={<UserCheck className="h-5 w-5" />}
                title="Resolved Sessions"
                value={data.totalChatSessions - data.openChatSessions}
                sub="Closed sessions"
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Resolution Rate"
                value={data.totalChatSessions > 0
                  ? `${(((data.totalChatSessions - data.openChatSessions) / data.totalChatSessions) * 100).toFixed(0)}%`
                  : "—"}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Support Volume Over Time</CardTitle>
                <CardDescription>Daily chat sessions and message counts in the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.supportVolume.length === 0 ? (
                  <EmptyState message="No support sessions in this period." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.supportVolume} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Legend />
                      <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#7B6A58" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="messages" name="Messages" stroke="#B68D6A" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Admin Action Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Action Summary</CardTitle>
                <CardDescription>Administrative operations performed in the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.adminActionSummary.length === 0 ? (
                  <EmptyState message="No admin actions recorded in this period." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">Action</th>
                          <th className="text-right py-2 font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.adminActionSummary.map((item, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 pr-4">
                              <Badge variant="outline" className="text-xs capitalize">{fmtAction(item.action)}</Badge>
                            </td>
                            <td className="py-2.5 text-right font-bold">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 4 — DEMOGRAPHICS
          ══════════════════════════════════════ */}
          <TabsContent value="demographics" className="mt-6 flex flex-col gap-8">
            {/* Tier distribution bar chart */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Tier Distribution</CardTitle>
                <CardDescription>Number of agents per commission tier (all time).</CardDescription>
              </CardHeader>
              <CardContent>
                {data.tierDistribution.length === 0 ? (
                  <EmptyState message="No tier data available." />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.tierDistribution} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="tier" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" name="Agents" radius={4}>
                        {data.tierDistribution.map((entry) => (
                          <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "#9CA3AF"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top countries bar chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Agent Countries</CardTitle>
                <CardDescription>Where your registered agents are based (top 10).</CardDescription>
              </CardHeader>
              <CardContent>
                {data.countryDistribution.length === 0 ? (
                  <EmptyState message="No country data available. Ensure agents have their country set in their profile." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={data.countryDistribution}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="country"
                        width={120}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" name="Agents" radius={[0, 4, 4, 0]}>
                        {data.countryDistribution.map((_, i) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Country table */}
            {data.countryDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Country Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">#</th>
                          <th className="text-left py-2 pr-4 font-medium">Country</th>
                          <th className="text-right py-2 font-medium">Agents</th>
                          <th className="text-right py-2 font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.countryDistribution.map((c, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 pr-4 text-muted-foreground">{i + 1}</td>
                            <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              {c.country}
                            </td>
                            <td className="py-2.5 text-right font-bold">{c.count}</td>
                            <td className="py-2.5 text-right text-muted-foreground">
                              {data.totalAgents > 0 ? `${((c.count / data.totalAgents) * 100).toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
