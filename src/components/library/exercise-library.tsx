"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Dumbbell,
  Film,
  MoreHorizontal,
  Pencil,
  Trash2,
  Youtube,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { ExerciseMedia } from "@/components/library/exercise-media";
import { EXERCISE_CATEGORY_LABELS, label } from "@/lib/i18n/labels";
import { EXERCISE_CATEGORIES } from "@/lib/constants";
import {
  createExerciseAction,
  updateExerciseAction,
  deleteExerciseAction,
} from "@/lib/actions/exercises";

export interface ExerciseItem {
  _id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  targetMuscles?: string[];
  description?: { ar?: string; en?: string };
  instructions?: { ar?: string; en?: string };
  commonMistakes?: { ar?: string; en?: string };
  coachTips?: { ar?: string; en?: string };
  gifUrl?: string;
  youtubeUrl?: string;
  imageUrlStart?: string;
  imageUrlEnd?: string;
  videoUrl?: string;
  isSystemExercise: boolean;
}

export function ExerciseLibrary({
  role,
  items,
  total,
  page,
  pages,
  query,
  category,
  tab,
  canWrite,
}: {
  role: "super_admin" | "coach";
  items: ExerciseItem[];
  total: number;
  page: number;
  pages: number;
  query: string;
  category: string;
  /** "system" | "mine" — coach-only split between the system library and the coach's own exercises. */
  tab?: "system" | "mine";
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseItem | null>(null);
  const [viewing, setViewing] = useState<ExerciseItem | null>(null);

  function pushParams(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    });
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  // debounced search
  useEffect(() => {
    const id = setTimeout(() => {
      if (q !== query) pushParams({ q: q || undefined, page: "1" });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const canMutate = (e: ExerciseItem) =>
    canWrite && (role === "coach" ? !e.isSystemExercise : e.isSystemExercise);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(e: ExerciseItem) {
    setEditing(e);
    setDialogOpen(true);
  }
  function onDelete(e: ExerciseItem) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => {
      await deleteExerciseAction(e._id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title={role === "super_admin" ? t.dashboard.adminNav.exercises : t.dashboard.coachNav.exerciseLibrary}
        description={`${total} ${locale === "ar" ? "تمرين" : "exercises"}`}
      >
        {canWrite && (tab !== "system" || role !== "coach") && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t.dashboard.ui.addExercise}
          </Button>
        )}
      </PageHeader>

      {role === "coach" && (
        <Tabs value={tab ?? "system"} onValueChange={(v) => pushParams({ tab: v === "mine" ? "mine" : undefined, page: "1" })} className="mb-4">
          <TabsList>
            <TabsTrigger value="system">{L("تمارين النظام", "System exercises")}</TabsTrigger>
            <TabsTrigger value="mine">{L("مكتبتي", "My library")}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.dashboard.ui.search} className="ps-9" />
        </div>
        <Select value={category || "all"} onValueChange={(v) => pushParams({ category: v, page: "1" })}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder={t.dashboard.ui.filterByCategory} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {EXERCISE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{label(EXERCISE_CATEGORY_LABELS, c, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t.common.noResults} description={t.common.emptyDescription} />
      ) : (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isPending ? "opacity-60" : ""}`}>
            {items.map((e) => (
              <Card key={e._id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
                  <button
                    type="button"
                    onClick={() => setViewing(e)}
                    className="absolute inset-0 flex h-full w-full items-center justify-center"
                    aria-label={t.common.view}
                  >
                    <ExerciseMedia
                      media={{ videoUrl: e.videoUrl, youtubeUrl: e.youtubeUrl, imageUrlStart: e.imageUrlStart, imageUrlEnd: e.imageUrlEnd, gifUrl: e.gifUrl }}
                      alt={locale === "ar" ? e.nameAr : e.nameEn}
                      className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
                    />
                  </button>
                  {(e.videoUrl || e.youtubeUrl || e.imageUrlStart || e.gifUrl) && (
                    <Badge variant="secondary" className="pointer-events-none absolute end-2 top-2 gap-1">
                      <Film className="h-3 w-3" />
                      {e.videoUrl ? (locale === "ar" ? "فيديو" : "Video") : e.youtubeUrl ? "YouTube" : "GIF"}
                    </Badge>
                  )}
                  {!e.isSystemExercise && <Badge className="pointer-events-none absolute start-2 top-2">{locale === "ar" ? "مخصص" : "Custom"}</Badge>}
                  {canMutate(e) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="absolute bottom-2 end-2 h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(e)}><Pencil className="h-4 w-4" />{t.common.edit}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(e)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardContent className="space-y-1.5 p-4">
                  <h3 className="font-semibold leading-tight">{locale === "ar" ? e.nameAr : e.nameEn}</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{label(EXERCISE_CATEGORY_LABELS, e.category, locale)}</Badge>
                    {e.youtubeUrl && <Youtube className="h-4 w-4 text-destructive" />}
                  </div>
                  {e.targetMuscles && e.targetMuscles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{e.targetMuscles.join("، ")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => pushParams({ page: String(page - 1) })}>
                <ChevronRight className="h-4 w-4 rtl:hidden" /><ChevronLeft className="hidden h-4 w-4 rtl:block" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages || isPending} onClick={() => pushParams({ page: String(page + 1) })}>
                <ChevronLeft className="h-4 w-4 rtl:hidden" /><ChevronRight className="hidden h-4 w-4 rtl:block" />
              </Button>
            </div>
          )}
        </>
      )}

      {canWrite && (
        <ExerciseFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSaved={() => { setDialogOpen(false); router.refresh(); }}
        />
      )}

      <ExerciseViewDialog exercise={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}

/** Read-only single-exercise detail view (available for every exercise,
 * including system ones coaches can't edit). */
function ExerciseViewDialog({
  exercise,
  onOpenChange,
}: {
  exercise: ExerciseItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  if (!exercise) return null;
  const name = locale === "ar" ? exercise.nameAr : exercise.nameEn;
  const instructions = locale === "ar" ? exercise.instructions?.ar : exercise.instructions?.en;

  return (
    <Dialog open={!!exercise} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <ExerciseMedia
            media={{ videoUrl: exercise.videoUrl, youtubeUrl: exercise.youtubeUrl, imageUrlStart: exercise.imageUrlStart, imageUrlEnd: exercise.imageUrlEnd, gifUrl: exercise.gifUrl }}
            alt={name}
            className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{label(EXERCISE_CATEGORY_LABELS, exercise.category, locale)}</Badge>
          {exercise.youtubeUrl && <Youtube className="h-4 w-4 text-destructive" />}
        </div>
        {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
          <p className="text-sm text-muted-foreground">{exercise.targetMuscles.join("، ")}</p>
        )}
        {instructions && <p className="text-sm leading-relaxed">{instructions}</p>}
      </DialogContent>
    </Dialog>
  );
}

function ExerciseFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ExerciseItem | null;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => initForm(editing));

  useEffect(() => { setF(initForm(editing)); }, [editing, open]);

  function initForm(e: ExerciseItem | null) {
    return {
      nameAr: e?.nameAr ?? "",
      nameEn: e?.nameEn ?? "",
      category: e?.category ?? "chest",
      targetMuscles: e?.targetMuscles?.join("، ") ?? "",
      descAr: e?.description?.ar ?? "",
      descEn: e?.description?.en ?? "",
      instrAr: e?.instructions?.ar ?? "",
      instrEn: e?.instructions?.en ?? "",
      gifUrl: e?.gifUrl ?? "",
      youtubeUrl: e?.youtubeUrl ?? "",
      imageUrlStart: e?.imageUrlStart ?? "",
      imageUrlEnd: e?.imageUrlEnd ?? "",
      videoUrl: e?.videoUrl ?? "",
    };
  }
  const set = (k: keyof ReturnType<typeof initForm>) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const payload = {
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      category: f.category as never,
      targetMuscles: f.targetMuscles,
      description: { ar: f.descAr, en: f.descEn },
      instructions: { ar: f.instrAr, en: f.instrEn },
      gifUrl: f.gifUrl || undefined,
      youtubeUrl: f.youtubeUrl || undefined,
      imageUrlStart: f.imageUrlStart || undefined,
      imageUrlEnd: f.imageUrlEnd || undefined,
      videoUrl: f.videoUrl || undefined,
    };
    const res = editing
      ? await updateExerciseAction(editing._id, payload)
      : await createExerciseAction(payload);
    setSaving(false);
    if (res.ok) onSaved();
  }

  const ta = "flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t.common.edit : t.dashboard.ui.addExercise}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={f.nameAr} onChange={(e) => set("nameAr")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={f.nameEn} onChange={(e) => set("nameEn")(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{L("التصنيف", "Category")}</Label>
            <Select value={f.category} onValueChange={set("category")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXERCISE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{label(EXERCISE_CATEGORY_LABELS, c, locale)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{L("العضلات المستهدفة", "Target muscles")}</Label><Input value={f.targetMuscles} onChange={(e) => set("targetMuscles")(e.target.value)} placeholder={L("صدر، ترايسبس", "Chest, Triceps")} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>{L("الوصف (عربي)", "Description (AR)")}</Label><textarea className={ta} value={f.descAr} onChange={(e) => set("descAr")(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>{L("التعليمات (عربي)", "Instructions (AR)")}</Label><textarea className={ta} value={f.instrAr} onChange={(e) => set("instrAr")(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{L("الوسائط", "Media")}</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
                <ExerciseMedia
                  media={{ videoUrl: f.videoUrl, youtubeUrl: f.youtubeUrl, imageUrlStart: f.imageUrlStart, imageUrlEnd: f.imageUrlEnd, gifUrl: f.gifUrl }}
                  alt={f.nameAr || f.nameEn || "exercise"}
                  className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden"
                  iconClassName="h-8 w-8 text-muted-foreground/40"
                />
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <CloudinaryUpload kind="exercises" label={L("رفع صورة", "Upload image")} onUploaded={(url) => set("imageUrlStart")(url)} />
                <CloudinaryUpload kind="exercises" resourceType="video" label={L("رفع فيديو", "Upload video")} onUploaded={(url) => set("videoUrl")(url)} />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setF((s) => ({ ...s, videoUrl: "", imageUrlStart: "", imageUrlEnd: "", gifUrl: "" }))}
                >
                  <X className="h-4 w-4" />{L("حذف الوسائط", "Remove media")}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{L("رابط GIF", "GIF URL")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={f.gifUrl} onChange={(e) => set("gifUrl")(e.target.value)} />
              <CloudinaryUpload kind="exercises" iconOnly onUploaded={(url) => set("gifUrl")(url)} />
            </div>
          </div>
          <div className="space-y-2"><Label>{L("رابط يوتيوب", "YouTube URL")}</Label><Input dir="ltr" value={f.youtubeUrl} onChange={(e) => set("youtubeUrl")(e.target.value)} /></div>

          <div className="space-y-2 sm:col-span-2">
            <Label>{L("فيديو مرفوع (أعلى أولوية للعرض)", "Uploaded video (highest display priority)")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={f.videoUrl} onChange={(e) => set("videoUrl")(e.target.value)} placeholder={L("رابط الفيديو", "Video URL")} />
              <CloudinaryUpload kind="exercises" resourceType="video" iconOnly onUploaded={(url) => set("videoUrl")(url)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{L("صورة بداية الحركة", "Movement start photo")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={f.imageUrlStart} onChange={(e) => set("imageUrlStart")(e.target.value)} placeholder={L("رابط الصورة", "Image URL")} />
              <CloudinaryUpload kind="exercises" iconOnly onUploaded={(url) => set("imageUrlStart")(url)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{L("صورة نهاية الحركة", "Movement end photo")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={f.imageUrlEnd} onChange={(e) => set("imageUrlEnd")(e.target.value)} placeholder={L("رابط الصورة", "Image URL")} />
              <CloudinaryUpload kind="exercises" iconOnly onUploaded={(url) => set("imageUrlEnd")(url)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !f.nameAr || !f.nameEn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
