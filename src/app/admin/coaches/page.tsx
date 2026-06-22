import { requireRole } from "@/lib/auth/session";
import { listCoaches } from "@/lib/services/admin";
import { listPlans } from "@/lib/services/plans";
import { CoachesView, type CoachRow, type PlanOption } from "./coaches-view";
import type { AccountStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage() {
  await requireRole("super_admin");
  const [rawCoaches, rawPlans] = await Promise.all([listCoaches(), listPlans()]);

  const planNameById = new Map(rawPlans.map((p) => [String(p._id), p.name]));

  const coaches: CoachRow[] = rawCoaches.map((c) => {
    const cp = (c.coachProfile ?? {}) as Record<string, unknown>;
    const planId = cp.currentPlan ? String(cp.currentPlan) : "";
    const planName = planId ? planNameById.get(planId) : undefined;
    return {
      id: String(c._id),
      name: c.name,
      email: c.email ?? "",
      brand: cp.brandName as string | undefined,
      planName: planName?.ar ? `${planName.ar}` : undefined,
      clients: (c as { clientCount?: number }).clientCount ?? 0,
      status: c.status as AccountStatus,
      endDate: cp.subscriptionEndDate ? String(cp.subscriptionEndDate) : null,
    };
  });

  const plans: PlanOption[] = rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name.ar,
    price: p.price,
  }));

  return <CoachesView coaches={coaches} plans={plans} />;
}
