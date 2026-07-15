"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Apple,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  FOOD_CATEGORY_LABELS,
  FOOD_PRIORITY_LABELS,
  FOOD_PRIORITY_STARS,
  label,
} from "@/lib/i18n/labels";
import {
  FOOD_CATEGORIES,
  FOOD_PRIORITIES,
  FOOD_UNITS,
  DEFAULT_FOOD_PRIORITY,
  type FoodPriority,
} from "@/lib/constants";
import {
  createFoodAction,
  updateFoodAction,
  deleteFoodAction,
  setFoodPriorityAction,
  resetFoodPriorityAction,
} from "@/lib/actions/foods";

export interface FoodItem {
  _id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  priority?: number;
  /** Coach only: true when this priority is a personal override on a system food. */
  priorityOverridden?: boolean;
  imageUrl?: string;
  isSystemFood: boolean;
}

const SORT_OPTIONS: { value: string; ar: string; en: string }[] = [
  { value: "", ar: "الترتيب الافتراضي", en: "Default order" },
  { value: "calories:desc", ar: "السعرات (الأعلى أولاً)", en: "Calories (high to low)" },
  { value: "calories:asc", ar: "السعرات (الأقل أولاً)", en: "Calories (low to high)" },
  { value: "protein:desc", ar: "البروتين (الأعلى أولاً)", en: "Protein (high to low)" },
  { value: "carbs:desc", ar: "الكربوهيدرات (الأعلى أولاً)", en: "Carbs (high to low)" },
  { value: "fat:desc", ar: "الدهون (الأعلى أولاً)", en: "Fat (high to low)" },
];

export function FoodLibrary({
  role,
  items,
  total,
  page,
  pages,
  query,
  category,
  sort,
  canWrite,
}: {
  role: "super_admin" | "coach";
  items: FoodItem[];
  total: number;
  page: number;
  pages: number;
  query: string;
  category: string;
  sort: string;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);

  function pushParams(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    });
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  useEffect(() => {
    const id = setTimeout(() => {
      if (q !== query) pushParams({ q: q || undefined, page: "1" });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const canMutate = (food: FoodItem) =>
    canWrite && (role === "coach" ? !food.isSystemFood : food.isSystemFood);

  // A coach may re-prioritise ANY visible food (own or system, the latter via a
  // personal override); an admin only the system foods they own.
  const canEditPriority = (food: FoodItem) =>
    canWrite && (role === "coach" ? true : food.isSystemFood);

  function onDelete(food: FoodItem) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => {
      await deleteFoodAction(food._id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title={role === "super_admin" ? t.dashboard.adminNav.foods : t.dashboard.coachNav.foodLibrary}
        description={`${total} ${locale === "ar" ? "صنف · لكل ١٠٠ جرام" : "items · per 100g"}`}
      >
        {canWrite && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            {locale === "ar" ? "إضافة صنف" : "Add food"}
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.dashboard.ui.search} className="ps-9" />
        </div>
        <Select value={category || "all"} onValueChange={(v) => pushParams({ category: v, page: "1" })}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder={t.dashboard.ui.filterByCategory} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {FOOD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{label(FOOD_CATEGORY_LABELS, c, locale)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort || "none"} onValueChange={(v) => pushParams({ sort: v === "none" ? undefined : v, page: "1" })}>
          <SelectTrigger className="sm:w-60"><ArrowUpDown className="h-4 w-4 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value || "none"}>{locale === "ar" ? s.ar : s.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Apple} title={t.common.noResults} description={t.common.emptyDescription} />
      ) : (
        <>
          <Card className={isPending ? "opacity-60" : ""}>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t.dashboard.ui.filterByCategory}</TableHead>
                    <TableHead>{t.client.calories}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.client.protein}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.client.carbs}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.client.fat}</TableHead>
                    <TableHead className="hidden lg:table-cell">{locale === "ar" ? "الأولوية" : "Priority"}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((food) => (
                    <TableRow key={food._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                            {food.imageUrl ? (
                              <Image src={food.imageUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                            ) : (
                              <Apple className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <span>{locale === "ar" ? food.nameAr : food.nameEn}</span>
                          {!food.isSystemFood && <Badge className="ms-1">{locale === "ar" ? "مخصص" : "Custom"}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline">{label(FOOD_CATEGORY_LABELS, food.category, locale)}</Badge></TableCell>
                      <TableCell className="font-semibold">{food.calories}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{food.protein}g</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{food.carbs}g</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{food.fat}g</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <PriorityCell
                          food={food}
                          canEdit={canEditPriority(food)}
                          onDone={() => router.refresh()}
                        />
                      </TableCell>
                      <TableCell>
                        {canMutate(food) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditing(food); setDialogOpen(true); }}><Pencil className="h-4 w-4" />{t.common.edit}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onDelete(food)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
        <FoodFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSaved={() => { setDialogOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function PriorityCell({
  food,
  canEdit,
  onDone,
}: {
  food: FoodItem;
  canEdit: boolean;
  onDone: () => void;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [pending, start] = useTransition();
  const value = (food.priority ?? DEFAULT_FOOD_PRIORITY) as FoodPriority;

  if (!canEdit) {
    return (
      <span className="text-amber-500" title={label(FOOD_PRIORITY_LABELS, String(value), locale)}>
        {FOOD_PRIORITY_STARS[value]}
      </span>
    );
  }

  function change(v: string) {
    const p = Number(v);
    if (p === value) return;
    start(async () => {
      await setFoodPriorityAction(food._id, p);
      onDone();
    });
  }
  function reset() {
    start(async () => {
      await resetFoodPriorityAction(food._id);
      onDone();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={String(value)} onValueChange={change} disabled={pending}>
        <SelectTrigger className="h-8 w-[104px] px-2 text-amber-500">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FOOD_PRIORITIES.map((p) => (
            <SelectItem key={p} value={String(p)}>
              <span className="text-amber-500">{FOOD_PRIORITY_STARS[p]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {food.priorityOverridden && (
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          title={L("مخصّص — استرجاع الافتراضي", "Custom — reset to default")}
          className="text-amber-500 transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
      {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

function FoodFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: FoodItem | null;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => init(editing));
  useEffect(() => { setF(init(editing)); }, [editing, open]);

  function init(food: FoodItem | null) {
    return {
      nameAr: food?.nameAr ?? "",
      nameEn: food?.nameEn ?? "",
      category: food?.category ?? "protein",
      unit: food?.unit ?? "100g",
      calories: food?.calories?.toString() ?? "",
      protein: food?.protein?.toString() ?? "",
      carbs: food?.carbs?.toString() ?? "",
      fat: food?.fat?.toString() ?? "",
      fiber: food?.fiber?.toString() ?? "",
      priority: (food?.priority ?? DEFAULT_FOOD_PRIORITY).toString(),
      imageUrl: food?.imageUrl ?? "",
    };
  }
  const set = (k: keyof ReturnType<typeof init>) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const payload = {
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      category: f.category as never,
      unit: f.unit as never,
      calories: f.calories || 0,
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0,
      fiber: f.fiber || 0,
      priority: Number(f.priority) || DEFAULT_FOOD_PRIORITY,
      imageUrl: f.imageUrl || undefined,
    };
    const res = editing ? await updateFoodAction(editing._id, payload) : await createFoodAction(payload);
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t.common.edit : L("إضافة صنف", "Add food")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={f.nameAr} onChange={(e) => set("nameAr")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={f.nameEn} onChange={(e) => set("nameEn")(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{L("التصنيف", "Category")}</Label>
            <Select value={f.category} onValueChange={set("category")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FOOD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{label(FOOD_CATEGORY_LABELS, c, locale)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{L("الوحدة", "Unit")}</Label>
            <Select value={f.unit} onValueChange={set("unit")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FOOD_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{t.client.calories}</Label><Input type="number" value={f.calories} onChange={(e) => set("calories")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.client.protein} (g)</Label><Input type="number" value={f.protein} onChange={(e) => set("protein")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.client.carbs} (g)</Label><Input type="number" value={f.carbs} onChange={(e) => set("carbs")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.client.fat} (g)</Label><Input type="number" value={f.fat} onChange={(e) => set("fat")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الألياف", "Fiber")} (g)</Label><Input type="number" value={f.fiber} onChange={(e) => set("fiber")(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{L("أولوية المولّد", "Generator priority")}</Label>
            <Select value={f.priority} onValueChange={set("priority")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FOOD_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    <span className="text-amber-500">{FOOD_PRIORITY_STARS[p]}</span>{" "}
                    {label(FOOD_PRIORITY_LABELS, String(p), locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{L("يستخدمها المولّد الذكي لترتيب الأطعمة المفضّلة أولاً.", "The smart generator picks higher-priority foods first.")}</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{L("صورة الغذاء (اختياري)", "Food image (optional)")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={f.imageUrl} onChange={(e) => set("imageUrl")(e.target.value)} placeholder={L("رابط الصورة", "Image URL")} />
              <CloudinaryUpload kind="foods" iconOnly onUploaded={(url) => set("imageUrl")(url)} />
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
