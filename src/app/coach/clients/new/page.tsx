import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { AddClientForm } from "./add-client-form";

export default async function AddClientPage() {
  const session = await requireRole("coach");
  // Read-only (expired) coaches cannot create clients — enforced here and again
  // server-side in the action.
  if (!coachCanWrite(session.user.status)) {
    redirect("/coach/subscription");
  }
  const summary = await getCoachSubscriptionSummary(session.user.id);
  if (summary.maxClients > 0 && summary.clientCount >= summary.maxClients) {
    redirect("/coach/subscription");
  }
  return <AddClientForm />;
}
