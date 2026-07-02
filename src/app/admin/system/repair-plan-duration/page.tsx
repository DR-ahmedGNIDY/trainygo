import { requireRole } from "@/lib/auth/session";
import { getRepairPlanDurationStats } from "@/lib/services/repair-plan-duration";
import { RepairPlanDurationView } from "./repair-plan-duration-view";

export const dynamic = "force-dynamic";

export default async function AdminRepairPlanDurationPage() {
  await requireRole("super_admin");
  const stats = await getRepairPlanDurationStats();
  return <RepairPlanDurationView stats={stats} />;
}
