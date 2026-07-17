"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Layers,
  Copy,
  Trash2,
  Pencil,
  CalendarRange,
  Dumbbell,
  Eye,
  History,
  Loader2,
  Pin,
  PinOff,
} from "lucide-react";
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
import { GOAL_LABELS, label } from "@/lib/i18n/labels";
import {
  createWorkoutTemplateAction,
  cloneWorkoutTemplateAction,
  deleteWorkoutTemplateAction,
} from "@/lib/actions/templates";
import {
  FeaturedBadge,
  TemplateSourceBadge,
  useTemplateFilters,
} from "@/components/templates/template-filters";
import { setWorkoutTemplateFeaturedAction } from "@/lib/actions/templates";
import type { ClientGoal } from "@/lib/constants";

export interface WorkoutTplItem {
  id: string;
  nameAr: string;
  nameEn: string;
  goal?: ClientGoal;
  weeks: number;
  days: number;
  /** Authored by FITXNET: visible to every coach, read-only to them. */
  official: boolean;
  featured: boolean;
  version: number;
}

export function WorkoutTemplatesView({
  items,
  canWrite,
  basePath = "/coach/templates",
  isAdmin = false,
}: {
  items: WorkoutTplItem[];
  canWrite: boolean;
  /** Route prefix for edit/preview links — lets the admin area reuse this view. */
  basePath?: string;
  /**
   * Super admin mode: authors official templates only (so the source filter is
   * moot) and may pin/unpin them.
   */
  isAdmin?: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { filtered, toolbar } = useTemplateFilters(items, { enabled: !isAdmin });

  function clone(id: string) {
    startTransition(async () => { await cloneWorkoutTemplateAction(id); router.refresh(); });
  }
  function remove(id: string) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => { await deleteWorkoutTemplateAction(id); router.refresh(); });
  }
  function toggleFeatured(id: string, featured: boolean) {
    startTransition(async () => { await setWorkoutTemplateFeaturedAction(id, featured); router.refresh(); });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.workoutTemplates} description={L("قوالب جاهزة لإعادة الاستخدام مع عملائك.", "Reusable templates to assign to your clients.")}>
        {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.dashboard.ui.createTemplate}</Button>}
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Layers} title={t.common.emptyTitle} description={t.common.emptyDescription}>
          {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.dashboard.ui.createTemplate}</Button>}
        </EmptyState>
      ) : (
        <>
        {toolbar}
        {filtered.length === 0 ? (
          <EmptyState icon={Layers} title={L("لا نتائج", "No results")} description={L("جرّب تعديل البحث أو الفلتر.", "Try adjusting your search or filter.")} />
        ) : (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${isPending ? "opacity-60" : ""}`}>
          {filtered.map((tpl) => {
          // Official templates are read-only for coaches (duplicate/assign
          // only), but the super admin who owns them edits them in place.
          const readOnly = !isAdmin && tpl.official;
          return (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Layers className="h-5 w-5" /></div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {tpl.featured && <FeaturedBadge />}
                    <TemplateSourceBadge official={tpl.official} />
                  </div>
                </div>
                <CardTitle className="text-base">{locale === "ar" ? tpl.nameAr : tpl.nameEn}</CardTitle>
                {tpl.goal && <Badge variant="secondary" className="w-fit">{label(GOAL_LABELS, tpl.goal, locale)}</Badge>}
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CalendarRange className="h-4 w-4" />{tpl.weeks} {L("أسابيع", "weeks")}</span>
                  <span className="flex items-center gap-1.5"><Dumbbell className="h-4 w-4" />{tpl.days} {L("أيام", "days")}</span>
                  <span className="flex items-center gap-1.5"><History className="h-4 w-4" />{L("إصدار", "v")} {tpl.version}</span>
                </div>
                {isAdmin && (
                  <Button
                    variant={tpl.featured ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => toggleFeatured(tpl.id, !tpl.featured)}
                  >
                    {tpl.featured ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {tpl.featured ? L("إلغاء التثبيت", "Unpin") : L("تثبيت", "Pin")}
                  </Button>
                )}
                {canWrite && (
                  <div className="flex gap-2">
                    {readOnly ? (
                      <Button asChild variant="outline" size="sm" className="flex-1"><Link href={`${basePath}/${tpl.id}`}><Eye className="h-4 w-4" />{L("معاينة", "Preview")}</Link></Button>
                    ) : (
                      <Button asChild variant="outline" size="sm" className="flex-1"><Link href={`${basePath}/${tpl.id}`}><Pencil className="h-4 w-4" />{t.common.edit}</Link></Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => clone(tpl.id)}><Copy className="h-4 w-4" />{L("نسخ", "Clone")}</Button>
                    {!readOnly && <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(tpl.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
          })}
        </div>
        )}
        </>
      )}

      {canWrite && <CreateWorkoutTemplateDialog open={open} onOpenChange={setOpen} onSaved={() => { setOpen(false); router.refresh(); }} />}
    </div>
  );
}

function CreateWorkoutTemplateDialog({
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
  const [f, setF] = useState({ nameAr: "", nameEn: "", goal: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await createWorkoutTemplateAction({
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      goal: (f.goal as ClientGoal) || undefined,
    });
    setSaving(false);
    if (res.ok) { setF({ nameAr: "", nameEn: "", goal: "" }); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.dashboard.ui.createTemplate}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={f.nameAr} onChange={(e) => set("nameAr")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={f.nameEn} onChange={(e) => set("nameEn")(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{L("الهدف", "Goal")}</Label>
            <Select value={f.goal} onValueChange={set("goal")}>
              <SelectTrigger><SelectValue placeholder={L("اختر", "Select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="muscle_building">{L("زيادة كتلة عضلية", "Muscle Building")}</SelectItem>
                <SelectItem value="fat_loss">{L("نزول في الوزن", "Fat Loss")}</SelectItem>
                <SelectItem value="athletic_conditioning">{L("إعداد بدني", "Athletic Conditioning")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{L("سيتم إنشاء القالب بأسبوع فارغ — أضف الأيام والتمارين بعد الإنشاء.", "The template is created with one empty week — add days and exercises after creating.")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !f.nameAr || !f.nameEn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
