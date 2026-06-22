"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Moon, Droplets, Zap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { reviewResponseAction } from "@/lib/actions/checkins";

export interface CheckinRow {
  id: string;
  clientName: string;
  date: string;
  sleep?: string;
  water?: string;
  energy?: string;
  reviewed: boolean;
}

export function CheckinsView({
  rows,
  pending,
  canWrite,
}: {
  rows: CheckinRow[];
  pending: number;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function review(id: string) {
    startTransition(async () => { await reviewResponseAction(id); router.refresh(); });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.checkins} description={`${pending} ${t.dashboard.stats.pendingCheckins}`} />

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t.common.emptyTitle} description={L("ستظهر متابعات عملائك هنا عند إرسالها.", "Your clients' check-ins will appear here once submitted.")} />
      ) : (
        <Card className={isPending ? "opacity-60" : ""}>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.ui.client}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.common.date}</TableHead>
                  <TableHead className="hidden md:table-cell"><Moon className="inline h-4 w-4" /> {L("نوم", "Sleep")}</TableHead>
                  <TableHead className="hidden md:table-cell"><Droplets className="inline h-4 w-4" /> {L("ماء", "Water")}</TableHead>
                  <TableHead className="hidden lg:table-cell"><Zap className="inline h-4 w-4" /> {L("طاقة", "Energy")}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.clientName}</TableCell>
                    <TableCell className="hidden sm:table-cell" dir="ltr">{c.date}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.sleep ?? "—"}{c.sleep ? "h" : ""}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.water ?? "—"}{c.water ? "L" : ""}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.energy ? `${c.energy}/10` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.reviewed ? "success" : "warning"}>
                        {c.reviewed ? L("تمت المراجعة", "Reviewed") : L("معلّق", "Pending")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!c.reviewed && canWrite && (
                        <Button size="sm" variant="outline" onClick={() => review(c.id)}>
                          <ClipboardCheck className="h-4 w-4" />
                          {L("مراجعة", "Review")}
                        </Button>
                      )}
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
