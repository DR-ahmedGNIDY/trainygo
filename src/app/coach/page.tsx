import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { listClients } from "@/lib/services/clients";
import { listResponses, countPendingCheckins } from "@/lib/services/checkins";
import { getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { CoachDashboard, type RecentClient } from "./coach-dashboard";
import type { AccountStatus, ClientGoal } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CoachHome() {
  const session = await requireRole("coach");
  const coachId = session.user.id;

  const [allClients, pending, responses, subscription] = await Promise.all([
    listClients(coachId, { includeArchived: true }),
    countPendingCheckins(coachId),
    listResponses(coachId),
    getCoachSubscriptionSummary(coachId),
  ]);

  const activeClients = allClients.filter(
    (c) => (c.clientProfile as { active?: boolean })?.active && c.status === "active",
  ).length;

  const recentClients: RecentClient[] = allClients.slice(0, 5).map((c) => {
    const cp = (c.clientProfile ?? {}) as Record<string, unknown>;
    return {
      id: String(c._id),
      name: c.name,
      goal: cp.goal as ClientGoal | undefined,
      status: c.status as AccountStatus,
    };
  });

  // Real cumulative client-growth series.
  const sorted = [...allClients].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const growthSeries = sorted.map((c, i) => ({
    label: new Date(c.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
    value: i + 1,
  }));

  // Real adherence series from recent check-in responses.
  const adherenceSeries = responses
    .slice(0, 10)
    .reverse()
    .map((r) => {
      const a = ((r.answers ?? []) as { key: string; value: string }[]).find((x) => x.key === "adherence");
      return {
        label: new Date(r.submittedAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
        value: a ? Number(a.value) * 10 : 0,
      };
    })
    .filter((p) => p.value > 0);

  return (
    <CoachDashboard
      kpis={{
        myClients: allClients.length,
        activeClients,
        pendingCheckins: pending,
        unreadMessages: 0,
      }}
      subscription={{
        daysRemaining: subscription.daysRemaining,
        planName: subscription.planName,
        maxClients: subscription.maxClients,
        clientCount: subscription.clientCount,
      }}
      recentClients={recentClients}
      growthSeries={growthSeries}
      adherenceSeries={adherenceSeries}
      canWrite={coachCanWrite(session.user.status)}
    />
  );
}
