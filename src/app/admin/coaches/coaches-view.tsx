"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { formatNumber, formatFullDateTime } from "@/lib/utils";
import { formatRemaining } from "@/components/dashboard/subscription-countdown";
import {
  activateSubscriptionAction,
  setCoachStatusAction,
  suspendCoachSubscriptionAction,
  reactivateCoachSubscriptionAction,
  deleteCoachAction,
  setCoachBrandingAccessAction,
} from "@/lib/actions/admin";
import { Palette } from "lucide-react";
import type { AccountStatus } from "@/lib/constants";

export interface CoachRow {
  id: string;
  name: string;
  email: string;
  brand?: string;
  planName?: string;
  clients: number;
  status: AccountStatus;
  startDate?: string | null;
  endDate?: string | null;
  suspendedByAdmin?: boolean;
  academyName?: string;
  hasBranding?: boolean;
  logoUrl?: string;
  /** Effective branding access: "plan" = granted by plan, "manual" = manually force-enabled, false = disabled. */
  brandingAccess?: "plan" | "manual" | false;
  /** Raw featureOverrides.branding: true=force-on, false=force-off, null=use plan. */
  brandingOverride?: boolean | null;
}
export interface PlanOption {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
}

/** "شهر" for a 1-month plan, "٣ أشهر" for a 3-month quarterly plan, etc. — read directly from plan.durationMonths. */
function planDurationLabel(durationMonths: number, locale: "ar" | "en"): string {
  if (locale === "en") return durationMonths === 1 ? "1 month" : `${durationMonths} months`;
  if (durationMonths === 1) return "شهر";
  if (durationMonths === 2) return "شهرين";
  return `${durationMonths} أشهر`;
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
  const [brandingFilter, setBrandingFilter] = useState("all");
  const [activateFor, setActivateFor] = useState<CoachRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = coaches.filter((c) => {
    const q = query.toLowerCase();
    const mq = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const ms = status === "all" || c.status === status;
    const mb =
      brandingFilter === "all" ||
      (brandingFilter === "branded" ? Boolean(c.hasBranding) : !c.hasBranding);
    return mq && ms && mb;
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
  function toggleBranding(c: CoachRow) {
    // Cycle: null (plan) → true (force-on) → false (force-off) → null (plan)
    const next: boolean | null =
      c.brandingOverride === null || c.brandingOverride === undefined ? true
      : c.brandingOverride === true ? false
      : null;
    startTransition(async () => { await setCoachBrandingAccessAction(c.id, next); router.refresh(); });
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
        <Select value={brandingFilter} onValueChange={setBrandingFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder={L("الهوية التجارية", "Branding")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="branded">{L("لديه هوية تجارية", "Has branding")}</SelectItem>
            <SelectItem value="default">{L("بدون هوية تجارية", "No branding")}</SelectItem>
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
                  <TableHead className="hidden md:table-cell">{L("الهوية البصرية", "Branding")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{L("الوقت المتبقي", "Time remaining")}</TableHead>
                  <TableHead className="hidden 2xl:table-cell">{L("تاريخ البداية", "Start date")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{L("ينتهي في", "Ends at")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logoUrl} alt={c.academyName ?? c.name} className="h-9 w-9 rounded-full border object-cover" />
                        ) : (
                          <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-xs text-primary">{c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.name}</span>
                            {c.hasBranding && (
                              <Badge variant="secondary" className="text-[10px]">{L("هوية مخصصة", "White Label")}</Badge>
                            )}
                          </div>
                          {c.brand && <div className="text-xs text-muted-foreground">{c.brand}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell" dir="ltr">{c.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{c.planName ?? "—"}</TableCell>
                    <TableCell>{formatNumber(c.clients, locale)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.brandingAccess === "plan" && (
                        <Badge className="gap-1 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 text-[10px] border-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {L("مفعّل (الباقة)", "Branding (Plan)")}
                        </Badge>
                      )}
                      {c.brandingAccess === "manual" && (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] border-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {L("مفعّل (يدوي)", "Branding (Manual)")}
                        </Badge>
                      )}
                      {!c.brandingAccess && (
                        <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          {L("معطّل", "Disabled")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <RemainingCell endDate={c.endDate} status={c.status} now={now} locale={locale} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground 2xl:table-cell">
                      {c.startDate ? formatFullDateTime(c.startDate, locale) : "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {c.endDate ? formatFullDateTime(c.endDate, locale) : "—"}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => toggleBranding(c)}>
                            <Palette className="h-4 w-4" />
                            {c.brandingOverride === null || c.brandingOverride === undefined
                              ? L("تفعيل الهوية البصرية يدوياً", "Force-enable branding")
                              : c.brandingOverride === true
                              ? L("تعطيل الهوية البصرية يدوياً", "Force-disable branding")
                              : L("إعادة تعيين للباقة", "Reset to plan default")}
                          </DropdownMenuItem>
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
  const [method, setMethod] = useState("");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlanId(""); setMethod(""); setRef(""); setError(null);
  }, [coach]);

  const selectedPlan = plans.find((p) => p.id === planId);

  async function save() {
    if (!coach || !planId) return;
    setError(null);
    setSaving(true);
    const res = await activateSubscriptionAction(coach.id, {
      planId,
      paymentMethod: (method as "vodafone_cash" | "instapay") || undefined,
      paymentReference: ref || undefined,
    });
    setSaving(false);
    // Previously this ran unconditionally regardless of res.ok, so a thrown
    // error (e.g. an invalid plan) silently closed the dialog as if the
    // activation had succeeded, while nothing in the database changed.
    if (!res.ok) {
      setError(res.error || L("تعذر تفعيل الاشتراك", "Could not activate the subscription"));
      return;
    }
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
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatNumber(p.price, locale)} {L("ج.م", "EGP")} / {planDurationLabel(p.durationMonths, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <p className="text-xs text-muted-foreground">
                {L("مدة الاشتراك", "Subscription duration")}: {planDurationLabel(selectedPlan.durationMonths, locale)}
              </p>
            )}
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
          <div className="space-y-2">
            <Label>{L("مرجع الدفع", "Payment reference")}</Label>
            <Input dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={L("رقم العملية / الهاتف", "Transaction id / phone")} />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !planId}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{L("تفعيل", "Activate")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Live "time left" cell for the admin coaches table — ticking, real countdown from the actual end date. */
function RemainingCell({
  endDate,
  status,
  now,
  locale,
}: {
  endDate?: string | null;
  status: AccountStatus;
  now: number;
  locale: "ar" | "en";
}) {
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  if (status === "expired" || status === "suspended" || !endDate) {
    return <span className="font-medium text-destructive">{L("منتهي", "Expired")}</span>;
  }

  const remainingMs = new Date(endDate).getTime() - now;
  if (remainingMs <= 0) {
    return <span className="font-medium text-destructive">{L("منتهي", "Expired")}</span>;
  }

  const urgent = remainingMs < 24 * 3600_000;
  return (
    <span className={urgent ? "font-medium text-destructive" : "font-medium"}>
      {L("متبقي: ", "")}{formatRemaining(remainingMs, locale)}
    </span>
  );
}
