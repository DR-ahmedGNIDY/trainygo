"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  MoreHorizontal,
  CreditCard,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/utils";
import {
  activateSubscriptionAction,
  setCoachStatusAction,
  suspendCoachSubscriptionAction,
  reactivateCoachSubscriptionAction,
  deleteCoachAction,
} from "@/lib/actions/admin";
import type { AccountStatus } from "@/lib/constants";

export interface CoachRow {
  id: string;
  name: string;
  email: string;
  brand?: string;
  planName?: string;
  clients: number;
  status: AccountStatus;
  endDate?: string | null;
  suspendedByAdmin?: boolean;
}
export interface PlanOption {
  id: string;
  name: string;
  price: number;
}

export function CoachesView({
  coaches,
  plans,
}: {
  coaches: CoachRow[];
  plans: PlanOption[];
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [activateFor, setActivateFor] = useState<CoachRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = coaches.filter((c) => {
    const q = query.toLowerCase();
    const mq = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const ms = status === "all" || c.status === status;
    return mq && ms;
  });

  function setStatusFor(id: string, s: AccountStatus) {
    startTransition(async () => { await setCoachStatusAction(id, s); router.refresh(); });
  }
  function suspendSubscription(id: string) {
    startTransition(async () => { await suspendCoachSubscriptionAction(id); router.refresh(); });
  }
  function reactivateSubscription(id: string) {
    startTransition(async () => { await reactivateCoachSubscriptionAction(id); router.refresh(); });
  }
  function remove(c: CoachRow) {
    if (!window.confirm(L(`حذف المدرب ${c.name} وكل بياناته؟`, `Delete coach ${c.name} and all their data?`))) return;
    startTransition(async () => { await deleteCoachAction(c.id); router.refresh(); });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.adminNav.coaches} description={`${coaches.length} ${t.dashboard.stats.totalCoaches}`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.dashboard.ui.search} className="ps-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder={t.dashboard.ui.filterByStatus} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="active">{t.account.active}</SelectItem>
            <SelectItem value="trial">{t.account.trial}</SelectItem>
            <SelectItem value="expired">{t.account.expired}</SelectItem>
            <SelectItem value="suspended">{t.account.suspended}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={t.common.noResults} description={t.common.emptyDescription} />
      ) : (
        <Card className={isPending ? "opacity-60" : ""}>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.name}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.common.email}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.dashboard.ui.plan}</TableHead>
                  <TableHead>{t.dashboard.stats.myClients}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-xs text-primary">{c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium">{c.name}</div>
                          {c.brand && <div className="text-xs text-muted-foreground">{c.brand}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell" dir="ltr">{c.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{c.planName ?? "—"}</TableCell>
                    <TableCell>{formatNumber(c.clients, locale)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setActivateFor(c)}><CreditCard className="h-4 w-4" />{L("تفعيل اشتراك", "Activate subscription")}</DropdownMenuItem>
                          {c.suspendedByAdmin ? (
                            <DropdownMenuItem onClick={() => reactivateSubscription(c.id)}><CheckCircle2 className="h-4 w-4" />{L("إعادة تفعيل الاشتراك", "Reactivate subscription")}</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => suspendSubscription(c.id)}><Ban className="h-4 w-4" />{L("إيقاف الاشتراك", "Suspend subscription")}</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {c.status === "suspended" ? (
                            <DropdownMenuItem onClick={() => setStatusFor(c.id, "active")}><CheckCircle2 className="h-4 w-4" />{L("رفع حظر الحساب", "Unblock account")}</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setStatusFor(c.id, "suspended")}><Ban className="h-4 w-4" />{L("حظر الحساب (منع تسجيل الدخول)", "Block account (prevent login)")}</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => remove(c)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ActivateDialog coach={activateFor} plans={plans} onClose={() => setActivateFor(null)} onDone={() => { setActivateFor(null); router.refresh(); }} />
    </div>
  );
}

function ActivateDialog({
  coach,
  plans,
  onClose,
  onDone,
}: {
  coach: CoachRow | null;
  plans: PlanOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [planId, setPlanId] = useState("");
  const [months, setMonths] = useState("1");
  const [method, setMethod] = useState("");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!coach || !planId) return;
    setSaving(true);
    await activateSubscriptionAction(coach.id, {
      planId,
      months: Number(months),
      paymentMethod: (method as "vodafone_cash" | "instapay") || undefined,
      paymentReference: ref || undefined,
    });
    setSaving(false);
    setPlanId(""); setMethod(""); setRef("");
    onDone();
  }

  return (
    <Dialog open={!!coach} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{L("تفعيل اشتراك", "Activate subscription")} — {coach?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.dashboard.ui.plan}</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder={L("اختر باقة", "Select a plan")} /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {formatNumber(p.price, locale)} {L("ج.م", "EGP")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{L("المدة", "Duration")}</Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{L("شهر", "1 month")}</SelectItem>
                  <SelectItem value="3">{L("٣ أشهر", "3 months")}</SelectItem>
                  <SelectItem value="6">{L("٦ أشهر", "6 months")}</SelectItem>
                  <SelectItem value="12">{L("١٢ شهر", "12 months")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{L("طريقة الدفع", "Payment method")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder={L("اختر", "Select")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vodafone_cash">{L("فودافون كاش", "Vodafone Cash")}</SelectItem>
                  <SelectItem value="instapay">InstaPay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{L("مرجع الدفع", "Payment reference")}</Label>
            <Input dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={L("رقم العملية / الهاتف", "Transaction id / phone")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !planId}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{L("تفعيل", "Activate")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
