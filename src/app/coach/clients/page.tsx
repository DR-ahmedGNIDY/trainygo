import { requireCoachArea } from "@/lib/auth/session";
import { canManageClients } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listClients } from "@/lib/services/clients";
import { getCoachSubscriptionSummary } from "@/lib/services/subscription";
import { ClientsView, type ClientListItem } from "./clients-view";

export const dynamic = "force-dynamic";

export default async function CoachClientsPage() {
  const ctx = await requireCoachArea(canManageClients);
  const [raw, summary] = await Promise.all([
    listClients(ctx.coachId),
    getCoachSubscriptionSummary(ctx.coachId),
  ]);
  const limitReached = summary.maxClients > 0 && summary.clientCount >= summary.maxClients;

  const clients: ClientListItem[] = raw.map((c) => {
    const cp = (c.clientProfile ?? {}) as Record<string, unknown>;
    return {
      id: String(c._id),
      name: c.name,
      code: (cp.clientCode as string) ?? "",
      goal: cp.goal as ClientListItem["goal"],
      status: c.status,
      frozen: ((cp.subscriptionFreezeStatus as string) ?? "active") === "frozen",
      weight: (cp.currentWeight as number) ?? null,
      lastLoginAt: c.lastLoginAt ? String(c.lastLoginAt) : null,
    };
  });

  return (
    <ClientsView
      clients={clients}
      canWrite={coachCanWrite(ctx.status)}
      limitReached={limitReached}
    />
  );
}
