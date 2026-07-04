"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, CheckCircle2, Circle, Repeat, Flame, Apple, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { MEAL_LABELS, label } from "@/lib/i18n/labels";
import { setMealDoneAction } from "@/lib/actions/client";

interface Item {
  nameAr: string;
  nameEn: string;
  quantity: number;
  calories: number;
  substitutes: { nameAr: string; nameEn: string }[];
}
interface Meal { type: string; name?: { ar?: string; en?: string }; items: Item[] }
interface Totals { calories: number; protein: number; carbs: number; fat: number }

export function NutritionView({
  plan,
  doneToday,
}: {
  plan: { id: string; name: string; meals: Meal[]; totals: Totals } | null;
  doneToday: number[];
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [done, setDone] = useState<Set<number>>(new Set(doneToday));
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  if (!plan) {
    return (
      <div>
        <PageHeader title={t.dashboard.clientNav.nutrition} />
        <EmptyState icon={Apple} title={L("لا توجد خطة تغذية بعد", "No nutrition plan yet")} description={L("ستظهر خطتك هنا بمجرد أن ينشئها مدربك.", "Your plan will appear here once your coach creates it.")} />
      </div>
    );
  }

  function toggle(mi: number) {
    const willBeDone = !done.has(mi);
    setDone((d) => {
      const next = new Set(d);
      if (willBeDone) next.add(mi);
      else next.delete(mi);
      return next;
    });
    setPendingIndex(mi);
    startTransition(async () => {
      await setMealDoneAction(plan!.id, mi, willBeDone);
      setPendingIndex(null);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.clientNav.nutrition} description={plan.name} />

      <Card className="mb-6">
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: t.client.calories, v: plan.totals.calories, icon: true },
            { l: t.client.protein, v: `${plan.totals.protein}g` },
            { l: t.client.carbs, v: `${plan.totals.carbs}g` },
            { l: t.client.fat, v: `${plan.totals.fat}g` },
          ].map((m) => (
            <div key={m.l}>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">{m.icon && <Flame className="h-3.5 w-3.5 text-primary" />}{m.l}</p>
              <p className="text-2xl font-bold">{m.v}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {plan.meals.map((meal, mi) => {
          if (meal.items.length === 0) return null;
          const isDone = done.has(mi);
          const isPending = pendingIndex === mi;
          return (
            <Card key={mi} className={isDone ? "border-success/40" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base"><UtensilsCrossed className="h-4 w-4 text-primary" />{(locale === "ar" ? meal.name?.ar : meal.name?.en) || label(MEAL_LABELS, meal.type, locale)}</CardTitle>
                <Button variant={isDone ? "default" : "outline"} size="sm" onClick={() => toggle(mi)} disabled={isPending} className="gap-1.5">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  <span className="hidden sm:inline">{t.client.markMealDone}</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {meal.items.map((item, ii) => (
                  <div key={ii} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{locale === "ar" ? item.nameAr : item.nameEn}</p>
                      {item.substitutes.map((s, si) => (
                        <p key={si} className="flex items-center gap-1 text-xs text-primary"><Repeat className="h-3 w-3" />{L("بديل:", "Sub:")} {locale === "ar" ? s.nameAr : s.nameEn}</p>
                      ))}
                    </div>
                    <div className="text-end">
                      <p className="text-sm text-muted-foreground">{item.quantity}g</p>
                      <p className="text-xs text-muted-foreground">{item.calories} {t.client.calories}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
