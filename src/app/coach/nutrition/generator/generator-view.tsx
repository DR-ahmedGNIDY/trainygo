"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  Flame,
  Save,
  History,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  MEAL_LABELS,
  GENERATOR_GOAL_LABELS,
  FOOD_PRIORITY_STARS,
  label,
} from "@/lib/i18n/labels";
import {
  GENERATOR_CALORIE_OPTIONS,
  GENERATOR_GOALS,
  GENERATOR_MEALS_OPTIONS,
  type FoodPriority,
  type GeneratorGoal,
} from "@/lib/constants";
import { DEFAULT_RATIOS, TOLERANCE } from "@/lib/generator/config";
import type { EngineFood } from "@/lib/generator/types";
import { buildFoodSwapOptions, type FoodSwapOption } from "@/lib/swap/food";
import {
  generateNutritionAction,
  getSwapPoolAction,
  saveGeneratedTemplateAction,
} from "@/lib/actions/nutrition-generator";

interface GItem {
  food?: string | null;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
interface GMeal {
  type: string;
  items: GItem[];
}
interface GPlan {
  meals: GMeal[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  target: { calories: number; protein: number; carbs: number; fat: number };
  ratio: { protein: number; carbs: number; fat: number };
  withinTolerance: boolean;
}

export interface HistoryEntry {
  id: string;
  calories: number;
  goal: string;
  mealsPerDay: number;
  ratio: { protein: number; carbs: number; fat: number };
  seed: number;
  meals: GMeal[];
  summary: { calories: number; protein: number; carbs: number; fat: number };
  withinTolerance: boolean;
  createdAt: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Every food id the plan uses — the repetition rule's input. */
function planFoodIds(plan: GPlan): string[] {
  return plan.meals.flatMap((m) => m.items.map((it) => it.food ?? "").filter(Boolean));
}

/**
 * Recompute the day totals from the items after a swap. A swap only ever
 * touches one item, so the plan is rebuilt from what's on screen rather than
 * regenerated — target and ratio are untouched by definition.
 */
function withRecomputedTotals(plan: GPlan): GPlan {
  const totals = plan.meals.reduce(
    (acc, m) => {
      for (const it of m.items) {
        acc.calories += it.calories;
        acc.protein += it.protein;
        acc.carbs += it.carbs;
        acc.fat += it.fat;
        acc.fiber += it.fiber;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const rounded = {
    calories: r1(totals.calories),
    protein: r1(totals.protein),
    carbs: r1(totals.carbs),
    fat: r1(totals.fat),
    fiber: r1(totals.fiber),
  };
  const ok = (got: number, want: number) =>
    want <= 0 ? true : Math.abs(got - want) / want <= TOLERANCE;
  return {
    ...plan,
    totals: rounded,
    withinTolerance:
      ok(rounded.calories, plan.target.calories) &&
      ok(rounded.protein, plan.target.protein) &&
      ok(rounded.carbs, plan.target.carbs) &&
      ok(rounded.fat, plan.target.fat),
  };
}

export function NutritionGeneratorView({
  history,
  canWrite,
}: {
  history: HistoryEntry[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();

  const [calories, setCalories] = useState(2000);
  const [goal, setGoal] = useState<GeneratorGoal>("balanced");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [pPct, setPPct] = useState("");
  const [cPct, setCPct] = useState("");
  const [fPct, setFPct] = useState("");
  const [seed, setSeed] = useState(0);

  const [plan, setPlan] = useState<GPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [saveOpen, setSaveOpen] = useState(false);

  // Swap state. The pool arrives once with the plan (or once per reopened
  // history entry) and every swap is computed from it in the browser — clicking
  // "استبدال" never hits the server. `past` is the undo stack.
  const [swapPool, setSwapPool] = useState<EngineFood[]>([]);
  const [past, setPast] = useState<GPlan[]>([]);

  const defRatio = DEFAULT_RATIOS[goal];
  const customRatio = useMemo(() => {
    const p = Number(pPct);
    const c = Number(cPct);
    const f = Number(fPct);
    if (pPct && cPct && fPct && p > 0 && c > 0 && f > 0) return { protein: p, carbs: c, fat: f };
    return undefined;
  }, [pPct, cPct, fPct]);

  function run(nextSeed: number) {
    setError(null);
    startGenerating(async () => {
      const res = await generateNutritionAction({
        calories,
        goal,
        mealsPerDay,
        ratio: customRatio,
        seed: nextSeed,
      });
      if (res.ok && res.data) {
        setPlan(res.data.plan as GPlan);
        setSwapPool(res.data.swapPool as EngineFood[]);
        setPast([]);
        setSeed(nextSeed);
      } else if (!res.ok) {
        setError(res.error);
        setPlan(null);
        setSwapPool([]);
        setPast([]);
      }
    });
  }

  function reopen(h: HistoryEntry) {
    setCalories(h.calories);
    setGoal(h.goal as GeneratorGoal);
    setMealsPerDay(h.mealsPerDay);
    setSeed(h.seed);
    setPPct("");
    setCPct("");
    setFPct("");
    setError(null);
    const target = {
      calories: h.calories,
      protein: r1((h.calories * h.ratio.protein) / 100 / 4),
      carbs: r1((h.calories * h.ratio.carbs) / 100 / 4),
      fat: r1((h.calories * h.ratio.fat) / 100 / 9),
    };
    const totals = { ...h.summary, fiber: 0 };
    const reopened: GPlan = {
      meals: h.meals,
      totals,
      target,
      ratio: h.ratio,
      withinTolerance: h.withinTolerance,
    };
    setPlan(reopened);
    setPast([]);
    // A history entry stores only the plan, so fetch its swap pool once here
    // rather than on every swap click.
    setSwapPool([]);
    startGenerating(async () => {
      const res = await getSwapPoolAction({
        goal: h.goal as GeneratorGoal,
        foodIds: planFoodIds(reopened),
      });
      if (res.ok && res.data) setSwapPool(res.data.swapPool as EngineFood[]);
    });
  }

  /** Replace one item in place; meal and day totals follow, nothing regenerates. */
  const applySwap = useCallback(
    (mealIndex: number, itemIndex: number, option: FoodSwapOption) => {
      if (!plan) return;
      const meals = plan.meals.map((meal, mi) =>
        mi !== mealIndex
          ? meal
          : {
              ...meal,
              items: meal.items.map((it, ii) =>
                ii !== itemIndex
                  ? it
                  : {
                      ...it,
                      food: option.id,
                      nameAr: option.nameAr,
                      nameEn: option.nameEn,
                      quantity: option.quantity,
                      calories: option.calories,
                      protein: option.protein,
                      carbs: option.carbs,
                      fat: option.fat,
                      fiber: option.fiber,
                    },
              ),
            },
      );
      setPast((stack) => [...stack, plan]);
      setPlan(withRecomputedTotals({ ...plan, meals }));
    },
    [plan],
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setPlan(past[past.length - 1]);
    setPast((stack) => stack.slice(0, -1));
  }, [past]);

  return (
    <div>
      <PageHeader
        title={t.dashboard.coachNav.nutritionGenerator}
        description={L(
          "ولّد قوالب غذائية كاملة من مكتبة أطعمتك — قابلة للتعديل بالكامل بعد التوليد.",
          "Generate complete nutrition templates from your own food library — fully editable after generation.",
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: inputs + result */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {L("إعدادات التوليد", "Generation settings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{L("السعرات", "Calories")}</Label>
                  <Select value={String(calories)} onValueChange={(v) => setCalories(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENERATOR_CALORIE_OPTIONS.map((c) => (
                        <SelectItem key={c} value={String(c)}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{L("الهدف", "Goal")}</Label>
                  <Select value={goal} onValueChange={(v) => setGoal(v as GeneratorGoal)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENERATOR_GOALS.map((ggoal) => (
                        <SelectItem key={ggoal} value={ggoal}>{label(GENERATOR_GOAL_LABELS, ggoal, locale)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{L("عدد الوجبات", "Meals per day")}</Label>
                  <Select value={String(mealsPerDay)} onValueChange={(v) => setMealsPerDay(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENERATOR_MEALS_OPTIONS.map((m) => (
                        <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {L("نسب الماكروز (اختياري) — اتركها فارغة لاستخدام الافتراضي", "Macro ratios (optional) — leave empty to use defaults")}
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{L("بروتين %", "Protein %")}</Label>
                    <Input type="number" placeholder={String(defRatio.protein)} value={pPct} onChange={(e) => setPPct(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{L("كارب %", "Carbs %")}</Label>
                    <Input type="number" placeholder={String(defRatio.carbs)} value={cPct} onChange={(e) => setCPct(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{L("دهون %", "Fat %")}</Label>
                    <Input type="number" placeholder={String(defRatio.fat)} value={fPct} onChange={(e) => setFPct(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => run(0)} disabled={generating || !canWrite} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {L("توليد القالب", "Generate template")}
                </Button>
                {plan && (
                  <Button variant="outline" onClick={() => run(seed + 1)} disabled={generating || !canWrite} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {L("إعادة التوليد", "Regenerate")}
                  </Button>
                )}
                {plan && (
                  <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={!canWrite} className="gap-2">
                    <Save className="h-4 w-4" />
                    {L("حفظ كقالب", "Save as template")}
                  </Button>
                )}
              </div>
              {!canWrite && (
                <p className="text-xs text-destructive">{L("اشتراكك منتهٍ — التوليد غير متاح.", "Your subscription has expired — generation is disabled.")}</p>
              )}
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive/50">
              <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </CardContent>
            </Card>
          )}

          {plan && (
            <PlanResult
              plan={plan}
              swapPool={swapPool}
              canSwap={canWrite}
              canUndo={past.length > 0}
              onUndo={undo}
              onSwap={applySwap}
            />
          )}
        </div>

        {/* Right: history */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                {L("آخر التوليدات", "Recent generations")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{L("لا يوجد سجل بعد.", "No history yet.")}</p>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => reopen(h)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-start transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {h.calories} {t.client.calories} · {label(GENERATOR_GOAL_LABELS, h.goal, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.mealsPerDay} {L("وجبات", "meals")} · {new Date(h.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
                      </p>
                    </div>
                    {h.withinTolerance ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {plan && (
        <SaveDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          plan={plan}
          onSaved={(id) => router.push(`/coach/nutrition/templates/${id}`)}
        />
      )}
    </div>
  );
}

function PlanResult({
  plan,
  swapPool,
  canSwap,
  canUndo,
  onUndo,
  onSwap,
}: {
  plan: GPlan;
  swapPool: EngineFood[];
  canSwap: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onSwap: (mealIndex: number, itemIndex: number, option: FoodSwapOption) => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [swapping, setSwapping] = useState<{ mealIndex: number; itemIndex: number } | null>(null);

  const tol = (got: number, want: number) => (want <= 0 ? true : Math.abs(got - want) / want <= 0.03);

  const poolById = useMemo(
    () => new Map(swapPool.map((f) => [f.id, f])),
    [swapPool],
  );

  /**
   * Candidates for every item, computed once per plan/pool rather than per
   * click. Each item's own food is excluded from `usedElsewhere` so a food used
   * only here isn't penalised as a repeat of itself.
   */
  const optionsByItem = useMemo(() => {
    const map = new Map<string, FoodSwapOption[]>();
    if (swapPool.length === 0) return map;
    const allIds = planFoodIds(plan);
    plan.meals.forEach((meal, mi) => {
      meal.items.forEach((it, ii) => {
        const current = it.food ? poolById.get(it.food) : undefined;
        if (!current) return;
        const usedElsewhere = new Set(allIds);
        usedElsewhere.delete(current.id);
        map.set(
          `${mi}:${ii}`,
          buildFoodSwapOptions({
            current,
            quantity: it.quantity,
            pool: swapPool,
            usedElsewhere,
          }),
        );
      });
    });
    return map;
  }, [plan, swapPool, poolById]);

  const active = swapping ? plan.meals[swapping.mealIndex]?.items[swapping.itemIndex] : null;

  const summaryRows = [
    { key: "calories", l: t.client.calories, got: plan.totals.calories, want: plan.target.calories, suffix: "" },
    { key: "protein", l: t.client.protein, got: plan.totals.protein, want: plan.target.protein, suffix: "g" },
    { key: "carbs", l: t.client.carbs, got: plan.totals.carbs, want: plan.target.carbs, suffix: "g" },
    { key: "fat", l: t.client.fat, got: plan.totals.fat, want: plan.target.fat, suffix: "g" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{L("الملخص", "Summary")}</CardTitle>
            <div className="flex items-center gap-2">
              {canUndo && (
                <Button variant="ghost" size="sm" onClick={onUndo} className="h-7 gap-1 px-2">
                  <Undo2 className="h-3.5 w-3.5" />
                  {L("تراجع", "Undo")}
                </Button>
              )}
              {plan.withinTolerance ? (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                  <CheckCircle2 className="h-3.5 w-3.5" />{L("ضمن الهدف ±٣٪", "On target ±3%")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />{L("قريب من الهدف — يمكن التعديل", "Close — adjust after saving")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryRows.map((row) => (
            <div key={row.key}>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                {row.key === "calories" && <Flame className="h-3.5 w-3.5 text-primary" />}{row.l}
              </p>
              <p className="text-2xl font-bold">{r1(row.got)}{row.suffix}</p>
              <p className={`text-xs ${tol(row.got, row.want) ? "text-muted-foreground" : "text-amber-600"}`}>
                {L("الهدف", "target")} {r1(row.want)}{row.suffix}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {plan.meals.map((meal, mi) => {
        const mt = meal.items.reduce(
          (a, it) => ({ calories: a.calories + it.calories, protein: a.protein + it.protein, carbs: a.carbs + it.carbs, fat: a.fat + it.fat }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );
        return (
          <Card key={mi}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                {label(MEAL_LABELS, meal.type, locale)}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {r1(mt.calories)} {t.client.calories} · {t.client.protein} {r1(mt.protein)}g · {t.client.carbs} {r1(mt.carbs)}g · {t.client.fat} {r1(mt.fat)}g
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {meal.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{L("لا توجد أطعمة مناسبة لهذه الوجبة.", "No suitable foods for this meal.")}</p>
              ) : (
                meal.items.map((it, ii) => {
                  const options = optionsByItem.get(`${mi}:${ii}`) ?? [];
                  return (
                    <div key={ii} className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{locale === "ar" ? it.nameAr : it.nameEn}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {it.calories} {t.client.calories} · {t.client.protein} {it.protein}g · {t.client.carbs} {it.carbs}g · {t.client.fat} {it.fat}g
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{it.quantity} g</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2"
                          disabled={!canSwap || options.length === 0}
                          title={
                            options.length === 0
                              ? L("لا توجد بدائل في نفس التصنيف.", "No alternatives in the same category.")
                              : undefined
                          }
                          onClick={() => setSwapping({ mealIndex: mi, itemIndex: ii })}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {L("استبدال", "Swap")}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      <SwapDialog
        open={swapping !== null}
        onOpenChange={(v) => !v && setSwapping(null)}
        currentName={active ? (locale === "ar" ? active.nameAr : active.nameEn) : ""}
        currentQuantity={active?.quantity ?? 0}
        options={swapping ? optionsByItem.get(`${swapping.mealIndex}:${swapping.itemIndex}`) ?? [] : []}
        onChoose={(option) => {
          if (!swapping) return;
          onSwap(swapping.mealIndex, swapping.itemIndex, option);
          setSwapping(null);
        }}
      />
    </div>
  );
}

/**
 * Replacement picker. Options are already ranked and scaled by the swap engine,
 * so this only renders them — choosing is a single click with no recalculation.
 */
function SwapDialog({
  open,
  onOpenChange,
  currentName,
  currentQuantity,
  options,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentName: string;
  currentQuantity: number;
  options: FoodSwapOption[];
  onChoose: (option: FoodSwapOption) => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            {L("استبدال", "Swap")} — {currentName} {currentQuantity}g
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {L(
            "بدائل من نفس التصنيف، بجرامات محسوبة تلقائياً للحفاظ على نفس السعرات والماكروز.",
            "Alternatives from the same category, with grams calculated automatically to keep the same calories and macros.",
          )}
        </p>
        <div className="space-y-2">
          {options.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {L("لا توجد بدائل متاحة.", "No alternatives available.")}
            </p>
          ) : (
            options.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{locale === "ar" ? o.nameAr : o.nameEn}</p>
                    <span className="shrink-0 text-xs text-amber-500" title={String(o.priority)}>
                      {FOOD_PRIORITY_STARS[o.priority as FoodPriority]}
                    </span>
                  </div>
                  <p className="text-xs font-medium">{o.quantity} g</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.calories} {t.client.calories} · {t.client.protein} {o.protein}g · {t.client.carbs} {o.carbs}g · {t.client.fat} {o.fat}g
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {o.withinTolerance ? (
                      <Badge className="gap-1 bg-emerald-500/15 text-[10px] text-emerald-600 hover:bg-emerald-500/15">
                        <CheckCircle2 className="h-3 w-3" />{L("مطابق ±٥٪", "Match ±5%")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-[10px] text-amber-600">
                        <AlertTriangle className="h-3 w-3" />{L("فرق أكبر من ٥٪", "Off by more than 5%")}
                      </Badge>
                    )}
                    {o.usedElsewhere && (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        {L("مستخدم في وجبة أخرى", "Used in another meal")}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => onChoose(o)}>
                  {L("اختيار", "Choose")}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SaveDialog({
  open,
  onOpenChange,
  plan,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: GPlan;
  onSaved: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const meals = plan.meals.map((m) => ({
      type: m.type,
      items: m.items.map((it) => ({
        food: it.food ?? null,
        nameAr: it.nameAr,
        nameEn: it.nameEn,
        quantity: it.quantity,
        unit: it.unit,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        fiber: it.fiber,
        substitutes: [],
      })),
    }));
    const res = await saveGeneratedTemplateAction({
      nameAr,
      nameEn,
      targetCalories: Math.round(plan.target.calories),
      meals,
    });
    setSaving(false);
    if (res.ok && res.data) onSaved(res.data.id);
    else if (!res.ok) setErr(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{L("حفظ كقالب غذائي", "Save as nutrition template")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">{L("سيتم فتح القالب للتعديل بعد الحفظ.", "The template opens for editing after saving.")}</p>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !nameAr || !nameEn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
