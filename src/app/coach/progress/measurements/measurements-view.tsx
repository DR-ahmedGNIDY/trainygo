"use client";

import { TrendingDown, TrendingUp, Ruler } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

export interface MRow {
  client: string;
  weight?: number;
  change: number;
  bodyFat?: number;
  date: string;
}

export function MeasurementsView({ rows }: { rows: MRow[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.measurements} description={L("أحدث قياسات عملائك.", "Your clients' latest measurements.")} />
      {rows.length === 0 ? (
        <EmptyState icon={Ruler} title={t.common.emptyTitle} description={L("ستظهر القياسات هنا عند تسجيلها من العملاء.", "Measurements appear here once clients log them.")} />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.ui.client}</TableHead>
                  <TableHead>{t.client.currentWeight}</TableHead>
                  <TableHead className="hidden sm:table-cell">{L("التغير", "Change")}</TableHead>
                  <TableHead className="hidden md:table-cell">{L("نسبة الدهون", "Body fat")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.common.date}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m, i) => {
                  const down = m.change <= 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{m.client}</TableCell>
                      <TableCell className="font-semibold">{m.weight != null ? `${m.weight} kg` : "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {m.change !== 0 && (
                          <span className={cn("flex items-center gap-1 text-sm font-medium", down ? "text-success" : "text-destructive")}>
                            {down ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}{Math.abs(m.change)} kg
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{m.bodyFat != null ? `${m.bodyFat}%` : "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell" dir="ltr">{new Date(m.date).toISOString().slice(0, 10)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
