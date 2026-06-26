"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { ExerciseMedia } from "@/components/library/exercise-media";
import { ComparisonBadge, PerformanceDiff } from "@/components/workout/comparison-badge";
import type { ComparisonStatus } from "@/models/WorkoutLog";

export interface HistoryDetailData {
  _id: string;
  dayNameAr: string;
  dayNameEn: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  totalRestSeconds: number;
  completedCount: number;
  deferredCount: number;
  skippedCount: number;
  programName?: string;
  exercises: {
    exercise?: string | null;
    nameAr: string;
    nameEn: string;
    targetSets: number;
    targetReps: string;
    wasDeferred: boolean;
    skipped: boolean;
    sets: { setNumber: number; weight: number; reps: number }[];
    comparisonStatus?: ComparisonStatus | null;
    isPr?: boolean;
    previousSets?: { setNumber: number; weight: number; reps: number }[];
    videoUrl?: string;
    youtubeUrl?: string;
    imageUrlStart?: string;
    imageUrlEnd?: string;
    gifUrl?: string;
  }[];
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutHistoryDetail({ report }: { report: HistoryDetailData }) {
  const { dir, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ms-2">
        <Link href="/client/workout-history"><BackArrow className="h-4 w-4" />{L("سجل التمارين", "Workout history")}</Link>
      </Button>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{locale === "ar" ? report.dayNameAr : report.dayNameEn}</span>
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
            <span className="text-xs">{L("راحة", "rest")} {formatDuration(report.totalRestSeconds)}</span>
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
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                  <ExerciseMedia
                    media={{ imageUrlStart: ex.imageUrlStart, imageUrlEnd: ex.imageUrlEnd, gifUrl: ex.gifUrl }}
                    alt={locale === "ar" ? ex.nameAr : ex.nameEn}
                    className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
                    iconClassName="h-4 w-4 text-muted-foreground/40"
                  />
                </span>
                {locale === "ar" ? ex.nameAr : ex.nameEn}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ex.targetSets} × {ex.targetReps}</Badge>
                {ex.skipped ? (
                  <Badge variant="destructive">{L("تم التخطي", "Skipped")}</Badge>
                ) : ex.wasDeferred ? (
                  <Badge variant="warning">{L("تم تأجيله", "Was deferred")}</Badge>
                ) : null}
                <ComparisonBadge status={ex.comparisonStatus} />
              </div>
            </CardHeader>
            <CardContent>
              {ex.sets.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ex.skipped ? L("تم تخطي هذا التمرين", "This exercise was skipped") : L("لم يتم تسجيل مجموعات", "No sets logged")}</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {ex.sets.map((s) => (
                      <span key={s.setNumber} className="rounded-md bg-muted px-2.5 py-1 text-sm">
                        {L("مجموعة", "Set")} {s.setNumber}: {s.weight}{L("كجم", "kg")} × {s.reps}
                      </span>
                    ))}
                  </div>
                  {ex.previousSets && ex.previousSets.length > 0 && (
                    <PerformanceDiff previousSets={ex.previousSets} currentSets={ex.sets} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
