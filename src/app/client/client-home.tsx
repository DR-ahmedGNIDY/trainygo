"use client";

import Link from "next/link";
import { Scale, TrendingDown, Flame, Dumbbell, UtensilsCrossed, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { LineTrend } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

interface HomeData {
  currentWeight: number | null;
  weightChange: number | null;
  streak: number;
  planCalories: number | null;
  todayWorkout: { name: string; exercises: { name: string; sets: number; reps: string }[] } | null;
  todayMeals: { name: string; kcal: number }[] | null;
  weightSeries: { label: string; value: number }[];
}

export function ClientHome({ data }: { data: HomeData }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <div>
      <PageHeader title={t.dashboard.clientNav.home} description={t.dashboard.overview} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.client.currentWeight} value={data.currentWeight != null ? `${data.currentWeight} kg` : "—"} icon={Scale} accent="success" />
        <StatCard label={L("التغير", "Change")} value={data.weightChange != null ? `${data.weightChange > 0 ? "+" : ""}${data.weightChange} kg` : "—"} icon={TrendingDown} />
        <StatCard label={t.client.streak} value={data.streak} icon={Flame} accent="warning" />
        <StatCard label={t.client.calories} value={data.planCalories != null ? data.planCalories : "—"} icon={Flame} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Dumbbell className="h-4 w-4 text-primary" />{t.client.todayWorkout}</CardTitle>
            <Button asChild size="sm" variant="outline"><Link href="/client/workout">{t.client.logWeights}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {!data.todayWorkout ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.client.noWorkoutToday}</p>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium text-muted-foreground">{data.todayWorkout.name}</p>
                {data.todayWorkout.exercises.slice(0, 5).map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">{ex.sets} {t.client.sets} × {ex.reps} {t.client.reps}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t.client.weightTrend}</CardTitle></CardHeader>
          <CardContent>
            {data.weightSeries.length > 1 ? <LineTrend data={data.weightSeries} xKey="label" yKey="value" height={200} /> : <p className="py-10 text-center text-sm text-muted-foreground">{L("لا توجد بيانات", "No data")}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><UtensilsCrossed className="h-4 w-4 text-primary" />{t.client.todayMeals}</CardTitle>
          <Button asChild size="sm" variant="outline"><Link href="/client/nutrition">{t.dashboard.clientNav.nutrition}</Link></Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {!data.todayMeals || data.todayMeals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.client.noMealsToday}</p>
          ) : (
            data.todayMeals.map((m, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                <span className="flex-1 text-sm font-medium">{m.name}</span>
                <span className="text-sm text-muted-foreground">{m.kcal} {t.client.calories}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
