"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  copyTemplatesToClientsAction,
  copyClientToClientsAction,
} from "@/lib/actions/programs";
import { cn } from "@/lib/utils";

export interface PickItem { id: string; nameAr: string; nameEn: string }
export interface PickClient { id: string; name: string; code: string }

export function CopyDialog({
  workoutTemplates,
  nutritionTemplates,
  clients,
}: {
  workoutTemplates: PickItem[];
  nutritionTemplates: PickItem[];
  clients: PickClient[];
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"template" | "client">("template");
  const [wt, setWt] = useState("");
  const [nt, setNt] = useState("");
  const [fromClient, setFromClient] = useState("");
  const [what, setWhat] = useState<"workout" | "nutrition" | "both">("both");
  const [targets, setTargets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ programs: number; plans: number } | null>(null);

  const toggle = (id: string) => setTargets((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function run() {
    if (targets.length === 0) return;
    setSaving(true);
    setResult(null);
    const res = mode === "template"
      ? await copyTemplatesToClientsAction({ workoutTemplateId: wt || undefined, nutritionTemplateId: nt || undefined }, targets)
      : await copyClientToClientsAction(fromClient, what, targets);
    setSaving(false);
    if (res.ok) { setResult(res.data!); router.refresh(); }
  }

  function reset() {
    setWt(""); setNt(""); setFromClient(""); setTargets([]); setResult(null);
  }

  const canRun = targets.length > 0 && (mode === "template" ? (wt || nt) : fromClient);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Copy className="h-4 w-4" />{L("نسخ لعدة عملاء", "Copy to clients")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{L("نسخ لعدة عملاء", "Copy to multiple clients")}</DialogTitle></DialogHeader>

        {result ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success"><Check className="h-7 w-7" /></div>
            <p className="font-medium">{L("تم النسخ بنجاح", "Copied successfully")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.programs} {L("برنامج", "programs")} · {result.plans} {L("خطة", "plans")}</p>
            <Button className="mt-4" variant="outline" onClick={reset}>{L("نسخ آخر", "Copy again")}</Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant={mode === "template" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMode("template")}>{L("من قالب", "From template")}</Button>
              <Button variant={mode === "client" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMode("client")}>{L("من عميل", "From client")}</Button>
            </div>

            {mode === "template" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{L("قالب تدريب", "Workout template")}</Label>
                  <Select value={wt} onValueChange={setWt}>
                    <SelectTrigger><SelectValue placeholder={L("بدون", "None")} /></SelectTrigger>
                    <SelectContent>{workoutTemplates.map((x) => <SelectItem key={x.id} value={x.id}>{locale === "ar" ? x.nameAr : x.nameEn}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{L("قالب تغذية", "Nutrition template")}</Label>
                  <Select value={nt} onValueChange={setNt}>
                    <SelectTrigger><SelectValue placeholder={L("بدون", "None")} /></SelectTrigger>
                    <SelectContent>{nutritionTemplates.map((x) => <SelectItem key={x.id} value={x.id}>{locale === "ar" ? x.nameAr : x.nameEn}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{L("العميل المصدر", "Source client")}</Label>
                  <Select value={fromClient} onValueChange={setFromClient}>
                    <SelectTrigger><SelectValue placeholder={L("اختر", "Select")} /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{L("ماذا تنسخ", "What to copy")}</Label>
                  <Select value={what} onValueChange={(v) => setWhat(v as typeof what)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">{L("الاثنين", "Both")}</SelectItem>
                      <SelectItem value="workout">{L("التدريب", "Workout")}</SelectItem>
                      <SelectItem value="nutrition">{L("التغذية", "Nutrition")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Users className="h-4 w-4" />{L("العملاء المستهدفون", "Target clients")} ({targets.length})</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto scrollbar-thin rounded-md border p-1">
                {clients.filter((c) => mode !== "client" || c.id !== fromClient).map((c) => (
                  <button key={c.id} onClick={() => toggle(c.id)} className={cn("flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent", targets.includes(c.id) && "bg-primary/10")}>
                    <span className="font-medium">{c.name} <Badge variant="outline" className="ms-1" dir="ltr">{c.code}</Badge></span>
                    {targets.includes(c.id) && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={run} disabled={saving || !canRun}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{L("نسخ", "Copy")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
