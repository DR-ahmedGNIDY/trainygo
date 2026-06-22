import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { listClients } from "@/lib/services/clients";
import { ClientsView, type ClientListItem } from "./clients-view";

export const dynamic = "force-dynamic";

export default async function CoachClientsPage() {
  const session = await requireRole("coach");
  const raw = await listClients(session.user.id);

  const clients: ClientListItem[] = raw.map((c) => {
    const cp = (c.clientProfile ?? {}) as Record<string, unknown>;
    return {
      id: String(c._id),
      name: c.name,
      code: (cp.clientCode as string) ?? "",
      goal: cp.goal as ClientListItem["goal"],
      status: c.status,
      weight: (cp.currentWeight as number) ?? null,
      lastLoginAt: c.lastLoginAt ? String(c.lastLoginAt) : null,
    };
  });

  return (
    <ClientsView clients={clients} canWrite={coachCanWrite(session.user.status)} />
  );
}
