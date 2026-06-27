"use client";

import Link from "next/link";
import {
  Users,
  UserCheck,
  ClipboardCheck,
  MessageSquare,
  UserPlus,
  Activity,
  Trophy,
} from "lucide-react";
import type { TopImprovingClient } from "@/lib/services/workout-analytics";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AreaTrend, BarTrend } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/utils";
import { GOAL_LABELS, label } from "@/lib/i18n/labels";
import type { AccountStatus, ClientGoal } from "@/lib/constants";

export interface CoachKpis {
  myClients: number;
  activeClients: number;
  pendingCheckins: number;
  unreadMessages: number;
}
export interface CoachSubscriptionInfo {
  daysRemaining: number | null;
  planName: string | null;
  maxClients: number;
  clientCount: number;
}
export interface RecentClient {
  id: string;
  name: string;
  goal?: ClientGoal;
  status: AccountStatus;
}

export function CoachDashboard({
  kpis,
  subscription,
  recentClients,
  growthSeries,
  adherenceSeries,
  topImproving,
  canWrite,
}: {
  kpis: CoachKpis;
  subscription: CoachSubscriptionInfo;
  recentClients: RecentClient[];
  growthSeries: { label: string; value: number }[];
  adherenceSeries: { label: string; value: number }[];
  topImproving: TopImprovingClient[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const s = t.dashboard.stats;
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const urgent = subscription.daysRemaining != null && subscription.daysRemaining <= 3;

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.dashboard} description={t.dashboard.overview}>
        {canWrite && (
          <Button asChild>
            <Link href="/coach/clients/new"><UserPlus className="h-4 w-4" />{t.dashboard.coachNav.addClient}</Link>
          </Button>
        )}
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{L("الخطة الحالية", "Current plan")}</p>
            <p className="font-semibold">{subscription.planName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{L("الأيام المتبقية", "Days remaining")}</p>
            <p className={"font-semibold " + (urgent ? "text-destructive" : "")}>
              {subscription.daysRemaining != null ? `${subscription.daysRemaining} ${L("يوم", "days")}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{L("العملاء", "Clients")}</p>
            <p className="font-semibold">
              {subscription.clientCount} / {subscription.maxClients > 0 ? subscription.maxClients : "∞"}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/coach/subscription">{t.dashboard.coachNav.subscription}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={s.myClients} value={formatNumber(kpis.myClients, locale)} icon={Users} />
        <StatCard label={s.activeClients} value={formatNumber(kpis.activeClients, locale)} icon={UserCheck} accent="success" />
        <StatCard label={s.pendingCheckins} value={formatNumber(kpis.pendingCheckins, locale)} icon={ClipboardCheck} accent="warning" />
        <StatCard label={s.unreadMessages} value={formatNumber(kpis.unreadMessages, locale)} icon={MessageSquare} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t.dashboard.ui.clientsGrowth}</CardTitle></CardHeader>
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
            <CardTitle className="text-base">{t.dashboard.ui.recentClients}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/coach/clients">{t.dashboard.ui.viewAll}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentClients.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.emptyTitle}</p>
            ) : (
              recentClients.map((c) => (
                <Link key={c.id} href={`/coach/clients/${c.id}`} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-xs text-primary">{c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{label(GOAL_LABELS, c.goal, locale)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />{s.adherence} · {t.dashboard.ui.thisMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            {adherenceSeries.length > 0 ? (
              <BarTrend data={adherenceSeries} xKey="label" yKey="value" />
            ) : (
              <EmptyState icon={Activity} title={t.common.emptyTitle} description={t.dashboard.stats.pendingCheckins} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" />{L("أكثر اللاعبين تطوراً هذا الأسبوع", "Most improved this week")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topImproving.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.common.emptyTitle}</p>
            ) : (
              topImproving.map((c, i) => (
                <Link key={c.clientId} href={`/coach/clients/${c.clientId}`} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.prCount} {L("رقم قياسي", "PR")}</p>
                  </div>
                  {c.improvementScore > 0 && <Badge variant="success">+{c.improvementScore}</Badge>}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
