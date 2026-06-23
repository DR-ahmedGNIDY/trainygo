"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { ExerciseMedia } from "@/components/library/exercise-media";
import { WorkoutSession, type SessionExerciseSource } from "@/components/client/workout-session";
import { FrozenBanner } from "@/components/client/access-banners";
import type { ClientAccessState } from "@/lib/services/subscription";

type Ex = SessionExerciseSource;
interface Day { dayNumber: number; name: { ar: string; en: string }; exercises: Ex[] }
interface Week { weekNumber: number; days: Day[] }

export function WorkoutExecution({
  program,
  access,
}: {
  program: { id: string; name: string; weeks: Week[] } | null;
  access: ClientAccessState;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wi, setWi] = useState(0);
  const [di, setDi] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    if (!access.frozen && searchParams.get("autostart") === "1") setSessionActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (sessionActive && day && !access.frozen) {
    return (
      <WorkoutSession
        exercises={day.exercises}
        programId={programId}
        programName={programName}
        weekNumber={week.weekNumber}
        dayNumber={day.dayNumber}
        dayNameAr={day.name.ar}
        dayNameEn={day.name.en}
        onExit={() => setSessionActive(false)}
        onSubmitted={() => router.refresh()}
      />
    );
  }

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

      {access.frozen && <FrozenBanner reason={access.frozenReason!} />}

      {!day || day.exercises.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t.client.noWorkoutToday}</CardContent></Card>
      ) : (
        <div className="space-y-4">
          <Button size="lg" className="w-full gap-2 sm:w-auto" onClick={() => setSessionActive(true)} disabled={access.frozen}>
            <Play className="h-4 w-4" />{L("ابدأ الآن", "Start now")}
          </Button>

          <div className="space-y-2">
            {day.exercises.map((ex, ei) => (
              <Card key={ei}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <ExerciseMedia
                      media={{ imageUrlStart: ex.imageUrlStart, imageUrlEnd: ex.imageUrlEnd, gifUrl: ex.gifUrl }}
                      alt={locale === "ar" ? ex.nameAr : ex.nameEn}
                      className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
                      iconClassName="h-6 w-6 text-muted-foreground/40"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{locale === "ar" ? ex.nameAr : ex.nameEn}</p>
                    <p className="text-xs text-muted-foreground">{ex.sets} {t.client.sets} × {ex.reps} {t.client.reps}{ex.restSeconds ? ` · ${ex.restSeconds}s ${t.client.rest}` : ""}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
