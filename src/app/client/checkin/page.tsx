"use client";

import { useState } from "react";
import { ClipboardCheck, Moon, Droplets, Zap, Salad, CheckCircle2, Send, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";
import { submitCheckinAction } from "@/lib/actions/client";

export default function ClientCheckinPage() {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sleep, setSleep] = useState("7");
  const [water, setWater] = useState("2.5");
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState(7);
  const [adherence, setAdherence] = useState(8);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await submitCheckinAction([
      { key: "sleep", value: sleep },
      { key: "water", value: water },
      { key: "energy", value: String(energy) },
      { key: "adherence", value: String(adherence) },
      { key: "notes", value: notes },
    ]);
    setSaving(false);
    if (res.ok) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold">{L("تم إرسال متابعتك!", "Check-in submitted!")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{L("سيراجعها مدربك قريباً.", "Your coach will review it soon.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t.dashboard.clientNav.checkin} description={L("شارك مدربك بحالتك هذا الأسبوع.", "Share how your week went with your coach.")} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-primary" />{L("متابعة أسبوعية", "Weekly check-in")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Moon className="h-4 w-4 text-muted-foreground" />{L("ساعات النوم", "Sleep hours")}</Label>
                <Input type="number" min={0} max={14} step={0.5} value={sleep} onChange={(e) => setSleep(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Droplets className="h-4 w-4 text-muted-foreground" />{L("الماء (لتر)", "Water (L)")}</Label>
                <Input type="number" min={0} max={10} step={0.1} value={water} onChange={(e) => setWater(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-muted-foreground" />{L("مستوى الطاقة", "Energy level")} — {energy}/10</Label>
              <Scale10 value={energy} onChange={setEnergy} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Salad className="h-4 w-4 text-muted-foreground" />{L("الالتزام بالنظام", "Diet adherence")} — {adherence}/10</Label>
              <Scale10 value={adherence} onChange={setAdherence} />
            </div>

            <div className="space-y-2">
              <Label>{L("ملاحظات", "Notes")}</Label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={L("أي شيء تريد إخبار مدربك به...", "Anything you'd like to tell your coach...")}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {L("إرسال المتابعة", "Submit check-in")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Scale10({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 10 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 flex-1 rounded-md border text-sm font-medium transition-colors",
              n <= value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
