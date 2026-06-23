"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  SkipForward,
  XCircle,
  Timer as TimerIcon,
  Undo2,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExerciseMedia } from "@/components/library/exercise-media";
import { useI18n } from "@/components/providers/i18n-provider";
import { submitWorkoutReportAction } from "@/lib/actions/client";

export interface SessionExerciseSource {
  exercise?: string | null;
  nameAr: string;
  nameEn: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  videoUrl?: string;
  youtubeUrl?: string;
  imageUrlStart?: string;
  imageUrlEnd?: string;
  gifUrl?: string;
}

interface SessionExercise extends SessionExerciseSource {
  key: string;
  loggedSets: { weight: string; reps: string }[];
  wasDeferred: boolean;
  skipped: boolean;
}

type Phase = "exercise" | "rest" | "summary";

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutSession({
  exercises,
  programId,
  programName,
  weekNumber,
  dayNumber,
  dayNameAr,
  dayNameEn,
  onExit,
  onSubmitted,
}: {
  exercises: SessionExerciseSource[];
  programId: string;
  programName: string;
  weekNumber: number;
  dayNumber: number;
  dayNameAr: string;
  dayNameEn: string;
  onExit: () => void;
  onSubmitted: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const initial = useMemo<SessionExercise[]>(
    () =>
      exercises.map((ex, i) => ({
        ...ex,
        key: `${i}-${ex.nameEn}`,
        loggedSets: Array.from({ length: ex.sets }).map(() => ({ weight: "", reps: "" })),
        wasDeferred: false,
        skipped: false,
      })),
    [exercises],
  );

  const total = initial.length;
  const [queue, setQueue] = useState<SessionExercise[]>(initial);
  const [done, setDone] = useState<SessionExercise[]>([]);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [restRemaining, setRestRemaining] = useState(0);
  const [startedAt] = useState(() => new Date());
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  const current = queue[0];

  // Live session clock (header display only).
  useEffect(() => {
    if (phase === "summary") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  // Rest countdown.
  useEffect(() => {
    if (phase !== "rest") return;
    if (restRemaining <= 0) {
      setPhase("exercise");
      return;
    }
    const id = setTimeout(() => setRestRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, restRemaining]);

  function finishOrRest(finished: SessionExercise, rest: SessionExercise[]) {
    setDone((d) => [...d, finished]);
    setQueue(rest);
    if (rest.length === 0) {
      setEndedAt(new Date());
      setPhase("summary");
    } else {
      setRestRemaining(finished.restSeconds || 60);
      setPhase("rest");
    }
  }

  function updateSet(i: number, field: "weight" | "reps", value: string) {
    setQueue((q) => {
      const next = [...q];
      const ex = { ...next[0], loggedSets: next[0].loggedSets.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) };
      next[0] = ex;
      return next;
    });
  }

  function completeCurrent() {
    if (!current) return;
    finishOrRest(current, queue.slice(1));
  }

  function skipCurrent() {
    if (!current) return;
    const skipped: SessionExercise = { ...current, skipped: true, loggedSets: current.loggedSets.map(() => ({ weight: "", reps: "" })) };
    const rest = queue.slice(1);
    setDone((d) => [...d, skipped]);
    setQueue(rest);
    if (rest.length === 0) {
      setEndedAt(new Date());
      setPhase("summary");
    }
    // No rest screen after a skip — move straight to the next exercise.
  }

  function deferCurrent() {
    if (!current) return;
    const deferred = { ...current, wasDeferred: true };
    const rest = queue.slice(1);
    if (rest.length === 0) {
      // Only exercise left — nothing to defer past, keep it in place.
      setQueue([deferred]);
      return;
    }
    setQueue([...rest, deferred]);
  }

  function goPrevious() {
    if (done.length === 0) return;
    const last = done[done.length - 1];
    setDone((d) => d.slice(0, -1));
    setQueue((q) => [{ ...last, skipped: false }, ...q]);
    setPhase("exercise");
  }

  function proceedFromRest() {
    setRestRemaining(0);
    setPhase("exercise");
  }

  function addRestTime() {
    setRestRemaining((s) => s + 30);
  }

  async function submitReport() {
    setSubmitting(true);
    const finalEndedAt = endedAt ?? new Date();
    const res = await submitWorkoutReportAction({
      programId,
      programName,
      weekNumber,
      dayNumber,
      dayNameAr,
      dayNameEn,
      startedAt: startedAt.toISOString(),
      endedAt: finalEndedAt.toISOString(),
      exercises: done.map((ex) => ({
        exerciseId: ex.exercise || undefined,
        nameAr: ex.nameAr,
        nameEn: ex.nameEn,
        targetSets: ex.sets,
        targetReps: ex.reps,
        wasDeferred: ex.wasDeferred,
        skipped: ex.skipped,
        sets: ex.skipped
          ? []
          : ex.loggedSets
              .map((s, i) => ({ setNumber: i + 1, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }))
              .filter((s) => s.weight > 0 || s.reps > 0),
      })),
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
      setWhatsappLink(res.data!.whatsappLink);
      onSubmitted();
      if (res.data!.whatsappLink) window.open(res.data!.whatsappLink, "_blank");
    }
  }

  const completedCount = done.filter((e) => !e.skipped).length;
  const deferredCount = done.filter((e) => e.wasDeferred && !e.skipped).length;
  const skippedCount = done.filter((e) => e.skipped).length;
  const sessionSeconds = endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : elapsed;

  // ---- Summary screen ----
  if (phase === "summary") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-lg flex-1 p-4 pb-24">
          <div className="mb-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-success" />
            <h2 className="text-xl font-bold">{L("اكتملت الجلسة!", "Session complete!")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{programName} · {L(dayNameAr, dayNameEn)}</p>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-2 text-center">
            <Card><CardContent className="p-3"><p className="text-base font-bold">{formatDuration(sessionSeconds)}</p><p className="text-xs text-muted-foreground">{L("المدة", "Duration")}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-base font-bold text-success">{completedCount}</p><p className="text-xs text-muted-foreground">{L("مكتمل", "Completed")}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-base font-bold text-warning">{deferredCount}</p><p className="text-xs text-muted-foreground">{L("مؤجل", "Deferred")}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-base font-bold text-destructive">{skippedCount}</p><p className="text-xs text-muted-foreground">{L("متخطى", "Skipped")}</p></CardContent></Card>
          </div>

          <div className="space-y-2">
            {done.map((ex) => (
              <Card key={ex.key}>
                <CardContent className="p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{locale === "ar" ? ex.nameAr : ex.nameEn}</p>
                    {ex.skipped ? (
                      <Badge variant="destructive">{L("تم التخطي", "Skipped")}</Badge>
                    ) : ex.wasDeferred ? (
                      <Badge variant="warning">{L("تم تأجيله", "Was deferred")}</Badge>
                    ) : null}
                  </div>
                  {!ex.skipped && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {ex.loggedSets.map((s, si) => (
                        <span key={si} className="rounded-md bg-muted px-2 py-1">
                          {L("مجموعة", "Set")} {si + 1}: {s.weight || 0}{L("كجم", "kg")} × {s.reps || 0}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
          <div className="mx-auto max-w-lg">
            <Button className="w-full gap-2" size="lg" onClick={submitReport} disabled={submitting || submitted}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitted ? L("تم الإرسال للمدرب", "Sent to coach") : L("إنهاء وإرسال للمدرب", "Finish & send to coach")}
            </Button>
            {submitted && whatsappLink && (
              <Button variant="outline" className="mt-2 w-full gap-2" onClick={() => window.open(whatsappLink, "_blank")}>
                {L("فتح واتساب لإرسال الملخص", "Open WhatsApp to send summary")}
              </Button>
            )}
            {submitted && (
              <Button variant="outline" className="mt-2 w-full" onClick={onExit}>{L("العودة", "Back")}</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Rest screen ----
  if (phase === "rest") {
    const next = queue[0];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{L("وقت الراحة", "Rest time")}</p>
        <div className="flex h-44 w-44 items-center justify-center rounded-full border-8 border-primary/20">
          <span className="text-5xl font-bold tabular-nums text-primary">{restRemaining}</span>
        </div>
        {next && (
          <div>
            <p className="text-xs text-muted-foreground">{L("التمرين القادم", "Next exercise")}</p>
            <p className="text-lg font-semibold">{locale === "ar" ? next.nameAr : next.nameEn}</p>
          </div>
        )}
        <div className="grid w-full max-w-xs grid-cols-2 gap-3">
          <Button variant="outline" onClick={addRestTime} className="gap-1.5"><Plus className="h-4 w-4" />30{L("ث", "s")}</Button>
          <Button variant="outline" onClick={proceedFromRest} className="gap-1.5"><SkipForward className="h-4 w-4" />{L("تخطي الراحة", "Skip rest")}</Button>
        </div>
        <Button size="lg" className="w-full max-w-xs gap-2" onClick={proceedFromRest}>
          <TimerIcon className="h-4 w-4" />{L("جاهز الآن", "I'm ready")}
        </Button>
      </div>
    );
  }

  // ---- Exercise screen ----
  if (!current) return null;
  const index = done.length + 1;
  const firstOpenSetIndex = (() => {
    const idx = current.loggedSets.findIndex((s) => !s.weight && !s.reps);
    return idx === -1 ? current.loggedSets.length - 1 : idx;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onExit}>{t.common.close}</Button>
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" />{formatDuration(elapsed)}
        </div>
        <span className="text-sm font-semibold tabular-nums">{index} / {total}</span>
      </div>
      <div className="border-b bg-muted/30 px-4 py-1.5 text-center text-xs text-muted-foreground">
        {programName} · {L(dayNameAr, dayNameEn)}
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 p-4 pb-28">
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-muted">
          <ExerciseMedia
            media={{ videoUrl: current.videoUrl, youtubeUrl: current.youtubeUrl, imageUrlStart: current.imageUrlStart, imageUrlEnd: current.imageUrlEnd, gifUrl: current.gifUrl }}
            alt={locale === "ar" ? current.nameAr : current.nameEn}
            className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
            iconClassName="h-12 w-12 text-muted-foreground/40"
          />
        </div>

        <h2 className="text-xl font-bold">{locale === "ar" ? current.nameAr : current.nameEn}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{current.sets} {t.client.sets}</Badge>
          <Badge variant="outline">{current.reps} {t.client.reps}</Badge>
          {current.restSeconds ? <Badge variant="outline">{current.restSeconds}{L("ث راحة", "s rest")}</Badge> : null}
          {current.youtubeUrl && !current.videoUrl && <Youtube className="h-4 w-4 text-destructive" />}
        </div>
        <p className="mt-2 text-sm font-medium text-primary">
          {L(`المجموعة ${firstOpenSetIndex + 1} من ${current.loggedSets.length}`, `Set ${firstOpenSetIndex + 1} of ${current.loggedSets.length}`)}
        </p>

        <div className="mt-5 space-y-2">
          <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span>{L("مجموعة", "Set")}</span><span>{L("الوزن المنفذ (كجم)", "Weight done (kg)")}</span><span>{L("التكرارات المنفذة", "Reps done")}</span>
          </div>
          {current.loggedSets.map((s, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold">{i + 1}</span>
              <Input type="number" inputMode="decimal" placeholder="0" className="h-10" value={s.weight} onChange={(e) => updateSet(i, "weight", e.target.value)} />
              <Input type="number" inputMode="numeric" placeholder={current.reps} className="h-10" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto max-w-lg space-y-2">
          <Button onClick={completeCurrent} className="w-full gap-1.5"><CheckCircle2 className="h-4 w-4" />{L("اكتمل التمرين", "Complete")}</Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={goPrevious} disabled={done.length === 0} className="gap-1.5"><Undo2 className="h-4 w-4" />{t.common.previous}</Button>
            <Button variant="outline" onClick={deferCurrent} className="gap-1.5"><SkipForward className="h-4 w-4" />{L("اجعله لاحقاً", "Do later")}</Button>
            <Button variant="outline" onClick={skipCurrent} className="gap-1.5 text-destructive hover:text-destructive"><XCircle className="h-4 w-4" />{L("تخطي", "Skip")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
