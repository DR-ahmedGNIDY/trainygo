import { requireRole } from "@/lib/auth/session";
import { getOwnActiveProgram } from "@/lib/services/client-self";
import { WorkoutExecution } from "./workout-execution";

export const dynamic = "force-dynamic";

export default async function ClientWorkoutPage() {
  const session = await requireRole("client");
  const program = await getOwnActiveProgram(session.user.id);

  return (
    <WorkoutExecution
      program={
        program
          ? { id: String(program._id), name: program.nameAr, weeks: program.weeks as never }
          : null
      }
    />
  );
}
