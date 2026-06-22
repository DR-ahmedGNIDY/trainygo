import { requireRole } from "@/lib/auth/session";
import { SubscriptionView } from "./subscription-view";

export default async function CoachSubscriptionPage() {
  const session = await requireRole("coach");
  const whatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "201000000000";
  return <SubscriptionView status={session.user.status} whatsapp={whatsapp} />;
}
