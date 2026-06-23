import { requireRole } from "@/lib/auth/session";
import { getClientAccessState } from "@/lib/services/subscription";
import { CheckinForm } from "./checkin-form";

export const dynamic = "force-dynamic";

export default async function ClientCheckinPage() {
  const session = await requireRole("client");
  const access = await getClientAccessState(session.user.id);
  return <CheckinForm access={access} />;
}
