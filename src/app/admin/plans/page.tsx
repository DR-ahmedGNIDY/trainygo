import { requireRole } from "@/lib/auth/session";
import { listPlans } from "@/lib/services/plans";
import { PlansView, type PlanItem } from "./plans-view";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireRole("super_admin");
  const raw = await listPlans();
  const items: PlanItem[] = raw.map((p) => ({
    id: String(p._id),
    tier: p.tier,
    nameAr: p.name.ar,
    nameEn: p.name.en,
    price: p.price,
    durationDays: p.durationDays,
    maxClients: p.maxClients,
    featuresAr: (p.features ?? []).map((f) => f.ar).filter(Boolean),
    featuresEn: (p.features ?? []).map((f) => f.en).filter(Boolean),
  }));
  return <PlansView items={items} />;
}
