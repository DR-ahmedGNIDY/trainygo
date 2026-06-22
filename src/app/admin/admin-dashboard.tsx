"use client";

import Link from "next/link";
import { Users, UserCheck, Clock, UserX, Dumbbell, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AreaTrend } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/utils";
import type { AccountStatus } from "@/lib/constants";

export interface AdminStats {
  totalCoaches: number;
  activeCoaches: number;
  trialCoaches: number;
  expiredCoaches: number;
  totalClients: number;
  revenue: number;
}
export interface RecentCoach {
  id: string;
  name: string;
  clients: number;
  status: AccountStatus;
}

export function AdminDashboard({
  stats,
  recentCoaches,
  growthSeries,
}: {
  stats: AdminStats;
  recentCoaches: RecentCoach[];
  growthSeries: { label: string; value: number }[];
}) {
  const { t, locale } = useI18n();
  const s = t.dashboard.stats;
  const money = (n: number) => (locale === "ar" ? `${formatNumber(n, "ar")} ج.م` : `EGP ${formatNumber(n)}`);

  return (
    <div>
      <PageHeader title={t.dashboard.adminNav.dashboard} description={t.dashboard.overview} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={s.totalCoaches} value={formatNumber(stats.totalCoaches, locale)} icon={Users} />
        <StatCard label={s.activeCoaches} value={formatNumber(stats.activeCoaches, locale)} icon={UserCheck} accent="success" />
        <StatCard label={s.trialCoaches} value={formatNumber(stats.trialCoaches, locale)} icon={Clock} accent="warning" />
        <StatCard label={s.expiredCoaches} value={formatNumber(stats.expiredCoaches, locale)} icon={UserX} accent="destructive" />
        <StatCard label={s.totalClients} value={formatNumber(stats.totalClients, locale)} icon={Dumbbell} />
        <StatCard label={s.revenue} value={money(stats.revenue)} icon={Wallet} accent="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{s.totalCoaches}</CardTitle></CardHeader>
          <CardContent>
            {growthSeries.length > 1 ? (
              <AreaTrend data={growthSeries} xKey="label" yKey="value" />
            ) : (
              <EmptyState icon={Users} title={t.common.emptyTitle} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t.dashboard.adminNav.coaches}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/coaches">{t.dashboard.ui.viewAll}</Link></Button>
          </CardHeader>
          <CardContent className="px-0">
            {recentCoaches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.emptyTitle}</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>{t.common.name}</TableHead><TableHead>{s.myClients}</TableHead><TableHead>{t.common.status}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recentCoaches.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{formatNumber(c.clients, locale)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
