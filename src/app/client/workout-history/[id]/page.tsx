import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getReportForClient } from "@/lib/services/workout-reports";
import { getExerciseMediaByIds } from "@/lib/services/exercises";
import { WorkoutHistoryDetail, type HistoryDetailData } from "./workout-history-detail";

export const dynamic = "force-dynamic";

export default async function WorkoutHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("client");
  const report = await getReportForClient(session.user.id, id);
  if (!report) notFound();

  const raw = report as unknown as HistoryDetailData;
  const exerciseIds = raw.exercises.map((e) => e.exercise).filter(Boolean) as string[];
  const mediaMap = await getExerciseMediaByIds(exerciseIds);
  const data: HistoryDetailData = {
    ...raw,
    exercises: raw.exercises.map((e) => ({ ...e, ...(e.exercise ? mediaMap[e.exercise] : undefined) })),
  };
  return <WorkoutHistoryDetail report={data} />;
}
