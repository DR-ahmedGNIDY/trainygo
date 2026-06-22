import { requireRole } from "@/lib/auth/session";
import { getCoachLatestMeasurements } from "@/lib/services/progress";
import { MeasurementsView, type MRow } from "./measurements-view";

export const dynamic = "force-dynamic";

export default async function MeasurementsPage() {
  const session = await requireRole("coach");
  const raw = (await getCoachLatestMeasurements(session.user.id)) as {
    clientName?: string;
    weight?: number;
    first?: number;
    bodyFat?: number;
    date: string;
  }[];

  const rows: MRow[] = raw.map((r) => ({
    client: r.clientName ?? "—",
    weight: r.weight,
    change: r.weight != null && r.first != null ? +(r.weight - r.first).toFixed(1) : 0,
    bodyFat: r.bodyFat,
    date: r.date,
  }));

  return <MeasurementsView rows={rows} />;
}
