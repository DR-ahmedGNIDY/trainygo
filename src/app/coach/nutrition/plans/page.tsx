import { requireCoachArea } from "@/lib/auth/session";
import { canAccessNutrition } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listNutritionPlans } from "@/lib/services/nutrition-plans";
import { listNutritionImagePlans } from "@/lib/services/nutrition-image-plans";
import { listNutritionTemplates } from "@/lib/services/nutrition-templates";
import { listClients } from "@/lib/services/clients";
import { NutritionPlansView, type PlanRow, type PickItem, type PickClient } from "./plans-view";

export const dynamic = "force-dynamic";

export default async function ClientNutritionPlansPage() {
  const ctx = await requireCoachArea(canAccessNutrition);
  const coachId = ctx.coachId;
  const [rawPlans, rawImagePlans, rawTemplates, rawClients] = await Promise.all([
    listNutritionPlans(coachId),
    listNutritionImagePlans(coachId),
    listNutritionTemplates({ role: "coach", coachId }),
    listClients(coachId),
  ]);

  const clientNameOf = (p: { client: unknown }) =>
    ((p.client as { name?: string } | null)?.name) ?? "—";

  const structured: PlanRow[] = rawPlans.map((p) => ({
    id: String(p._id),
    kind: "structured",
    clientName: clientNameOf(p),
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    calories: p.totals?.calories ?? 0,
    status: p.status,
    createdAt: String(p.createdAt),
  }));

  const image: PlanRow[] = rawImagePlans.map((p) => ({
    id: String(p._id),
    kind: "image",
    clientName: clientNameOf(p),
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    calories: 0,
    status: p.status,
    createdAt: String(p.createdAt),
    images: (p.images ?? []).map((img) => ({ url: img.url, publicId: img.publicId })),
    note: p.note ?? "",
  }));

  // Both systems live in one list for the coach; newest first, like before.
  const plans = [...structured, ...image].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const templates: PickItem[] = rawTemplates.map((tpl) => ({ id: String(tpl._id), nameAr: tpl.nameAr, nameEn: tpl.nameEn }));
  const clients: PickClient[] = rawClients.map((c) => {
    const cp = (c.clientProfile ?? {}) as Record<string, unknown>;
    return { id: String(c._id), name: c.name, code: (cp.clientCode as string) ?? "" };
  });

  return <NutritionPlansView plans={plans} templates={templates} clients={clients} canWrite={coachCanWrite(ctx.status)} />;
}
