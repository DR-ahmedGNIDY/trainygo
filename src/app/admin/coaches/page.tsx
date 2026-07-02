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
  const planBrandingById = new Map(rawPlans.map((p) => [String(p._id), p.planFeatures?.branding ?? false]));

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
      academyName: (cp.brandSettings as { academyName?: string } | undefined)?.academyName ?? "FITXNET",
      hasBranding: Boolean(cp.brandSettings),
      logoUrl: (cp.brandSettings as { logo?: string } | undefined)?.logo,
      brandingAccess: (() => {
        const overrides = cp.featureOverrides as { branding?: boolean | null } | undefined;
        const override = overrides?.branding;
        if (override === true) return "manual" as const;
        if (override === false) return false as const;
        // null / absent → check plan
        const activeStatus = cp.subscriptionStatus === "active" || cp.subscriptionStatus === "trial";
        if (activeStatus && planId && planBrandingById.get(planId)) return "plan" as const;
        return false as const;
      })(),
      brandingOverride: (() => {
        const overrides = cp.featureOverrides as { branding?: boolean | null } | undefined;
        return overrides?.branding ?? null;
      })(),
    };
  });

  const plans: PlanOption[] = rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name.ar,
    price: p.price,
    durationDays: p.durationDays,
  }));

  return <CoachesView coaches={coaches} plans={plans} />;
}
