import { requireCoachArea } from "@/lib/auth/session";
import { canAccessWorkout } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listPrograms } from "@/lib/services/programs";
import { listWorkoutTemplates } from "@/lib/services/workout-templates";
import { listNutritionTemplates } from "@/lib/services/nutrition-templates";
import { listClients } from "@/lib/services/clients";
import { ProgramsView, type ProgramRow, type PickItem, type PickClient } from "./programs-view";

export const dynamic = "force-dynamic";

export default async function ClientProgramsPage() {
  const ctx = await requireCoachArea(canAccessWorkout);
  const coachId = ctx.coachId;
  const [rawPrograms, rawTemplates, rawNutrition, rawClients] = await Promise.all([
    listPrograms(coachId),
    listWorkoutTemplates({ role: "coach", coachId }),
    listNutritionTemplates({ role: "coach", coachId }),
    listClients(coachId),
  ]);

  const programs: ProgramRow[] = rawPrograms.map((p) => ({
    id: String(p._id),
    clientName: ((p.client as unknown as { name?: string })?.name) ?? "—",
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    status: p.status,
  }));
  const templates: PickItem[] = rawTemplates.map((tpl) => ({ id: String(tpl._id), nameAr: tpl.nameAr, nameEn: tpl.nameEn }));
  const nutritionTemplates: PickItem[] = rawNutrition.map((tpl) => ({ id: String(tpl._id), nameAr: tpl.nameAr, nameEn: tpl.nameEn }));
  const clients: PickClient[] = rawClients.map((c) => {
    const cp = (c.clientProfile ?? {}) as Record<string, unknown>;
    return { id: String(c._id), name: c.name, code: (cp.clientCode as string) ?? "" };
  });

  return (
    <ProgramsView
      programs={programs}
      templates={templates}
      nutritionTemplates={nutritionTemplates}
      clients={clients}
      canWrite={coachCanWrite(ctx.status)}
    />
  );
}
