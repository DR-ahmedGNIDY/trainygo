"use client";

import Link from "next/link";
import { ClipboardList, Clock } from "lucide-react";
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

export interface ReportRow {
  id: string;
  clientName: string;
  dayNameAr: string;
  dayNameEn: string;
  date: string;
  durationSeconds: number;
  completedCount: number;
  deferredCount: number;
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutReportsView({ rows }: { rows: ReportRow[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <div>
      <PageHeader
        title={L("تقارير التمارين", "Workout reports")}
        description={L("جلسات التمارين التي أرسلها عملاؤك بعد الانتهاء.", "Workout sessions your clients sent after finishing.")}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t.common.emptyTitle}
          description={L("ستظهر تقارير جلسات عملائك هنا عند إرسالها.", "Your clients' session reports will appear here once submitted.")}
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.ui.client}</TableHead>
                  <TableHead>{L("اليوم", "Day")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.common.date}</TableHead>
                  <TableHead className="hidden md:table-cell"><Clock className="inline h-4 w-4" /> {L("المدة", "Duration")}</TableHead>
                  <TableHead>{L("مكتمل/مؤجل", "Done/Deferred")}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.clientName}</TableCell>
                    <TableCell>{locale === "ar" ? r.dayNameAr : r.dayNameEn}</TableCell>
                    <TableCell className="hidden sm:table-cell" dir="ltr">{r.date}</TableCell>
                    <TableCell className="hidden md:table-cell" dir="ltr">{formatDuration(r.durationSeconds)}</TableCell>
                    <TableCell>
                      <Badge variant="success">{r.completedCount}</Badge>{" "}
                      {r.deferredCount > 0 && <Badge variant="warning">{r.deferredCount}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Link href={`/coach/workout-reports/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                        {t.common.view}
                      </Link>
                    </TableCell>
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
