import { notFound } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessReports } from "@/lib/permissions/team";
import { getReportForCoach } from "@/lib/services/workout-reports";
import { WorkoutReportDetail, type ReportDetailData } from "./workout-report-detail";

export const dynamic = "force-dynamic";

export default async function WorkoutReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCoachArea(canAccessReports);
  const report = await getReportForCoach(ctx.coachId, id);
  if (!report) notFound();

  const data = report as unknown as ReportDetailData;
  return <WorkoutReportDetail report={data} />;
}
