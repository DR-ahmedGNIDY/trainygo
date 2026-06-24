import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { getClient } from "@/lib/services/clients";
import { getProgressHistory, toWeightSeries } from "@/lib/services/progress";
import { getActiveProgram } from "@/lib/services/programs";
import { getActivePlan } from "@/lib/services/nutrition-plans";
import { ClientProfileView, type ProfileClient } from "./client-profile-view";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("coach");
  const doc = await getClient(session.user.id, id);
  if (!doc) notFound();

  const cp = (doc.clientProfile ?? {}) as Record<string, unknown>;
  const client: ProfileClient = {
    id: String(doc._id),
    name: doc.name,
    username: doc.username,
    code: (cp.clientCode as string) ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    status: doc.status,
    goal: cp.goal as ProfileClient["goal"],
    gender: cp.gender as ProfileClient["gender"],
    age: (cp.age as number) ?? null,
    height: (cp.height as number) ?? null,
    currentWeight: (cp.currentWeight as number) ?? null,
    startWeight: (cp.startWeight as number) ?? null,
  };

  const history = (await getProgressHistory(id)) as unknown as {
    date: string;
    weight?: number;
    bodyFat?: number;
    chest?: number;
    waist?: number;
    arms?: number;
    thighs?: number;
  }[];

  const [program, plan] = await Promise.all([
    getActiveProgram(session.user.id, id),
    getActivePlan(session.user.id, id),
  ]);

  return (
    <ClientProfileView
      client={client}
      weightSeries={toWeightSeries(history)}
      history={history}
      canWrite={coachCanWrite(session.user.status)}
      program={
        program
          ? {
              id: String(program._id),
              nameAr: program.nameAr,
              nameEn: program.nameEn,
              weeksCount: program.weeks?.length ?? 0,
              daysCount: (program.weeks ?? []).reduce((s: number, w: { days?: unknown[] }) => s + (w.days?.length ?? 0), 0),
            }
          : null
      }
      nutritionPlan={
        plan
          ? {
              id: String(plan._id),
              nameAr: plan.nameAr,
              nameEn: plan.nameEn,
              mealsCount: plan.meals?.length ?? 0,
              calories: plan.totals?.calories ?? 0,
            }
          : null
      }
    />
  );
}
