"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Scale, Camera, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LineTrend } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { useI18n } from "@/components/providers/i18n-provider";
import { addMeasurementAction } from "@/lib/actions/client";

type Photo = { url: string; publicId?: string };
export interface Entry {
  date: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  arms?: number;
  thighs?: number;
  photos?: { front?: Photo; side?: Photo; back?: Photo };
}

export function ProgressView({ history }: { history: Entry[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [open, setOpen] = useState(false);

  const weightSeries = history
    .filter((h) => typeof h.weight === "number")
    .map((h) => ({ label: new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" }), value: h.weight as number }));

  const latest = history[history.length - 1];
  const first = history[0];
  const fields: { key: keyof Entry; label: string; unit: string }[] = [
    { key: "weight", label: t.client.currentWeight, unit: "kg" },
    { key: "bodyFat", label: L("نسبة الدهون", "Body fat"), unit: "%" },
    { key: "chest", label: L("الصدر", "Chest"), unit: "cm" },
    { key: "waist", label: L("الخصر", "Waist"), unit: "cm" },
    { key: "arms", label: L("الذراع", "Arms"), unit: "cm" },
    { key: "thighs", label: L("الفخذ", "Thighs"), unit: "cm" },
  ];

  const photoEntries = history.filter((h) => h.photos && (h.photos.front || h.photos.side || h.photos.back)).reverse();

  return (
    <div>
      <PageHeader title={t.dashboard.clientNav.progress} description={L("تابع تطورك مع الوقت.", "Track your progress over time.")}>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{L("تسجيل قياس", "Log measurement")}</Button>
      </PageHeader>

      {history.length === 0 ? (
        <EmptyState icon={Scale} title={L("لا توجد قياسات بعد", "No measurements yet")} description={L("سجّل أول قياس لمتابعة تطورك.", "Log your first measurement to start tracking.")}>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{L("تسجيل قياس", "Log measurement")}</Button>
        </EmptyState>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">{t.client.weightTrend}</CardTitle></CardHeader>
            <CardContent>
              {weightSeries.length > 0 ? <LineTrend data={weightSeries} xKey="label" yKey="value" height={260} /> : <p className="py-6 text-center text-sm text-muted-foreground">{L("لا توجد بيانات وزن", "No weight data")}</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => {
              const cur = latest?.[f.key] as number | undefined;
              const start = first?.[f.key] as number | undefined;
              const change = cur != null && start != null ? +(cur - start).toFixed(1) : null;
              if (cur == null) return null;
              const down = (change ?? 0) <= 0;
              return (
                <Card key={String(f.key)}>
                  <CardContent className="flex items-center justify-between p-5">
                    <div><p className="text-sm text-muted-foreground">{f.label}</p><p className="text-xl font-bold">{cur}<span className="text-sm font-normal text-muted-foreground"> {f.unit}</span></p></div>
                    {change != null && <Badge variant={down ? "success" : "secondary"} className="gap-1">{down ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}{Math.abs(change)}</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t.dashboard.coachNav.progressPhotos}</h2>
      {photoEntries.length === 0 ? (
        <EmptyState icon={Camera} title={L("لا توجد صور بعد", "No photos yet")} description={L("أضف صور التقدم عند تسجيل قياس.", "Add progress photos when logging a measurement.")} />
      ) : (
        <div className="space-y-4">
          {photoEntries.map((e, i) => (
            <Card key={i}>
              <CardHeader><CardTitle className="text-sm font-medium" dir="ltr">{new Date(e.date).toISOString().slice(0, 10)}</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {(["front", "side", "back"] as const).map((pos) => {
                  const p = e.photos?.[pos];
                  if (!p) return null;
                  return <div key={pos} className="space-y-1 text-center"><Image src={p.url} alt={pos} width={140} height={180} className="h-44 w-auto rounded-lg object-cover" /><span className="text-xs text-muted-foreground">{L({ front: "أمامي", side: "جانبي", back: "خلفي" }[pos], pos)}</span></div>;
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LogMeasurementDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function LogMeasurementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [v, setV] = useState({ weight: "", bodyFat: "", chest: "", waist: "", arms: "", thighs: "" });
  const [photos, setPhotos] = useState<{ front?: Photo; side?: Photo; back?: Photo }>({});
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  function save() {
    startSaving(async () => {
      const num = (x: string) => (x ? Number(x) : undefined);
      const res = await addMeasurementAction({
        weight: num(v.weight), bodyFat: num(v.bodyFat), chest: num(v.chest), waist: num(v.waist), arms: num(v.arms), thighs: num(v.thighs),
        photos,
      });
      if (res.ok) { setV({ weight: "", bodyFat: "", chest: "", waist: "", arms: "", thighs: "" }); setPhotos({}); onOpenChange(false); router.refresh(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{L("تسجيل قياس", "Log measurement")}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>{L("الوزن (كجم)", "Weight (kg)")}</Label><Input type="number" value={v.weight} onChange={(e) => set("weight")(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{L("نسبة الدهون %", "Body fat %")}</Label><Input type="number" value={v.bodyFat} onChange={(e) => set("bodyFat")(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{L("الصدر (سم)", "Chest (cm)")}</Label><Input type="number" value={v.chest} onChange={(e) => set("chest")(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{L("الخصر (سم)", "Waist (cm)")}</Label><Input type="number" value={v.waist} onChange={(e) => set("waist")(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{L("الذراع (سم)", "Arms (cm)")}</Label><Input type="number" value={v.arms} onChange={(e) => set("arms")(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{L("الفخذ (سم)", "Thighs (cm)")}</Label><Input type="number" value={v.thighs} onChange={(e) => set("thighs")(e.target.value)} /></div>
        </div>
        <div>
          <Label className="mb-1.5 block">{t.dashboard.coachNav.progressPhotos}</Label>
          <div className="flex flex-wrap gap-2">
            {(["front", "side", "back"] as const).map((pos) => (
              <div key={pos} className="flex flex-col items-center gap-1">
                <CloudinaryUpload folder="trainygo/progress" iconOnly onUploaded={(url, publicId) => setPhotos((p) => ({ ...p, [pos]: { url, publicId } }))} />
                <span className="text-xs text-muted-foreground">{L({ front: "أمامي", side: "جانبي", back: "خلفي" }[pos], pos)}{photos[pos] ? " ✓" : ""}</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
