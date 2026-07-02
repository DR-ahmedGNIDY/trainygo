import { redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canManageClients } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { AddClientForm } from "./add-client-form";

export default async function AddClientPage() {
  const ctx = await requireCoachArea(canManageClients);
  // Read-only (expired owner subscription) coaches/team members cannot create
  // clients — enforced here and again server-side in the action.
  if (!coachCanWrite(ctx.status)) {
    redirect("/coach/subscription");
  }
  const summary = await getCoachSubscriptionSummary(ctx.coachId);
  if (summary.maxClients > 0 && summary.clientCount >= summary.maxClients) {
    redirect("/coach/subscription");
  }
  return <AddClientForm />;
}
