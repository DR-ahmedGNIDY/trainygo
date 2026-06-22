import { requireRole } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";
import {
  getOwnProfile,
  getOwnActiveProgram,
  getOwnActivePlan,
} from "@/lib/services/client-self";
import { getProgressHistory } from "@/lib/services/progress";
import { getRecentLogs } from "@/lib/services/workout-logs";
import { MEAL_LABELS } from "@/lib/i18n/labels";
import { ClientHome } from "./client-home";

export const dynamic = "force-dynamic";

export default async function ClientHomePage() {
  const session = await requireRole("client");
  const id = session.user.id;
  const locale = await getLocale();

  const [profile, program, plan, history, logs] = await Promise.all([
    getOwnProfile(id),
    getOwnActiveProgram(id),
    getOwnActivePlan(id),
    getProgressHistory(id),
    getRecentLogs(id, 60),
  ]);

  const cp = (profile?.clientProfile ?? {}) as Record<string, number | undefined>;
  const latestWeight = (history as { weight?: number }[]).filter((h) => h.weight != null).pop()?.weight;
  const currentWeight = latestWeight ?? cp.currentWeight ?? null;
  const startWeight = cp.startWeight ?? null;
  const weightChange =
    currentWeight != null && startWeight != null ? +(currentWeight - startWeight).toFixed(1) : null;

  // Streak: distinct days with at least one workout log.
  const days = new Set(
    (logs as unknown as { date: string }[]).map((l) => new Date(l.date).toISOString().slice(0, 10)),
  );

  const day1 = program?.weeks?.[0]?.days?.[0];
  const todayWorkout = day1
    ? {
        name: program!.nameAr,
        exercises: (day1.exercises ?? []).map((ex) => ({
          name: locale === "ar" ? ex.nameAr : ex.nameEn,
          sets: ex.sets,
          reps: ex.reps,
        })),
      }
    : null;

  const todayMeals = plan
    ? (plan.meals ?? [])
        .filter((m) => (m.items ?? []).length > 0)
        .map((m) => ({
          name: MEAL_LABELS[m.type]?.[locale] ?? m.type,
          kcal: Math.round((m.items ?? []).reduce((s, it) => s + (it.calories ?? 0), 0)),
        }))
    : null;

  const weightSeries = (history as unknown as { date: string; weight?: number }[])
    .filter((h) => h.weight != null)
    .map((h) => ({
      label: new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      value: h.weight as number,
    }));

  return (
    <ClientHome
      data={{
        currentWeight,
        weightChange,
        streak: days.size,
        planCalories: plan?.totals?.calories ?? null,
        todayWorkout,
        todayMeals,
        weightSeries,
      }}
    />
  );
}
