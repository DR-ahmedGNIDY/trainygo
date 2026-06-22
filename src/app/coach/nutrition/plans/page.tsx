import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { listNutritionPlans } from "@/lib/services/nutrition-plans";
import { listNutritionTemplates } from "@/lib/services/nutrition-templates";
import { listClients } from "@/lib/services/clients";
import { NutritionPlansView, type PlanRow, type PickItem, type PickClient } from "./plans-view";

export const dynamic = "force-dynamic";

export default async function ClientNutritionPlansPage() {
  const session = await requireRole("coach");
  const coachId = session.user.id;
  const [rawPlans, rawTemplates, rawClients] = await Promise.all([
    listNutritionPlans(coachId),
    listNutritionTemplates({ role: "coach", coachId }),
    listClients(coachId),
  ]);

  const plans: PlanRow[] = rawPlans.map((p) => ({
    id: String(p._id),
    clientName: ((p.client as unknown as { name?: string })?.name) ?? "—",
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    calories: p.totals?.calories ?? 0,
    status: p.status,
  }));
  const templates: PickItem[] = rawTemplates.map((tpl) => ({ id: String(tpl._id), nameAr: tpl.nameAr, nameEn: tpl.nameEn }));
  const clients: PickClient[] = rawClients.map((c) => {
    const cp = (c.clientProfile ?? {}) as Record<string, unknown>;
    return { id: String(c._id), name: c.name, code: (cp.clientCode as string) ?? "" };
  });

  return <NutritionPlansView plans={plans} templates={templates} clients={clients} canWrite={coachCanWrite(session.user.status)} />;
}
