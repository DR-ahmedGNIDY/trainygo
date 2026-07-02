import { requireRole } from "@/lib/auth/session";
import { syncCoachStatus, getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { listPlans } from "@/lib/services/plans";
import { SubscriptionView, type PlanCard } from "./subscription-view";

export default async function CoachSubscriptionPage() {
  const session = await requireRole("coach");
  const whatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "201000000000";
  const [status, summary, rawPlans] = await Promise.all([
    syncCoachStatus(session.user.id),
    getCoachSubscriptionSummary(session.user.id),
    listPlans(true),
  ]);
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
