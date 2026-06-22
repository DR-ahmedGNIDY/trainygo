import { requireRole } from "@/lib/auth/session";
import { getAdminStats, listCoaches } from "@/lib/services/admin";
import { AdminDashboard, type RecentCoach } from "./admin-dashboard";
import type { AccountStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireRole("super_admin");
  const [stats, coaches] = await Promise.all([getAdminStats(), listCoaches()]);

  const recentCoaches: RecentCoach[] = coaches.slice(0, 5).map((c) => ({
    id: String(c._id),
    name: c.name,
    clients: (c as { clientCount?: number }).clientCount ?? 0,
    status: c.status as AccountStatus,
  }));

  const sorted = [...coaches].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const growthSeries = sorted.map((c, i) => ({
    label: new Date(c.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
    value: i + 1,
  }));

  return <AdminDashboard stats={stats} recentCoaches={recentCoaches} growthSeries={growthSeries} />;
}
