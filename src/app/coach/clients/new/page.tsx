import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { AddClientForm } from "./add-client-form";

export default async function AddClientPage() {
  const session = await requireRole("coach");
  // Read-only (expired) coaches cannot create clients — enforced here and again
  // server-side in the action.
  if (!coachCanWrite(session.user.status)) {
    redirect("/coach/subscription");
  }
  return <AddClientForm />;
}
