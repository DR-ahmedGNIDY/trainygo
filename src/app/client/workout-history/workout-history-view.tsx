"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { History, Search, Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { WorkoutTabs } from "@/app/client/workout/workout-execution";
import { LineTrend } from "@/components/dashboard/charts";
import { searchExerciseHistoryAction } from "@/lib/actions/client";

export interface HistoryRow {
  id: string;
  dayNameAr: string;
  dayNameEn: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  totalRestSeconds: number;
  exerciseCount: number;
  completedCount: number;
  deferredCount: number;
  skippedCount: number;
  totalSets: number;
}

interface LogRow {
  _id: string;
  exerciseNameAr: string;
  exerciseNameEn: string;
  date: string;
  estimatedOneRm: number;
  sets: { setNumber: number; weight: number; reps: number }[];
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutHistoryView({ rows }: { rows: HistoryRow[] }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LogRow[] | null>(null);
  const [searching, startSearch] = useTransition();

  function runSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults(null);
      return;
    }
    startSearch(async () => {
      const res = await searchExerciseHistoryAction(value);
      setResults(res.ok ? (res.data as LogRow[]) : []);
    });
  }

  return (
    <div>
      <WorkoutTabs active="history" />
      <PageHeader title={L("سجل التمارين", "Workout history")} />

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder={L("ابحث عن تمرين... مثال: Bench Press", "Search an exercise... e.g. Bench Press")}
              value={query}
              onChange={(e) => runSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {query.trim() ? (
        <div>
          {searching ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !results || results.length === 0 ? (
            <EmptyState icon={Search} title={L("لا توجد نتائج", "No results")} />
          ) : (
            <>
              <Card className="mb-3">
                <CardContent className="p-4">
                  <p className="mb-2 text-sm font-semibold">{L("تطور الأداء (أفضل تقدير لرفعة واحدة)", "Performance trend (estimated 1RM)")}</p>
                  <LineTrend
                    data={results.map((r) => ({ label: new Date(r.date).toLocaleDateString("en-GB"), value: r.estimatedOneRm }))}
                    xKey="label"
                    yKey="value"
                    height={220}
                  />
                </CardContent>
              </Card>
              <div className="space-y-2">
                {[...results].reverse().map((r) => (
                  <Card key={r._id}>
                    <CardContent className="p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-semibold">{locale === "ar" ? r.exerciseNameAr : r.exerciseNameEn}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">{new Date(r.date).toLocaleDateString("en-GB")}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {r.sets.map((s, i) => (
                          <span key={i} className="rounded-md bg-muted px-2 py-1 text-xs">
                            {L("مجموعة", "Set")} {s.setNumber}: {s.weight}{L("كجم", "kg")} × {s.reps}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={History}
          title={L("لا يوجد سجل تمارين بعد", "No workout history yet")}
          description={L("ستظهر جلساتك هنا بمجرد إنهاء أول جلسة تمرين.", "Your sessions will appear here once you finish your first workout.")}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/client/workout-history/${r.id}`}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{locale === "ar" ? r.dayNameAr : r.dayNameEn}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{new Date(r.startedAt).toLocaleDateString("en-GB")} · {new Date(r.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} → {new Date(r.endedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(r.durationSeconds)}</span>
                    <span>{L("راحة", "rest")} {formatDuration(r.totalRestSeconds)}</span>
                    <span>{r.exerciseCount} {L("تمارين", "exercises")}</span>
                    <span>{r.totalSets} {L("مجموعات", "sets")}</span>
                    <Badge variant="success">{r.completedCount} {L("مكتمل", "done")}</Badge>
                    {r.deferredCount > 0 && <Badge variant="warning">{r.deferredCount} {L("مؤجل", "deferred")}</Badge>}
                    {r.skippedCount > 0 && <Badge variant="destructive">{r.skippedCount} {L("متخطى", "skipped")}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
