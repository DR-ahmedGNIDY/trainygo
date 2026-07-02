import { requireRole } from "@/lib/auth/session";
import { getResetPlansStats } from "@/lib/services/reset-plans";
import { PlansResetView } from "./plans-reset-view";

export const dynamic = "force-dynamic";

export default async function AdminPlansResetPage() {
  await requireRole("super_admin");
  const stats = await getResetPlansStats();
  return <PlansResetView stats={stats} />;
}
