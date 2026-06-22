"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Youtube, CheckCircle2, Circle, Loader2, Film } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { logExerciseAction } from "@/lib/actions/client";

interface Ex {
  exercise?: string | null;
  nameAr: string;
  nameEn: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  youtubeUrl?: string;
}
interface Day { dayNumber: number; name: { ar: string; en: string }; exercises: Ex[] }
interface Week { weekNumber: number; days: Day[] }

export function WorkoutExecution({
  program,
}: {
  program: { id: string; name: string; weeks: Week[] } | null;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [wi, setWi] = useState(0);
  const [di, setDi] = useState(0);

  if (!program) {
    return (
      <div>
        <PageHeader title={t.dashboard.clientNav.workout} />
        <EmptyState
          icon={Dumbbell}
          title={L("لا يوجد برنامج تدريبي بعد", "No workout program yet")}
          description={L("سيظهر برنامجك هنا بمجرد أن يسنده مدربك.", "Your program will appear here once your coach assigns it.")}
        />
      </div>
    );
  }

  const { id: programId, name: programName, weeks } = program;
  const week = weeks[wi];
  const day = week?.days[di];

  return (
    <div>
      <PageHeader title={t.dashboard.clientNav.workout} description={programName}>
        <div className="flex gap-2">
          <Select value={String(wi)} onValueChange={(v) => { setWi(Number(v)); setDi(0); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{weeks.map((w, i) => <SelectItem key={i} value={String(i)}>{L(`أسبوع ${w.weekNumber}`, `Week ${w.weekNumber}`)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(di)} onValueChange={(v) => setDi(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{week?.days.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name[locale]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </PageHeader>

      {!day || day.exercises.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t.client.noWorkoutToday}</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {day.exercises.map((ex, ei) => (
            <ExerciseCard
              key={ei}
              ex={ex}
              programId={programId}
              weekNumber={week.weekNumber}
              dayNumber={day.dayNumber}
              onLogged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  ex,
  programId,
  weekNumber,
  dayNumber,
  onLogged,
}: {
  ex: Ex;
  programId: string;
  weekNumber: number;
  dayNumber: number;
  onLogged: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [rows, setRows] = useState(() => Array.from({ length: ex.sets }).map(() => ({ weight: "", reps: "" })));
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function setRow(i: number, k: "weight" | "reps", v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  function save() {
    startTransition(async () => {
      const sets = rows.map((r, i) => ({ setNumber: i + 1, weight: Number(r.weight) || 0, reps: Number(r.reps) || 0 }));
      const res = await logExerciseAction({
        exerciseId: ex.exercise || undefined,
        exerciseNameAr: ex.nameAr,
        exerciseNameEn: ex.nameEn,
        programId,
        weekNumber,
        dayNumber,
        sets,
        completed: true,
      });
      if (res.ok) { setDone(true); onLogged(); }
    });
  }

  return (
    <Card className={done ? "border-success/40" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex gap-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
            <Badge variant="secondary" className="absolute -bottom-1.5 start-1/2 -translate-x-1/2 gap-1 px-1.5 py-0 text-[10px]"><Film className="h-2.5 w-2.5" />GIF</Badge>
          </div>
          <div>
            <CardTitle className="text-base">{locale === "ar" ? ex.nameAr : ex.nameEn}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{ex.sets} {t.client.sets} × {ex.reps} {t.client.reps}{ex.restSeconds ? ` · ${ex.restSeconds}s ${t.client.rest}` : ""}</p>
            {ex.youtubeUrl && <a href={ex.youtubeUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-destructive"><Youtube className="h-4 w-4" />{L("شاهد الفيديو", "Watch video")}</a>}
          </div>
        </div>
        <Button variant={done ? "default" : "outline"} size="sm" onClick={save} disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          <span className="hidden sm:inline">{done ? t.common.saved : t.client.markComplete}</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span>{L("مجموعة", "Set")}</span><span>{L("الوزن (كجم)", "Weight (kg)")}</span><span>{t.client.reps}</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-sm font-semibold">{i + 1}</span>
              <Input type="number" inputMode="decimal" placeholder="0" className="h-9" value={r.weight} onChange={(e) => setRow(i, "weight", e.target.value)} />
              <Input type="number" inputMode="numeric" placeholder={ex.reps} className="h-9" value={r.reps} onChange={(e) => setRow(i, "reps", e.target.value)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
