import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getReportForCoach } from "@/lib/services/workout-reports";
import { WorkoutReportDetail, type ReportDetailData } from "./workout-report-detail";

export const dynamic = "force-dynamic";

export default async function WorkoutReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("coach");
  const report = await getReportForCoach(session.user.id, id);
  if (!report) notFound();

  const data = report as unknown as ReportDetailData;
  return <WorkoutReportDetail report={data} />;
}
