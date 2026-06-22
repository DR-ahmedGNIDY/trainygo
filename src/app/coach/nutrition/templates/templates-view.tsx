"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Salad, Copy, Trash2, Pencil, Flame, Loader2 } from "lucide-react";
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
import { useI18n } from "@/components/providers/i18n-provider";
import {
  createNutritionTemplateAction,
  cloneNutritionTemplateAction,
  deleteNutritionTemplateAction,
} from "@/lib/actions/templates";

export interface NutritionTplItem {
  id: string;
  nameAr: string;
  nameEn: string;
  targetCalories?: number;
  meals: number;
  isSystem: boolean;
}

export function NutritionTemplatesView({
  items,
  canWrite,
}: {
  items: NutritionTplItem[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function clone(id: string) {
    startTransition(async () => { await cloneNutritionTemplateAction(id); router.refresh(); });
  }
  function remove(id: string) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => { await deleteNutritionTemplateAction(id); router.refresh(); });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.nutritionTemplates} description={L("خطط غذائية جاهزة لإعادة الاستخدام.", "Reusable nutrition templates.")}>
        {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.dashboard.ui.createTemplate}</Button>}
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Salad} title={t.common.emptyTitle} description={t.common.emptyDescription}>
          {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.dashboard.ui.createTemplate}</Button>}
        </EmptyState>
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${isPending ? "opacity-60" : ""}`}>
          {items.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Salad className="h-5 w-5" /></div>
                  {tpl.isSystem && <Badge variant="secondary">{L("نظام", "System")}</Badge>}
                </div>
                <CardTitle className="text-base">{locale === "ar" ? tpl.nameAr : tpl.nameEn}</CardTitle>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 py-2"><p className="flex items-center justify-center gap-1 text-sm font-bold"><Flame className="h-3.5 w-3.5 text-primary" />{tpl.targetCalories ?? "—"}</p><p className="text-xs text-muted-foreground">{t.client.calories}</p></div>
                  <div className="rounded-lg bg-muted/50 py-2"><p className="text-sm font-bold">{tpl.meals}</p><p className="text-xs text-muted-foreground">{L("وجبات", "meals")}</p></div>
                </div>
                {canWrite && (
                  <div className="flex gap-2">
                    {!tpl.isSystem && <Button asChild variant="outline" size="sm" className="flex-1"><Link href={`/coach/nutrition/templates/${tpl.id}`}><Pencil className="h-4 w-4" />{t.common.edit}</Link></Button>}
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => clone(tpl.id)}><Copy className="h-4 w-4" />{L("نسخ", "Clone")}</Button>
                    {!tpl.isSystem && <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(tpl.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canWrite && <CreateDialog open={open} onOpenChange={setOpen} onSaved={() => { setOpen(false); router.refresh(); }} />}
    </div>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ nameAr: "", nameEn: "", targetCalories: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await createNutritionTemplateAction({
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      targetCalories: f.targetCalories ? Number(f.targetCalories) : undefined,
    });
    setSaving(false);
    if (res.ok) { setF({ nameAr: "", nameEn: "", targetCalories: "" }); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.dashboard.ui.createTemplate}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={f.nameAr} onChange={(e) => set("nameAr")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={f.nameEn} onChange={(e) => set("nameEn")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("السعرات المستهدفة", "Target calories")}</Label><Input type="number" value={f.targetCalories} onChange={(e) => set("targetCalories")(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">{L("سيتم إنشاء القالب بوجبات فارغة — أضف الأطعمة بعد الإنشاء.", "Created with empty meals — add foods after creating.")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !f.nameAr || !f.nameEn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
