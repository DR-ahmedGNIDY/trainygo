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
    const latestSub = (c as { latestSub?: { startDate?: string } }).latestSub;
    const planId = cp.currentPlan ? String(cp.currentPlan) : "";
    const planName = planId ? planNameById.get(planId) : undefined;
    const isTrial = cp.subscriptionStatus === "trial" || (!cp.subscriptionStatus && c.status === "trial");
    const startDate = isTrial
      ? (cp.trialStartDate ? String(cp.trialStartDate) : null)
      : (latestSub?.startDate ? String(latestSub.startDate) : null);
    const endDate = isTrial
      ? (cp.trialEndDate ? String(cp.trialEndDate) : null)
      : (cp.subscriptionEndDate ? String(cp.subscriptionEndDate) : null);
    return {
      id: String(c._id),
      name: c.name,
      email: c.email ?? "",
      brand: cp.brandName as string | undefined,
      planName: isTrial ? "Trial" : (planName?.ar ? `${planName.ar}` : undefined),
      clients: (c as { clientCount?: number }).clientCount ?? 0,
      status: c.status as AccountStatus,
      startDate,
      endDate,
      suspendedByAdmin: Boolean(cp.suspendedByAdmin),
    };
  });

  const plans: PlanOption[] = rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name.ar,
    price: p.price,
  }));

  return <CoachesView coaches={coaches} plans={plans} />;
}
