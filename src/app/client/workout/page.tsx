import { requireRole } from "@/lib/auth/session";
import { getOwnActiveProgram } from "@/lib/services/client-self";
import { getExerciseMediaByIds } from "@/lib/services/exercises";
import { getClientAccessState } from "@/lib/services/subscription";
import { getLastPerformanceMap } from "@/lib/services/workout-logs";
import { listPendingExerciseChangeKeys } from "@/lib/services/client-requests";
import { WorkoutExecution } from "./workout-execution";

export const dynamic = "force-dynamic";

interface RawExercise {
  exercise?: string | null;
  nameAr: string;
  nameEn: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
}
interface RawDay { dayNumber: number; name: { ar: string; en: string }; exercises: RawExercise[] }
interface RawWeek { weekNumber: number; days: RawDay[] }

export default async function ClientWorkoutPage() {
  const session = await requireRole("client");
  const [program, access] = await Promise.all([
    getOwnActiveProgram(session.user.id),
    getClientAccessState(session.user.id),
  ]);

  if (!program) {
    return <WorkoutExecution program={null} access={access} />;
  }

  const weeks = program.weeks as unknown as RawWeek[];
  const exerciseIds = weeks.flatMap((w) => w.days.flatMap((d) => d.exercises.map((e) => e.exercise).filter(Boolean) as string[]));
  const [mediaMap, lastPerformance, pendingChangeKeys] = await Promise.all([
    getExerciseMediaByIds(exerciseIds),
    getLastPerformanceMap(session.user.id, exerciseIds),
    listPendingExerciseChangeKeys(session.user.id, String(program._id)),
  ]);

  const enrichedWeeks = weeks.map((w) => ({
    ...w,
    days: w.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((e) => ({
        ...e,
        ...(e.exercise ? mediaMap[e.exercise] : undefined),
      })),
    })),
  }));

  return (
    <WorkoutExecution
      program={{ id: String(program._id), name: program.nameAr, weeks: enrichedWeeks as never }}
      access={access}
      lastPerformance={lastPerformance as never}
      pendingChangeKeys={pendingChangeKeys}
    />
  );
}
