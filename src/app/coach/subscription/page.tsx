import { requireRole } from "@/lib/auth/session";
import { syncCoachStatus, getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { SubscriptionView } from "./subscription-view";

export default async function CoachSubscriptionPage() {
  const session = await requireRole("coach");
  const whatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "201000000000";
  const [status, summary] = await Promise.all([
    syncCoachStatus(session.user.id),
    getCoachSubscriptionSummary(session.user.id),
  ]);
  return <SubscriptionView status={status} endDate={summary.endDate ? summary.endDate.toISOString() : null} whatsapp={whatsapp} />;
}
