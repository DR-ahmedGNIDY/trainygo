import { requireCoachArea } from "@/lib/auth/session";
import { canManageSubscriptions } from "@/lib/permissions/team";
import { getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { listPlans } from "@/lib/services/plans";
import { SubscriptionView, type PlanCard } from "./subscription-view";

export default async function CoachSubscriptionPage() {
  const ctx = await requireCoachArea(canManageSubscriptions);
  const whatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "201000000000";
  const [summary, rawPlans] = await Promise.all([
    getCoachSubscriptionSummary(ctx.coachId),
    listPlans(true),
  ]);
  const status = ctx.status;
  const plans: PlanCard[] = rawPlans.map((p) => ({
    id: String(p._id),
    nameAr: p.name.ar,
    nameEn: p.name.en,
    price: p.price,
    durationMonths: p.durationMonths,
    maxClients: p.maxClients,
  }));
  return (
    <SubscriptionView
      status={status}
      endDate={summary.endDate ? summary.endDate.toISOString() : null}
      planName={summary.planName}
      planDurationMonths={summary.planDurationMonths}
      whatsapp={whatsapp}
      plans={plans}
    />
  );
}
