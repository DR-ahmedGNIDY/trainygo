import { requireCoachArea } from "@/lib/auth/session";
import { canAccessRecovery } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listResponses, countPendingCheckins } from "@/lib/services/checkins";
import { CheckinsView, type CheckinRow } from "./checkins-view";

export const dynamic = "force-dynamic";

export default async function CheckinsPage() {
  const ctx = await requireCoachArea(canAccessRecovery);
  const coachId = ctx.coachId;
  const [raw, pending] = await Promise.all([
    listResponses(coachId),
    countPendingCheckins(coachId),
  ]);

  const rows: CheckinRow[] = raw.map((r) => {
    const map = new Map(
      ((r.answers ?? []) as { key: string; value: string }[]).map((a) => [a.key, a.value]),
    );
    return {
      id: String(r._id),
      clientName: ((r.client as unknown as { name?: string })?.name) ?? "—",
      date: new Date(r.submittedAt).toISOString().slice(0, 10),
      sleep: map.get("sleep"),
      water: map.get("water"),
      energy: map.get("energy"),
      reviewed: r.reviewed,
    };
  });

  return <CheckinsView rows={rows} pending={pending} canWrite={coachCanWrite(ctx.status)} />;
}
