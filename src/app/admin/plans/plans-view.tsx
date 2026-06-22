"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, Users, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatNumber } from "@/lib/utils";
import { PLAN_TIERS } from "@/lib/constants";
import { createPlanAction, updatePlanAction, deletePlanAction } from "@/lib/actions/admin";

export interface PlanItem {
  id: string;
  tier: string;
  nameAr: string;
  nameEn: string;
  price: number;
  durationDays: number;
  maxClients: number;
  featuresAr: string[];
  featuresEn: string[];
}

export function PlansView({ items }: { items: PlanItem[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove(id: string) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => { await deletePlanAction(id); router.refresh(); });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.adminNav.plans} description={L("إدارة باقات الاشتراك.", "Manage subscription plans.")}>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />{L("إنشاء باقة", "Create plan")}</Button>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Users} title={t.common.emptyTitle} description={t.common.emptyDescription} />
      ) : (
        <div className={`grid gap-4 lg:grid-cols-3 ${isPending ? "opacity-60" : ""}`}>
          {items.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-lg">{locale === "ar" ? p.nameAr : p.nameEn}</CardTitle>
                <div className="flex items-baseline gap-1"><span className="text-3xl font-bold">{formatNumber(p.price, locale)}</span><span className="text-sm text-muted-foreground">{L("ج.م / شهر", "EGP / mo")}</span></div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-4 w-4" />{L("حتى", "Up to")} {formatNumber(p.maxClients, locale)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(locale === "ar" ? p.featuresAr : p.featuresEn).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" />{t.common.edit}</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); router.refresh(); }} />
    </div>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: PlanItem | null;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => init(editing));
  useEffect(() => { setF(init(editing)); }, [editing, open]);

  function init(p: PlanItem | null) {
    return {
      tier: p?.tier ?? "starter",
      nameAr: p?.nameAr ?? "",
      nameEn: p?.nameEn ?? "",
      price: p?.price?.toString() ?? "",
      durationDays: p?.durationDays?.toString() ?? "30",
      maxClients: p?.maxClients?.toString() ?? "",
      featuresAr: (p?.featuresAr ?? []).join("\n"),
      featuresEn: (p?.featuresEn ?? []).join("\n"),
    };
  }
  const set = (k: keyof ReturnType<typeof init>) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const payload = {
      tier: f.tier as never,
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      price: Number(f.price) || 0,
      durationDays: Number(f.durationDays) || 30,
      maxClients: Number(f.maxClients) || 0,
      featuresAr: f.featuresAr.split("\n").map((x) => x.trim()).filter(Boolean),
      featuresEn: f.featuresEn.split("\n").map((x) => x.trim()).filter(Boolean),
    };
    const res = editing ? await updatePlanAction(editing.id, payload) : await createPlanAction(payload);
    setSaving(false);
    if (res.ok) onSaved();
  }

  const ta = "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? t.common.edit : L("إنشاء باقة", "Create plan")}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{L("الفئة", "Tier")}</Label>
            <Select value={f.tier} onValueChange={set("tier")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLAN_TIERS.map((tr) => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-2"><Label>{L("السعر", "Price")}</Label><Input type="number" value={f.price} onChange={(e) => set("price")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={f.nameAr} onChange={(e) => set("nameAr")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={f.nameEn} onChange={(e) => set("nameEn")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("المدة (أيام)", "Duration (days)")}</Label><Input type="number" value={f.durationDays} onChange={(e) => set("durationDays")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("أقصى عملاء", "Max clients")}</Label><Input type="number" value={f.maxClients} onChange={(e) => set("maxClients")(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>{L("المميزات (عربي — سطر لكل ميزة)", "Features AR (one per line)")}</Label><textarea className={ta} value={f.featuresAr} onChange={(e) => set("featuresAr")(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>{L("المميزات (إنجليزي)", "Features EN (one per line)")}</Label><textarea className={ta} value={f.featuresEn} onChange={(e) => set("featuresEn")(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !f.nameAr || !f.nameEn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
