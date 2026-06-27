"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Search,
  Save,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import { searchExercisesAction, getExerciseMediaAction, type ExercisePickerItem, type ExerciseMediaInfo } from "@/lib/actions/exercises";
import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/utils";
import { ExerciseMedia } from "@/components/library/exercise-media";

export interface BExercise {
  exercise?: string | null;
  nameAr: string;
  nameEn: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  notes?: string;
  order: number;
}
export interface BDay {
  dayNumber: number;
  name: { ar: string; en: string };
  exercises: BExercise[];
  notes?: string;
}
export interface BWeek {
  weekNumber: number;
  name?: { ar?: string; en?: string };
  days: BDay[];
}

export function WorkoutBuilder({
  backHref,
  title,
  subtitle,
  initialNameAr,
  initialNameEn,
  initialWeeks,
  onSave,
  flat = false,
}: {
  backHref?: string;
  title?: string;
  subtitle?: string;
  initialNameAr: string;
  initialNameEn: string;
  initialWeeks: BWeek[];
  onSave: (data: { nameAr: string; nameEn: string; weeks: BWeek[] }) => Promise<ActionResult>;
  /** Inline mode for embedding directly on the client page: no weeks UI (single
   * implicit week), day-tabs instead of week cards, and the exercise library
   * shown inline under the open day instead of in a popup. */
  flat?: boolean;
}) {
  const { t, locale, dir } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [nameAr, setNameAr] = useState(initialNameAr);
  const [nameEn, setNameEn] = useState(initialNameEn);
  const [weeks, setWeeks] = useState<BWeek[]>(
    initialWeeks.length ? initialWeeks : [{ weekNumber: 1, name: { ar: "الأسبوع 1", en: "Week 1" }, days: [] }],
  );
  const [picker, setPicker] = useState<{ w: number; d: number } | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, ExerciseMediaInfo>>({});

  // Fetch thumbnails for any exercise already in the program that we don't have media for yet.
  useEffect(() => {
    const ids = [...new Set(weeks.flatMap((w) => w.days.flatMap((d) => d.exercises.map((e) => e.exercise).filter(Boolean) as string[])))];
    const missing = ids.filter((id) => !(id in mediaMap));
    if (missing.length === 0) return;
    getExerciseMediaAction(missing).then((res) => {
      if (res.ok) setMediaMap((prev) => ({ ...prev, ...res.data! }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks]);

  const mut = (fn: (draft: BWeek[]) => void) =>
    setWeeks((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as BWeek[];
      fn(next);
      return next;
    });

  const addWeek = () => mut((w) => w.push({ weekNumber: w.length + 1, name: { ar: `الأسبوع ${w.length + 1}`, en: `Week ${w.length + 1}` }, days: [] }));
  const removeWeek = (wi: number) => mut((w) => { w.splice(wi, 1); w.forEach((x, i) => (x.weekNumber = i + 1)); });
  const addDay = (wi: number) => mut((w) => { const d = w[wi].days; d.push({ dayNumber: d.length + 1, name: { ar: `اليوم ${d.length + 1}`, en: `Day ${d.length + 1}` }, exercises: [] }); });
  const removeDay = (wi: number, di: number) => mut((w) => { w[wi].days.splice(di, 1); w[wi].days.forEach((x, i) => (x.dayNumber = i + 1)); });
  const addExercise = (wi: number, di: number, ex: { id: string; nameAr: string; nameEn: string }) =>
    mut((w) => { const list = w[wi].days[di].exercises; list.push({ exercise: ex.id, nameAr: ex.nameAr, nameEn: ex.nameEn, sets: 3, reps: "8-12", restSeconds: 60, order: list.length + 1 }); });
  const removeExercise = (wi: number, di: number, ei: number) => mut((w) => { w[wi].days[di].exercises.splice(ei, 1); w[wi].days[di].exercises.forEach((x, i) => (x.order = i + 1)); });
  const moveExercise = (wi: number, di: number, ei: number, dir: -1 | 1) =>
    mut((w) => { const list = w[wi].days[di].exercises; const ni = ei + dir; if (ni < 0 || ni >= list.length) return; [list[ei], list[ni]] = [list[ni], list[ei]]; list.forEach((x, i) => (x.order = i + 1)); });
  const setExField = (wi: number, di: number, ei: number, field: keyof BExercise, value: string) =>
    mut((w) => { const ex = w[wi].days[di].exercises[ei] as unknown as Record<string, unknown>; ex[field] = field === "sets" || field === "restSeconds" ? Number(value) || 0 : value; });

  function save() {
    startSaving(async () => {
      const res = await onSave({ nameAr, nameEn, weeks });
      if (res.ok) { setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); router.refresh(); }
    });
  }

  function exerciseRow(wi: number, di: number, ex: BExercise, ei: number, total: number) {
    const media = ex.exercise ? mediaMap[ex.exercise] : undefined;
    return (
      <div key={ei} className="rounded-md border bg-muted/30 p-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-muted">
            <ExerciseMedia
              media={media ?? {}}
              alt={locale === "ar" ? ex.nameAr : ex.nameEn}
              className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
              iconClassName="h-5 w-5 text-muted-foreground/40"
            />
          </div>
          <span className="flex-1 truncate text-sm font-medium">{locale === "ar" ? ex.nameAr : ex.nameEn}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveExercise(wi, di, ei, -1)} disabled={ei === 0}><ChevronUp className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveExercise(wi, di, ei, 1)} disabled={ei === total - 1}><ChevronDown className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeExercise(wi, di, ei)}><Trash2 className="h-4 w-4" /></Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Field label={t.client.sets}><Input className="h-8" type="number" value={ex.sets} onChange={(e) => setExField(wi, di, ei, "sets", e.target.value)} /></Field>
          <Field label={t.client.reps}><Input className="h-8" value={ex.reps} onChange={(e) => setExField(wi, di, ei, "reps", e.target.value)} /></Field>
          <Field label={`${t.client.rest} (s)`}><Input className="h-8" type="number" value={ex.restSeconds} onChange={(e) => setExField(wi, di, ei, "restSeconds", e.target.value)} /></Field>
          <Field label="Tempo"><Input className="h-8" value={ex.tempo ?? ""} onChange={(e) => setExField(wi, di, ei, "tempo", e.target.value)} /></Field>
          <Field label={L("ملاحظات", "Notes")}><Input className="h-8" value={ex.notes ?? ""} onChange={(e) => setExField(wi, di, ei, "notes", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  const nameFields = (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {savedAt ? `${t.common.saved} ${savedAt}` : t.common.save}
      </Button>
    </div>
  );

  if (flat) {
    const days = weeks[0]?.days ?? [];
    const day = days[activeDay];
    return (
      <div>
        {nameFields}
        {subtitle && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}

        <div className="flex flex-wrap items-center gap-1.5">
          {days.map((d, di) => (
            <button
              key={di}
              type="button"
              onClick={() => setActiveDay(di)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                activeDay === di ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
              )}
            >
              {d.name[locale] || L(`اليوم ${di + 1}`, `Day ${di + 1}`)}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => { addDay(0); setActiveDay(days.length); }} className="gap-1.5">
            <Plus className="h-4 w-4" />{L("إضافة يوم", "Add day")}
          </Button>
        </div>
        {days.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{L("لا توجد أيام بعد — أضف اليوم الأول.", "No days yet — add the first one.")}</p>}

        {day && (
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <Input
                className="h-8 max-w-xs"
                value={day.name[locale]}
                onChange={(e) => mut((w) => { w[0].days[activeDay].name[locale] = e.target.value; })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => { removeDay(0, activeDay); setActiveDay((i) => Math.max(0, i - 1)); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.exercises.length === 0 && (
                <p className="text-sm text-muted-foreground">{L("لا توجد تمارين لهذا اليوم — أضف تمريناً من المكتبة بالأسفل.", "No exercises for this day yet — add one from the library below.")}</p>
              )}
              {day.exercises.map((ex, ei) => exerciseRow(0, activeDay, ex, ei, day.exercises.length))}
            </CardContent>
          </Card>
        )}

        {day && (
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{L("مكتبة التمارين", "Exercise library")}</h3>
            <ExerciseBrowserInline onPick={(ex) => addExercise(0, activeDay, ex)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {backHref && <Button asChild variant="ghost" size="sm" className="mb-3 -ms-2"><Link href={backHref}><BackArrow className="h-4 w-4" />{title}</Link></Button>}

      {nameFields}
      {subtitle && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}

      <div className="space-y-5">
        {weeks.map((week, wi) => (
          <Card key={wi}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{L(`الأسبوع ${week.weekNumber}`, `Week ${week.weekNumber}`)}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addDay(wi)}><Plus className="h-4 w-4" />{L("يوم", "Day")}</Button>
                {weeks.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeWeek(wi)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {week.days.length === 0 && <p className="text-sm text-muted-foreground">{L("لا توجد أيام — أضف يوماً.", "No days — add one.")}</p>}
              {week.days.map((day, di) => (
                <div key={di} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Input className="h-8 max-w-xs" value={day.name[locale]} onChange={(e) => mut((w) => { w[wi].days[di].name[locale] = e.target.value; })} />
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setPicker({ w: wi, d: di })}><Plus className="h-4 w-4" />{L("تمرين", "Exercise")}</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDay(wi, di)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {day.exercises.map((ex, ei) => exerciseRow(wi, di, ex, ei, day.exercises.length))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={addWeek} className="gap-2"><Plus className="h-4 w-4" />{L("إضافة أسبوع", "Add week")}</Button>
      </div>

      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onPick={(ex) => { if (picker) addExercise(picker.w, picker.d, ex); }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</div>;
}

const MUSCLE_FILTERS: { value: string; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "chest", ar: "صدر", en: "Chest" },
  { value: "back", ar: "ظهر", en: "Back" },
  { value: "shoulders", ar: "أكتاف", en: "Shoulders" },
  { value: "biceps", ar: "بايسبس", en: "Biceps" },
  { value: "triceps", ar: "ترايسبس", en: "Triceps" },
  { value: "legs", ar: "أرجل", en: "Legs" },
  { value: "abs", ar: "بطن", en: "Abs" },
  { value: "cardio", ar: "كارديو", en: "Cardio" },
];

/** Inline (no popup) exercise library with "system" / "mine" tabs, used in flat mode. */
function ExerciseBrowserInline({
  onPick,
}: {
  onPick: (ex: { id: string; nameAr: string; nameEn: string }) => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [tab, setTab] = useState<"system" | "mine">("system");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<ExercisePickerItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await searchExercisesAction(q, category, tab);
      if (res.ok) setResults(res.data!.items);
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q, category, tab]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-1.5">
          {(["system", "mine"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                tab === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
              )}
            >
              {v === "system" ? L("تمارين النظام", "System exercises") : L("مكتبتي", "My library")}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.dashboard.ui.search} className="ps-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_FILTERS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setCategory(m.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                category === m.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
              )}
            >
              {L(m.ar, m.en)}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></p>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.common.noResults}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((ex) => (
              <div key={ex.id} className="overflow-hidden rounded-lg border">
                <div className="relative aspect-video bg-muted">
                  <ExerciseMedia
                    media={{ imageUrlStart: ex.imageUrlStart, imageUrlEnd: ex.imageUrlEnd, gifUrl: ex.gifUrl }}
                    alt={locale === "ar" ? ex.nameAr : ex.nameEn}
                    className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
                    iconClassName="h-8 w-8 text-muted-foreground/40"
                  />
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="truncate text-sm font-medium">{locale === "ar" ? ex.nameAr : ex.nameEn}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline">{ex.category}</Badge>
                    {ex.targetMuscles && ex.targetMuscles.length > 0 && (
                      <span className="truncate text-xs text-muted-foreground">{ex.targetMuscles.join("، ")}</span>
                    )}
                  </div>
                  <Button size="sm" className="mt-1 w-full gap-1.5" onClick={() => onPick({ id: ex.id, nameAr: ex.nameAr, nameEn: ex.nameEn })}>
                    <Plus className="h-3.5 w-3.5" />{L("إضافة إلى اليوم", "Add to day")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ex: { id: string; nameAr: string; nameEn: string }) => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [tab, setTab] = useState<"system" | "mine">("system");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<ExercisePickerItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await searchExercisesAction(q, category, tab);
      if (res.ok) setResults(res.data!.items);
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q, category, tab, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{L("اختر تمريناً", "Pick an exercise")}</DialogTitle></DialogHeader>
        <div className="flex gap-1.5">
          {(["system", "mine"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                tab === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
              )}
            >
              {v === "system" ? L("تمارين النظام", "System exercises") : L("مكتبتي", "My library")}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.dashboard.ui.search} className="ps-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_FILTERS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setCategory(m.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                category === m.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
              )}
            >
              {L(m.ar, m.en)}
            </button>
          ))}
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.common.noResults}</p>
          ) : (
            results.map((ex) => (
              <button key={ex.id} onClick={() => { onPick({ id: ex.id, nameAr: ex.nameAr, nameEn: ex.nameEn }); onClose(); }} className={cn("flex w-full items-center gap-3 rounded-md border px-3 py-2 text-start transition-colors hover:bg-accent")}>
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  <ExerciseMedia
                    media={{ imageUrlStart: ex.imageUrlStart, imageUrlEnd: ex.imageUrlEnd, gifUrl: ex.gifUrl }}
                    alt={locale === "ar" ? ex.nameAr : ex.nameEn}
                    className="absolute inset-0 flex h-full w-full items-center justify-center"
                    iconClassName="h-5 w-5 text-muted-foreground/40"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{locale === "ar" ? ex.nameAr : ex.nameEn}</p>
                  {ex.targetMuscles && ex.targetMuscles.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">{ex.targetMuscles.join("، ")}</p>
                  )}
                </div>
                <Badge variant="outline">{ex.category}</Badge>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
