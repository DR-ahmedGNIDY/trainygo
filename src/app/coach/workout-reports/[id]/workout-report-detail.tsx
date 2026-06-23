"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";

export interface ReportDetailData {
  _id: string;
  client?: { name?: string };
  dayNameAr: string;
  dayNameEn: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  completedCount: number;
  deferredCount: number;
  skippedCount: number;
  programName?: string;
  exercises: {
    nameAr: string;
    nameEn: string;
    targetSets: number;
    targetReps: string;
    wasDeferred: boolean;
    skipped: boolean;
    sets: { setNumber: number; weight: number; reps: number }[];
  }[];
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutReportDetail({ report }: { report: ReportDetailData }) {
  const { dir, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ms-2">
        <Link href="/coach/workout-reports"><BackArrow className="h-4 w-4" />{L("تقارير التمارين", "Workout reports")}</Link>
      </Button>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{report.client?.name ?? "—"}</span>
            <span className="text-muted-foreground">·</span>
            <span>{locale === "ar" ? report.dayNameAr : report.dayNameEn}</span>
            {report.programName && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{report.programName}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span dir="ltr">{new Date(report.startedAt).toLocaleString("en-GB")}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDuration(report.durationSeconds)}</span>
            <Badge variant="success">{report.completedCount} {L("مكتمل", "done")}</Badge>
            {report.deferredCount > 0 && <Badge variant="warning">{report.deferredCount} {L("مؤجل", "deferred")}</Badge>}
            {report.skippedCount > 0 && <Badge variant="destructive">{report.skippedCount} {L("متخطى", "skipped")}</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {report.exercises.map((ex, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{locale === "ar" ? ex.nameAr : ex.nameEn}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ex.targetSets} × {ex.targetReps}</Badge>
                {ex.skipped ? (
                  <Badge variant="destructive">{L("تم التخطي", "Skipped")}</Badge>
                ) : ex.wasDeferred ? (
                  <Badge variant="warning">{L("تم تأجيله", "Was deferred")}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {ex.sets.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ex.skipped ? L("تم تخطي هذا التمرين", "This exercise was skipped") : L("لم يتم تسجيل مجموعات", "No sets logged")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ex.sets.map((s) => (
                    <span key={s.setNumber} className="rounded-md bg-muted px-2.5 py-1 text-sm">
                      {L("مجموعة", "Set")} {s.setNumber}: {s.weight}{L("كجم", "kg")} × {s.reps}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
