import { notFound } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canManageClients, canAccessWorkout, canAccessNutrition } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getClient } from "@/lib/services/clients";
import { getProgressHistory, toWeightSeries } from "@/lib/services/progress";
import { getActiveProgram } from "@/lib/services/programs";
import { getActivePlan } from "@/lib/services/nutrition-plans";
import { getClientPerformanceAnalysis } from "@/lib/services/workout-analytics";
import { listExerciseChangeHistoryForClient } from "@/lib/services/client-requests";
import { listFreezeHistory } from "@/lib/services/subscription-freeze";
import { mealsToBuilder } from "@/lib/builder-mappers";
import type { IMeal } from "@/models/NutritionTemplate";
import { ClientProfileView, type ProfileClient } from "./client-profile-view";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCoachArea(canManageClients);
  const doc = await getClient(ctx.coachId, id);
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
    freeze: {
      status: ((cp.subscriptionFreezeStatus as string) ?? "active") === "frozen" ? "frozen" : "active",
      remainingDays: (cp.remainingDays as number) ?? null,
      totalFrozenDays: (cp.totalFrozenDays as number) ?? 0,
      freezeStartDate: cp.freezeStartDate ? String(cp.freezeStartDate) : null,
      freezeReason: (cp.freezeReason as string) ?? null,
      subscriptionStartDate: cp.subscriptionStartDate ? String(cp.subscriptionStartDate) : null,
      subscriptionEndDate: cp.subscriptionEndDate ? String(cp.subscriptionEndDate) : null,
    },
  };

  const freezeHistory = (
    (await listFreezeHistory(ctx.coachId, id)) as unknown as {
      _id: string;
      freezeDate: string;
      resumeDate: string | null;
      remainingDays: number;
      reason?: string;
      notes?: string;
    }[]
  ).map((r) => ({
    id: r._id,
    freezeDate: r.freezeDate,
    resumeDate: r.resumeDate ?? null,
    remainingDays: r.remainingDays,
    reason: r.reason ?? "",
    notes: r.notes ?? "",
  }));

  const history = (await getProgressHistory(id)) as unknown as {
    date: string;
    weight?: number;
    bodyFat?: number;
    chest?: number;
    waist?: number;
    arms?: number;
    thighs?: number;
  }[];

  const userCanAccessWorkout = canAccessWorkout(ctx);
  const userCanAccessNutrition = canAccessNutrition(ctx);

  const [program, plan, performanceAnalysis, changeHistoryRaw] = await Promise.all([
    userCanAccessWorkout ? getActiveProgram(ctx.coachId, id) : Promise.resolve(null),
    userCanAccessNutrition ? getActivePlan(ctx.coachId, id) : Promise.resolve(null),
    userCanAccessWorkout
      ? getClientPerformanceAnalysis(id)
      : Promise.resolve({
          periodDays: 30,
          strengthChangePercent: null,
          topGain: null,
          topLoss: null,
          prCount: 0,
          avgSessionDurationSeconds: null,
        }),
    userCanAccessWorkout ? listExerciseChangeHistoryForClient(ctx.coachId, id) : Promise.resolve([]),
  ]);

  const exerciseChangeHistory = (
    changeHistoryRaw as unknown as {
      _id: string;
      status: "pending" | "approved" | "rejected";
      quickReason?: string;
      coachNote?: string;
      createdAt: string;
      payload: {
        exerciseNameAr: string;
        exerciseNameEn: string;
        replacementExerciseNameAr?: string;
        replacementExerciseNameEn?: string;
      };
    }[]
  ).map((r) => ({
    id: r._id,
    status: r.status,
    quickReason: r.quickReason,
    coachNote: r.coachNote ?? "",
    createdAt: r.createdAt,
    exerciseNameAr: r.payload.exerciseNameAr,
    exerciseNameEn: r.payload.exerciseNameEn,
    replacementNameAr: r.payload.replacementExerciseNameAr ?? "",
    replacementNameEn: r.payload.replacementExerciseNameEn ?? "",
  }));

  return (
    <ClientProfileView
      client={client}
      weightSeries={toWeightSeries(history)}
      history={history}
      canWrite={coachCanWrite(ctx.status)}
      canAccessWorkout={userCanAccessWorkout}
      canAccessNutrition={userCanAccessNutrition}
      performanceAnalysis={performanceAnalysis}
      exerciseChangeHistory={exerciseChangeHistory}
      freezeHistory={freezeHistory}
      program={
        program
          ? {
              id: String(program._id),
              nameAr: program.nameAr,
              nameEn: program.nameEn,
              weeks: program.weeks ?? [],
            }
          : null
      }
      nutritionPlan={
        plan
          ? {
              id: String(plan._id),
              nameAr: plan.nameAr,
              nameEn: plan.nameEn,
              meals: mealsToBuilder((plan.meals ?? []) as unknown as IMeal[]),
            }
          : null
      }
    />
  );
}
