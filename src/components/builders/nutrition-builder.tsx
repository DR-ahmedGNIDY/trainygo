"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Repeat,
  Search,
  Save,
  Loader2,
  Flame,
  ArrowLeft,
  ArrowRight,
  UtensilsCrossed,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useI18n } from "@/components/providers/i18n-provider";
import { MEAL_LABELS, label } from "@/lib/i18n/labels";
import { MEAL_TYPES } from "@/lib/constants";
import { searchFoodsAction } from "@/lib/actions/foods";
import type { ActionResult } from "@/lib/actions/result";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FoodHit {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  unitGrams: number;
  imageUrl?: string;
}
interface BItem {
  food?: string | null;
  nameAr: string;
  nameEn: string;
  quantity: number; // grams
  unit: string;
  base: { calories: number; protein: number; carbs: number; fat: number; fiber: number; unitGrams: number };
  substitutes: { food?: string | null; nameAr: string; nameEn: string; quantity: number; unit: string }[];
}
interface BMeal {
  type: string;
  name?: { ar?: string; en?: string };
  items: BItem[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
function scaled(it: BItem) {
  const f = it.quantity / (it.base.unitGrams || 100);
  return {
    calories: r1(it.base.calories * f),
    protein: r1(it.base.protein * f),
    carbs: r1(it.base.carbs * f),
    fat: r1(it.base.fat * f),
    fiber: r1(it.base.fiber * f),
  };
}

export function NutritionBuilder({
  backHref,
  title,
  subtitle,
  initialNameAr,
  initialNameEn,
  initialMeals,
  onSave,
}: {
  backHref?: string;
  title?: string;
  subtitle?: string;
  initialNameAr: string;
  initialNameEn: string;
  initialMeals: BMeal[];
  onSave: (data: { nameAr: string; nameEn: string; meals: unknown[] }) => Promise<ActionResult>;
}) {
  const { t, locale, dir } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [nameAr, setNameAr] = useState(initialNameAr);
  const [nameEn, setNameEn] = useState(initialNameEn);
  const [meals, setMeals] = useState<BMeal[]>(
    initialMeals.length ? initialMeals : [
      { type: "breakfast", items: [] }, { type: "lunch", items: [] }, { type: "dinner", items: [] }, { type: "snack", items: [] },
    ],
  );
  const [picker, setPicker] = useState<{ m: number; sub?: number } | null>(null);
  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const mut = (fn: (d: BMeal[]) => void) => setMeals((prev) => { const next = JSON.parse(JSON.stringify(prev)) as BMeal[]; fn(next); return next; });

  const totals = meals.reduce((acc, m) => {
    m.items.forEach((it) => { const s = scaled(it); acc.calories += s.calories; acc.protein += s.protein; acc.carbs += s.carbs; acc.fat += s.fat; });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  function addFood(mi: number, food: FoodHit) {
    mut((d) => d[mi].items.push({
      food: food.id, nameAr: food.nameAr, nameEn: food.nameEn, quantity: food.unitGrams || 100, unit: "100g",
      base: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber, unitGrams: food.unitGrams || 100 },
      substitutes: [],
    }));
  }
  function addSub(mi: number, ii: number, food: FoodHit) {
    mut((d) => d[mi].items[ii].substitutes.push({ food: food.id, nameAr: food.nameAr, nameEn: food.nameEn, quantity: food.unitGrams || 100, unit: "100g" }));
  }

  function save() {
    startSaving(async () => {
      const cleanMeals = meals.map((m) => ({
        type: m.type, name: m.name,
        items: m.items.map((it) => { const s = scaled(it); return { food: it.food, nameAr: it.nameAr, nameEn: it.nameEn, quantity: it.quantity, unit: it.unit, ...s, substitutes: it.substitutes }; }),
      }));
      const res = await onSave({ nameAr, nameEn, meals: cleanMeals });
      if (res.ok) { setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); router.refresh(); }
    });
  }

  return (
    <div>
      {backHref && <Button asChild variant="ghost" size="sm" className="mb-3 -ms-2"><Link href={backHref}><BackArrow className="h-4 w-4" />{title}</Link></Button>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{L("الاسم بالعربية", "Arabic name")}</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{L("الاسم بالإنجليزية", "English name")}</Label><Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{savedAt ? `${t.common.saved} ${savedAt}` : t.common.save}</Button>
      </div>
      {subtitle && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}

      {/* Live macros */}
      <Card className="mb-5">
        <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {[
            { l: t.client.calories, v: r1(totals.calories), icon: true },
            { l: t.client.protein, v: `${r1(totals.protein)}g` },
            { l: t.client.carbs, v: `${r1(totals.carbs)}g` },
            { l: t.client.fat, v: `${r1(totals.fat)}g` },
          ].map((x) => (
            <div key={x.l}>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">{x.icon && <Flame className="h-3.5 w-3.5 text-primary" />}{x.l}</p>
              <p className="text-2xl font-bold">{x.v}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {meals.map((meal, mi) => (
          <Card key={mi}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex flex-1 items-center gap-2 text-base">
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
                <Input
                  value={(locale === "ar" ? meal.name?.ar : meal.name?.en) ?? ""}
                  placeholder={label(MEAL_LABELS, meal.type, locale)}
                  onChange={(e) =>
                    mut((d) => {
                      d[mi].name = { ...d[mi].name, [locale]: e.target.value };
                    })
                  }
                  className="h-8 max-w-56 border-transparent bg-transparent px-1.5 font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
                />
              </CardTitle>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setPicker({ m: mi })}><Plus className="h-4 w-4" />{L("طعام", "Food")}</Button>
                {meals.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => mut((d) => d.splice(mi, 1))}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {meal.items.length === 0 && <p className="text-sm text-muted-foreground">{L("لا توجد أطعمة.", "No foods yet.")}</p>}
              {meal.items.map((it, ii) => {
                const s = scaled(it);
                return (
                  <div key={ii} className="rounded-md border bg-muted/30 p-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm font-medium">{locale === "ar" ? it.nameAr : it.nameEn}</span>
                      <div className="flex items-center gap-1">
                        <Input className="h-8 w-20" type="number" value={it.quantity} onChange={(e) => mut((d) => { d[mi].items[ii].quantity = Number(e.target.value) || 0; })} />
                        <span className="text-xs text-muted-foreground">g</span>
                      </div>
                      <span className="w-20 text-end text-xs text-muted-foreground">{s.calories} {t.client.calories}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPicker({ m: mi, sub: ii })} title={L("بديل", "Substitute")}><Repeat className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => mut((d) => d[mi].items.splice(ii, 1))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {it.substitutes.length > 0 && (
                      <div className="mt-1 space-y-0.5 ps-2">
                        {it.substitutes.map((sub, si) => (
                          <p key={si} className="flex items-center gap-1 text-xs text-primary">
                            <Repeat className="h-3 w-3" />{locale === "ar" ? sub.nameAr : sub.nameEn}
                            <button className="text-destructive" onClick={() => mut((d) => d[mi].items[ii].substitutes.splice(si, 1))}>×</button>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
        <AddMealRow onAdd={(type) => mut((d) => { d.push({ type, items: [] }); })} />
      </div>

      <FoodPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onPick={(food) => { if (!picker) return; if (picker.sub !== undefined) addSub(picker.m, picker.sub, food); else addFood(picker.m, food); }}
      />
    </div>
  );
}

function AddMealRow({ onAdd }: { onAdd: (type: string) => void }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [type, setType] = useState<string>(MEAL_TYPES[0]);
  return (
    <div className="flex items-center gap-2">
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MEAL_TYPES.map((mt) => <SelectItem key={mt} value={mt}>{label(MEAL_LABELS, mt, locale)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => onAdd(type)} className="gap-2"><Plus className="h-4 w-4" />{L("إضافة وجبة", "Add meal")}</Button>
    </div>
  );
}

function FoodPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (food: FoodHit) => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<FoodHit[]>([]);
  const [loading, setLoading] = useState(false);

  const categoryChips = [
    { value: "all", ar: "الكل", en: "All" },
    { value: "protein", ar: "بروتينات", en: "Protein" },
    { value: "carbs", ar: "كربوهيدرات", en: "Carbs" },
    { value: "healthy_fats", ar: "دهون صحية", en: "Healthy fats" },
    { value: "vegetables", ar: "خضروات", en: "Vegetables" },
    { value: "fruits", ar: "فواكه", en: "Fruits" },
    { value: "drinks", ar: "مشروبات", en: "Drinks" },
    { value: "dairy", ar: "ألبان", en: "Dairy" },
    { value: "snacks", ar: "وجبات خفيفة", en: "Snacks" },
  ];

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await searchFoodsAction(q, category);
      if (res.ok) setResults(res.data!.items as FoodHit[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q, category, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{L("اختر طعاماً", "Pick a food")}</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.dashboard.ui.search} className="ps-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categoryChips.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                category === c.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
              )}
            >
              {L(c.ar, c.en)}
            </button>
          ))}
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <p className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.common.noResults}</p>
          ) : (
            results.map((f) => (
              <button key={f.id} onClick={() => { onPick(f); onClose(); }} className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-start transition-colors hover:bg-accent">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {f.imageUrl ? (
                    <Image src={f.imageUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                  ) : (
                    <UtensilsCrossed className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{locale === "ar" ? f.nameAr : f.nameEn}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.calories} {t.client.calories} · {t.client.protein} {f.protein}g · {t.client.carbs} {f.carbs}g · {t.client.fat} {f.fat}g
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">/{f.unitGrams}g</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
