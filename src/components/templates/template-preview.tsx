"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Loader2, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { OfficialTemplateBadge } from "./template-filters";
import { mealDisplayName } from "@/lib/i18n/labels";
import type { ActionResult } from "@/lib/actions/result";
import type { MealType } from "@/lib/constants";

/**
 * Read-only view of a GLOBAL template for a coach.
 *
 * Global templates are authored by the super admin and must never be edited in
 * place by a coach, so this deliberately renders a summary instead of the
 * builder — the builder has no read-only mode, and reusing it would put save
 * controls in front of a template the server would reject anyway. The coach's
 * path to editing is "Duplicate", which yields a template they own.
 */

interface PreviewShellProps {
  backHref: string;
  title: string;
  nameAr: string;
  nameEn: string;
  onDuplicate: () => Promise<ActionResult>;
  duplicateHref: string;
  children: React.ReactNode;
}

function PreviewShell({
  backHref,
  title,
  nameAr,
  nameEn,
  onDuplicate,
  duplicateHref,
  children,
}: PreviewShellProps) {
  const { locale } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  function duplicate() {
    startTransition(async () => {
      const res = await onDuplicate();
      // Land the coach on their own list, where the new editable copy now sits.
      if (res.ok) router.push(duplicateHref);
    });
  }

  return (
    <div>
      <PageHeader title={locale === "ar" ? nameAr : nameEn} description={title}>
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            {L("رجوع", "Back")}
          </Link>
        </Button>
        <Button onClick={duplicate} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          {L("نسخ للتعديل", "Duplicate to edit")}
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <OfficialTemplateBadge />
        <p className="text-sm text-muted-foreground">
          {L(
            "هذا قالب رسمي من FITXNET — للقراءة فقط. انسخه لتحصل على نسخة خاصة بك يمكنك تعديلها.",
            "This is an official FITXNET template — read only. Duplicate it to get your own editable copy.",
          )}
        </p>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}

export interface PreviewWeek {
  weekNumber: number;
  name?: { ar?: string; en?: string };
  days: {
    name: { ar: string; en: string };
    dayNumber: number;
    exercises: { nameAr: string; nameEn: string; sets: number; reps: string }[];
  }[];
}

export function WorkoutTemplatePreview({
  weeks,
  ...shell
}: Omit<PreviewShellProps, "children"> & { weeks: PreviewWeek[] }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <PreviewShell {...shell}>
      {weeks.map((week) => (
        <Card key={week.weekNumber}>
          <CardHeader>
            <CardTitle className="text-base">
              {week.name?.[locale] || `${L("الأسبوع", "Week")} ${week.weekNumber}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {week.days.length === 0 && (
              <p className="text-sm text-muted-foreground">{L("لا توجد أيام.", "No days.")}</p>
            )}
            {week.days.map((day) => (
              <div key={day.dayNumber} className="rounded-md border bg-muted/30 p-3">
                <p className="mb-2 font-medium">{day.name[locale]}</p>
                {day.exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{L("لا توجد تمارين.", "No exercises.")}</p>
                ) : (
                  <ul className="space-y-1">
                    {day.exercises.map((ex, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{locale === "ar" ? ex.nameAr : ex.nameEn}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {ex.sets} × {ex.reps}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </PreviewShell>
  );
}

export interface PreviewMeal {
  type: MealType;
  name?: { ar?: string; en?: string };
  items: { nameAr: string; nameEn: string; quantity: number; calories: number }[];
}

export function NutritionTemplatePreview({
  meals,
  ...shell
}: Omit<PreviewShellProps, "children"> & { meals: PreviewMeal[] }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <PreviewShell {...shell}>
      {meals.map((meal, mi) => (
        <Card key={mi}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              {mealDisplayName(meal, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meal.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{L("لا توجد أطعمة.", "No foods.")}</p>
            ) : (
              <ul className="space-y-1">
                {meal.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{locale === "ar" ? it.nameAr : it.nameEn}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {it.quantity}g · {it.calories} {L("سعر", "kcal")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </PreviewShell>
  );
}
