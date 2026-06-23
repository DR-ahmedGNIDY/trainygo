"use client";

import { Apple, Flame, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ClientAdherence } from "@/lib/services/meal-logs";

export function NutritionProgressView({ rows }: { rows: ClientAdherence[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <div>
      <PageHeader
        title={L("متابعة غذائية", "Nutrition adherence")}
        description={L("نسبة التزام عملائك بالخطط الغذائية المُسندة.", "Your clients' adherence to their assigned nutrition plans.")}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Apple}
          title={t.common.emptyTitle}
          description={L("ستظهر متابعة عملائك الغذائية هنا بمجرد إسناد خطط لهم.", "Your clients' nutrition adherence will appear here once plans are assigned.")}
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.ui.client}</TableHead>
                  <TableHead>{L("نسبة الالتزام", "Adherence")}</TableHead>
                  <TableHead className="hidden sm:table-cell"><Flame className="inline h-4 w-4" /> {L("السعرات المستهدفة", "Target calories")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{L("السعرات المنفذة اليوم", "Calories today")}</TableHead>
                  <TableHead className="hidden md:table-cell"><CheckCircle2 className="inline h-4 w-4 text-success" /> {L("وجبات مكتملة", "Completed meals")}</TableHead>
                  <TableHead className="hidden md:table-cell"><XCircle className="inline h-4 w-4 text-destructive" /> {L("وجبات غير مكتملة", "Incomplete meals")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.clientId}>
                    <TableCell className="font-medium">{r.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={r.adherencePct >= 70 ? "success" : r.adherencePct >= 40 ? "warning" : "destructive"}>
                        {r.adherencePct}%
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{r.targetCalories}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.actualCaloriesToday}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.completedMealsToday} / {r.totalMealsPerDay}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.incompleteMealsToday}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
