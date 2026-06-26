"use client";

import { Trophy, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ComparisonStatus } from "@/models/WorkoutLog";

interface ReportSetLike {
  setNumber: number;
  weight: number;
  reps: number;
}

function bestSet(sets: ReportSetLike[]) {
  return sets.reduce<ReportSetLike | null>((best, s) => {
    if (!best) return s;
    if (s.weight > best.weight) return s;
    if (s.weight === best.weight && s.reps > best.reps) return s;
    return best;
  }, null);
}

export function ComparisonBadge({ status }: { status: ComparisonStatus | null | undefined }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  if (!status || status === "first_time") return null;

  if (status === "pr") {
    return (
      <Badge className="gap-1 border-transparent bg-amber-500 text-white">
        <Trophy className="h-3 w-3" />{L("رقم قياسي جديد", "New PR")}
      </Badge>
    );
  }
  if (status === "improved") {
    return (
      <Badge variant="success" className="gap-1">
        <ArrowUp className="h-3 w-3" />{L("تحسن", "Improved")}
      </Badge>
    );
  }
  if (status === "decline") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ArrowDown className="h-3 w-3" />{L("انخفاض", "Decline")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ArrowRight className="h-3 w-3" />{L("ثابت", "Steady")}
    </Badge>
  );
}

/** Side-by-side previous vs. current top-set comparison, e.g. "40kg x10 -> 45kg x10 (+5kg)". */
export function PerformanceDiff({
  previousSets,
  currentSets,
}: {
  previousSets: ReportSetLike[];
  currentSets: ReportSetLike[];
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const prev = bestSet(previousSets);
  const curr = bestSet(currentSets);
  if (!prev || !curr) return null;

  const weightDiff = curr.weight - prev.weight;
  const repsDiff = curr.reps - prev.reps;
  const parts: string[] = [];
  if (weightDiff !== 0) parts.push(`${weightDiff > 0 ? "+" : ""}${weightDiff}kg`);
  if (repsDiff !== 0) parts.push(`${repsDiff > 0 ? "+" : ""}${repsDiff} ${L("تكرار", "reps")}`);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-2 text-xs">
      <span className="text-muted-foreground">{L("السابق", "Previous")}: {prev.weight}{L("كجم", "kg")} × {prev.reps}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-medium">{L("الحالي", "Current")}: {curr.weight}{L("كجم", "kg")} × {curr.reps}</span>
      {parts.length > 0 && (
        <Badge variant={weightDiff < 0 || repsDiff < 0 ? "destructive" : "success"} className="ms-auto">
          {parts.join(" · ")}
        </Badge>
      )}
    </div>
  );
}
