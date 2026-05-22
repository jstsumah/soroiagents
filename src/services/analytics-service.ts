'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Tier, Status, UserType } from '@/lib/types';

// ==========================================
// Types
// ==========================================

export type AgentGrowthPoint = {
  date: string;   // "YYYY-MM-DD"
  signups: number;
};

export type ContentEngagementItem = {
  title: string;
  action: string;
  count: number;
};

export type SupportVolumePoint = {
  date: string;
  sessions: number;
  messages: number;
};

export type TierDistribution = { tier: Tier | string; count: number };
export type StatusDistribution = { status: Status | string; count: number };
export type TypeDistribution = { type: UserType | string; count: number };
export type CountryDistribution = { country: string; count: number };

export type AdminActionSummary = {
  action: string;
  count: number;
};

export type AnalyticsOverview = {
  totalAgents: number;
  activeAgents: number;
  pendingAgents: number;
  totalDownloads: number;
  totalChatSessions: number;
  openChatSessions: number;
  agentGrowth: AgentGrowthPoint[];
  tierDistribution: TierDistribution[];
  statusDistribution: StatusDistribution[];
  typeDistribution: TypeDistribution[];
  countryDistribution: CountryDistribution[];
  topDownloads: ContentEngagementItem[];
  supportVolume: SupportVolumePoint[];
  adminActionSummary: AdminActionSummary[];
};

// ==========================================
// Helpers
// ==========================================

function groupByDate(rows: { timestamp: string }[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const date = row.timestamp.slice(0, 10); // "YYYY-MM-DD"
    map[date] = (map[date] ?? 0) + 1;
  }
  return map;
}

function fillDateRange(map: Record<string, number>, startDate: string, endDate: string): AgentGrowthPoint[] {
  const result: AgentGrowthPoint[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    result.push({ date: dateStr, signups: map[dateStr] ?? 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

async function fetchAll<T>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize: number = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryFn(from, from + pageSize - 1);
    if (error || !data || data.length === 0) {
      break;
    }
    allData.push(...data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }
  return allData;
}

// ==========================================
// Main Analytics Fetch
// ==========================================

export async function getAnalyticsData(startDate: string, endDate: string): Promise<AnalyticsOverview> {
  const supabase = getSupabaseAdmin();

  const [
    profilesRes,
    growthRes,
    downloadsRes,
    chatSessionsRes,
    chatMessagesRes,
    auditLogsRes,
  ] = await Promise.allSettled([
    fetchAll<any>((from, to) => supabase.from('profiles').select('id, status, tier, type, country, created_at').eq('role', 'Agent').range(from, to)),
    fetchAll<any>((from, to) => supabase.from('profiles').select('created_at').eq('role', 'Agent').gte('created_at', startDate).lte('created_at', endDate).range(from, to)),
    fetchAll<any>((from, to) => supabase.from('audit_logs')
      .select('action, details, timestamp')
      .in('action', ['rate.download', 'resource.download', 'training.view'])
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .range(from, to)),
    fetchAll<any>((from, to) => supabase.from('chat_sessions').select('id, status, created_at').gte('created_at', startDate).lte('created_at', endDate).range(from, to)),
    fetchAll<any>((from, to) => supabase.from('chat_messages').select('session_id, timestamp').gte('timestamp', startDate).lte('timestamp', endDate).range(from, to)),
    fetchAll<any>((from, to) => supabase.from('audit_logs')
      .select('action, timestamp')
      .in('action', [
        'user.activate', 'user.update', 'user.create', 'user.delete',
        'resource.create', 'resource.import', 'rate.create', 'rate.import',
        'itinerary.create', 'itinerary.import', 'deal.create', 'deal.import',
        'training.create', 'training.import', 'company.create', 'company.update',
        'settings.companyDetails', 'settings.brandTheme',
      ])
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .range(from, to)),
  ]);

  // ---- Profiles / Agents ----
  const allProfiles = profilesRes.status === 'fulfilled' ? profilesRes.value : [];
  const totalAgents = allProfiles.length;
  const activeAgents = allProfiles.filter((p) => p.status === 'active').length;
  const pendingAgents = allProfiles.filter((p) => p.status === 'pending').length;

  // Tier distribution
  const tierMap: Record<string, number> = {};
  for (const p of allProfiles) {
    const t = p.tier ?? 'Unknown';
    tierMap[t] = (tierMap[t] ?? 0) + 1;
  }
  const tierDistribution: TierDistribution[] = Object.entries(tierMap)
    .map(([tier, count]) => ({ tier, count }))
    .sort((a, b) => b.count - a.count);

  // Status distribution
  const statusMap: Record<string, number> = {};
  for (const p of allProfiles) {
    const s = p.status ?? 'Unknown';
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusDistribution: StatusDistribution[] = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }));

  // Type distribution
  const typeMap: Record<string, number> = {};
  for (const p of allProfiles) {
    const t = (p.type || 'Unknown').trim().toLowerCase();
    typeMap[t] = (typeMap[t] ?? 0) + 1;
  }
  const typeDistribution: TypeDistribution[] = Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }));

  // Country distribution (top 10)
  const countryMap: Record<string, number> = {};
  for (const p of allProfiles) {
    const c = p.country ?? 'Unknown';
    countryMap[c] = (countryMap[c] ?? 0) + 1;
  }
  const countryDistribution: CountryDistribution[] = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ---- Agent Growth ----
  const growthRows = growthRes.status === 'fulfilled' ? growthRes.value : [];
  const growthMap = groupByDate(growthRows.map((r) => ({ timestamp: r.created_at })));
  const agentGrowth = fillDateRange(growthMap, startDate, endDate);

  // ---- Downloads / Engagement ----
  const downloadRows = downloadsRes.status === 'fulfilled' ? downloadsRes.value : [];
  const totalDownloads = downloadRows.length;

  // Top downloads by title from details
  const titleCountMap: Record<string, { count: number; action: string }> = {};
  for (const row of downloadRows) {
    const title: string =
      row.details?.rateTitle ?? row.details?.resourceTitle ?? row.details?.resourceId ?? 'Unknown';
    const existing = titleCountMap[title];
    if (existing) {
      existing.count += 1;
    } else {
      titleCountMap[title] = { count: 1, action: row.action };
    }
  }
  const topDownloads: ContentEngagementItem[] = Object.entries(titleCountMap)
    .map(([title, { count, action }]) => ({ title, action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ---- Support / Chat ----
  const chatSessions = chatSessionsRes.status === 'fulfilled' ? chatSessionsRes.value : [];
  const chatMessages = chatMessagesRes.status === 'fulfilled' ? chatMessagesRes.value : [];
  const totalChatSessions = chatSessions.length;
  const openChatSessions = chatSessions.filter((s) => s.status === 'open').length;

  // Session + message volume per day
  const sessionDateMap = groupByDate(chatSessions.map((s) => ({ timestamp: s.created_at })));
  const messageDateMap = groupByDate(chatMessages.map((m) => ({ timestamp: m.timestamp })));
  const supportVolume: SupportVolumePoint[] = Object.keys({ ...sessionDateMap, ...messageDateMap })
    .sort()
    .map((date) => ({
      date,
      sessions: sessionDateMap[date] ?? 0,
      messages: messageDateMap[date] ?? 0,
    }));

  // ---- Admin Action Summary ----
  const auditRows = auditLogsRes.status === 'fulfilled' ? auditLogsRes.value : [];
  const actionMap: Record<string, number> = {};
  for (const row of auditRows) {
    actionMap[row.action] = (actionMap[row.action] ?? 0) + 1;
  }
  const adminActionSummary: AdminActionSummary[] = Object.entries(actionMap)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAgents,
    activeAgents,
    pendingAgents,
    totalDownloads,
    totalChatSessions,
    openChatSessions,
    agentGrowth,
    tierDistribution,
    statusDistribution,
    typeDistribution,
    countryDistribution,
    topDownloads,
    supportVolume,
    adminActionSummary,
  };
}
