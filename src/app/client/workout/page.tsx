import { requireRole } from "@/lib/auth/session";
import { getOwnActiveProgram } from "@/lib/services/client-self";
import { getExerciseMediaByIds } from "@/lib/services/exercises";
import { WorkoutExecution } from "./workout-execution";

export const dynamic = "force-dynamic";

interface RawExercise {
  exercise?: string | null;
  nameAr: string;
  nameEn: string;
  sets: number;
  reps: string;
  restSeconds?: number;
}
interface RawDay { dayNumber: number; name: { ar: string; en: string }; exercises: RawExercise[] }
interface RawWeek { weekNumber: number; days: RawDay[] }

export default async function ClientWorkoutPage() {
  const session = await requireRole("client");
  const program = await getOwnActiveProgram(session.user.id);

  if (!program) {
    return <WorkoutExecution program={null} />;
  }

  const weeks = program.weeks as unknown as RawWeek[];
  const exerciseIds = weeks.flatMap((w) => w.days.flatMap((d) => d.exercises.map((e) => e.exercise).filter(Boolean) as string[]));
  const mediaMap = await getExerciseMediaByIds(exerciseIds);

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
    />
  );
}
