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
import type { PreviousPerformance } from "@/lib/services/workout-logs";
import type { DifficultyRating } from "@/models/WorkoutLog";

/** Plain weight-increase suggestion (never applied automatically), mirroring the server-side heuristic. */
function suggestedWeightIncrease(previous: PreviousPerformance | null | undefined): number | null {
  if (!previous?.difficultyRating) return null;
  const lastWeight = previous.bestSet?.weight ?? previous.sets[previous.sets.length - 1]?.weight ?? 0;
  const step = lastWeight >= 40 ? 5 : 2.5;
  if (previous.difficultyRating === "very_easy") return step * 2;
  if (previous.difficultyRating === "easy") return step;
  return null;
}

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
  difficultyRating?: DifficultyRating | null;
}

type Phase = "exercise" | "rest" | "difficulty" | "summary";

const DIFFICULTY_OPTIONS: { value: DifficultyRating; ar: string; en: string; emoji: string }[] = [
  { value: "very_easy", ar: "سهل جداً", en: "Very easy", emoji: "😴" },
  { value: "easy", ar: "سهل", en: "Easy", emoji: "🙂" },
  { value: "moderate", ar: "مناسب", en: "Moderate", emoji: "😐" },
  { value: "hard", ar: "صعب", en: "Hard", emoji: "😓" },
  { value: "very_hard", ar: "صعب جداً", en: "Very hard", emoji: "🥵" },
];
/** What comes after the current rest screen — another set of the same exercise, or the next exercise. */
type RestTarget = "set" | "exercise" | null;

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
  lastPerformance,
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
  lastPerformance?: Record<string, PreviousPerformance>;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const initial = useMemo<SessionExercise[]>(
    () =>
      exercises.map((ex, i) => {
        const last = ex.exercise ? lastPerformance?.[ex.exercise] : undefined;
        return {
          ...ex,
          key: `${i}-${ex.nameEn}`,
          // Pre-fill each set's weight from the client's last session for this exercise — purely a
          // starting point, never auto-incremented; the client can always edit it.
          loggedSets: Array.from({ length: ex.sets }).map((_, si) => ({
            weight: last?.sets[si]?.weight ? String(last.sets[si].weight) : last?.sets[last.sets.length - 1]?.weight ? String(last.sets[last.sets.length - 1].weight) : "",
            reps: "",
          })),
          wasDeferred: false,
          skipped: false,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises],
  );

  const total = initial.length;
  const [queue, setQueue] = useState<SessionExercise[]>(initial);
  const [done, setDone] = useState<SessionExercise[]>([]);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [restTarget, setRestTarget] = useState<RestTarget>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [totalRestSeconds, setTotalRestSeconds] = useState(0);
  const [startedAt] = useState(() => new Date());
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [pendingRest, setPendingRest] = useState<SessionExercise[] | null>(null);

  const current = queue[0];

  // Live session clock (header display only).
  useEffect(() => {
    if (phase === "summary") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  // Rest countdown — also accumulates real rest time taken for the session summary.
  useEffect(() => {
    if (phase !== "rest") return;
    if (restRemaining <= 0) {
      advanceFromRest();
      return;
    }
    const id = setTimeout(() => {
      setRestRemaining((s) => s - 1);
      setTotalRestSeconds((s) => s + 1);
    }, 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restRemaining]);

  function finishExercise(finished: SessionExercise, rest: SessionExercise[]) {
    setDone((d) => [...d, finished]);
    setQueue(rest);
    setSetIndex(0);
    setPendingRest(rest);
    setPhase("difficulty");
  }

  function chooseDifficulty(value: DifficultyRating) {
    const finishedRestSeconds = done.length > 0 ? done[done.length - 1].restSeconds : undefined;
    setDone((d) => (d.length === 0 ? d : [...d.slice(0, -1), { ...d[d.length - 1], difficultyRating: value }]));
    const rest = pendingRest ?? [];
    setPendingRest(null);
    if (rest.length === 0) {
      setEndedAt(new Date());
      setPhase("summary");
    } else {
      setRestTarget("exercise");
      setRestRemaining(finishedRestSeconds || 60);
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

  /** "Complete set" — either rests then moves to the next set, or finishes the exercise. */
  function completeSet() {
    if (!current) return;
    const isLastSet = setIndex >= current.loggedSets.length - 1;
    if (isLastSet) {
      finishExercise(current, queue.slice(1));
    } else {
      setRestTarget("set");
      setRestRemaining(current.restSeconds || 60);
      setPhase("rest");
    }
  }

  function advanceFromRest() {
    if (restTarget === "set") {
      setSetIndex((i) => i + 1);
    }
    setRestTarget(null);
    setPhase("exercise");
  }

  function skipCurrent() {
    if (!current) return;
    const skipped: SessionExercise = { ...current, skipped: true, loggedSets: current.loggedSets.map(() => ({ weight: "", reps: "" })) };
    const rest = queue.slice(1);
    setDone((d) => [...d, skipped]);
    setQueue(rest);
    setSetIndex(0);
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
    setSetIndex(0);
    if (rest.length === 0) {
      // Only exercise left — nothing to defer past, keep it in place.
      setQueue([deferred]);
      return;
    }
    setQueue([...rest, deferred]);
  }

  function goPrevious() {
    if (setIndex > 0) {
      setSetIndex((i) => i - 1);
      return;
    }
    if (done.length === 0) return;
    const last = done[done.length - 1];
    setDone((d) => d.slice(0, -1));
    setQueue((q) => [{ ...last, skipped: false }, ...q]);
    setSetIndex(Math.max(0, last.loggedSets.length - 1));
    setPhase("exercise");
  }

  function proceedFromRest() {
    setRestRemaining(0);
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
      totalRestSeconds,
      exercises: done.map((ex) => ({
        exerciseId: ex.exercise || undefined,
        nameAr: ex.nameAr,
        nameEn: ex.nameEn,
        targetSets: ex.sets,
        targetReps: ex.reps,
        wasDeferred: ex.wasDeferred,
        skipped: ex.skipped,
        difficultyRating: ex.difficultyRating ?? undefined,
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

          <div className="mb-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            <Card><CardContent className="p-3"><p className="text-base font-bold">{formatDuration(sessionSeconds)}</p><p className="text-xs text-muted-foreground">{L("المدة", "Duration")}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-base font-bold">{formatDuration(totalRestSeconds)}</p><p className="text-xs text-muted-foreground">{L("الراحة", "Rest")}</p></CardContent></Card>
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

  // ---- Rest screen (between sets, or between exercises) ----
  if (phase === "rest") {
    const isSetRest = restTarget === "set";
    const nextSetNumber = isSetRest ? setIndex + 2 : null;
    const upcomingExercise = isSetRest ? current : queue[0];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{L("وقت الراحة", "Rest time")}</p>
        <div className="flex h-44 w-44 items-center justify-center rounded-full border-8 border-primary/20">
          <span className="text-5xl font-bold tabular-nums text-primary">{restRemaining}</span>
        </div>
        {upcomingExercise && (
          <div>
            <p className="text-xs text-muted-foreground">
              {isSetRest ? L(`المجموعة القادمة ${nextSetNumber} من ${current.loggedSets.length}`, `Next set ${nextSetNumber} of ${current.loggedSets.length}`) : L("التمرين القادم", "Next exercise")}
            </p>
            <p className="text-lg font-semibold">{locale === "ar" ? upcomingExercise.nameAr : upcomingExercise.nameEn}</p>
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

  // ---- Difficulty check-in (right after finishing an exercise) ----
  if (phase === "difficulty") {
    const finished = done[done.length - 1];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{finished ? (locale === "ar" ? finished.nameAr : finished.nameEn) : ""}</p>
          <h2 className="mt-1 text-xl font-bold">{L("كيف كان التمرين؟", "How was the exercise?")}</h2>
        </div>
        <div className="grid w-full max-w-sm grid-cols-1 gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <Button key={opt.value} variant="outline" size="lg" className="justify-start gap-2 text-base" onClick={() => chooseDifficulty(opt.value)}>
              <span className="text-xl">{opt.emoji}</span>{L(opt.ar, opt.en)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Exercise screen (one set at a time) ----
  if (!current) return null;
  const index = done.length + 1;
  const set = current.loggedSets[setIndex];

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

        <div className="mt-4 rounded-xl border bg-muted/20 p-3">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{L("آخر أداء لهذا التمرين", "Last performance for this exercise")}</p>
          {(() => {
            const last = current.exercise ? lastPerformance?.[current.exercise] : undefined;
            if (!last) {
              return <p className="text-sm text-muted-foreground">{L("لا يوجد سجل سابق لهذا التمرين.", "No previous record for this exercise.")}</p>;
            }
            const suggestion = suggestedWeightIncrease(last);
            return (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground" dir="ltr">{new Date(last.date).toLocaleDateString("en-GB")}</p>
                <div className="flex flex-wrap gap-2">
                  {last.sets.map((s, i) => (
                    <span key={i} className="rounded-md bg-background px-2 py-1 text-xs">
                      {L("مجموعة", "Set")} {s.setNumber}: {s.weight}{L("كجم", "kg")} × {s.reps}
                    </span>
                  ))}
                </div>
                {last.bestSet && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {L("أفضل مجموعة", "Best set")}: <span className="font-semibold text-foreground">{last.bestSet.weight}{L("كجم", "kg")} × {last.bestSet.reps}</span>
                  </p>
                )}
                {suggestion != null && (
                  <p className="mt-2 rounded-md bg-success/10 px-2 py-1 text-xs text-success">
                    💡 {L(`أداؤك السابق كان سهلاً — جرّب زيادة +${suggestion}كجم`, `Your last session looked easy — try +${suggestion}kg`)}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="mt-5 rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-sm font-medium text-primary">
            {L(`المجموعة ${setIndex + 1} من ${current.loggedSets.length}`, `Set ${setIndex + 1} of ${current.loggedSets.length}`)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{L("الوزن المنفذ (كجم)", "Weight done (kg)")}</label>
              <Input type="number" inputMode="decimal" placeholder="0" className="h-11 text-center text-lg" value={set.weight} onChange={(e) => updateSet(setIndex, "weight", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{L("التكرارات المنفذة", "Reps done")}</label>
              <Input type="number" inputMode="numeric" placeholder={current.reps} className="h-11 text-center text-lg" value={set.reps} onChange={(e) => updateSet(setIndex, "reps", e.target.value)} />
            </div>
          </div>
        </div>

        {current.loggedSets.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {current.loggedSets.map((s, i) => (
              <span
                key={i}
                className={
                  "rounded-md px-2 py-1 text-xs " +
                  (i === setIndex
                    ? "bg-primary text-primary-foreground"
                    : i < setIndex || s.weight || s.reps
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground")
                }
              >
                {L("مجموعة", "Set")} {i + 1}{i !== setIndex && (s.weight || s.reps) ? `: ${s.weight || 0}×${s.reps || 0}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto max-w-lg space-y-2">
          <Button onClick={completeSet} className="w-full gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {setIndex >= current.loggedSets.length - 1 ? L("اكتمل التمرين", "Complete exercise") : L("اكتملت المجموعة", "Complete set")}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={goPrevious} disabled={done.length === 0 && setIndex === 0} className="gap-1.5"><Undo2 className="h-4 w-4" />{t.common.previous}</Button>
            <Button variant="outline" onClick={deferCurrent} className="gap-1.5"><SkipForward className="h-4 w-4" />{L("اجعله لاحقاً", "Do later")}</Button>
            <Button variant="outline" onClick={skipCurrent} className="gap-1.5 text-destructive hover:text-destructive"><XCircle className="h-4 w-4" />{L("تخطي", "Skip")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
