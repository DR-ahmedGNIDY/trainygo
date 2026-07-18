"use client";

import { useState } from "react";
import Image from "next/image";
import { StickyNote } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";

export interface ImagePlanView {
  id: string;
  name: string;
  images: { url: string }[];
  note?: string;
}

/**
 * Read-only rendering of an image-based nutrition plan. There is no meal
 * checklist or macro summary here — those belong to the structured plan system
 * and are intentionally not reproduced.
 */
export function NutritionImageView({ plan }: { plan: ImagePlanView }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [zoomed, setZoomed] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title={t.dashboard.clientNav.nutrition} description={plan.name} />

      {plan.note && (
        <Card className="mb-6">
          <CardContent className="flex gap-3 p-4">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="whitespace-pre-wrap text-sm">{plan.note}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {plan.images.map((img, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setZoomed(img.url)}
              className="block w-full"
              aria-label={L("تكبير الصورة", "Zoom image")}
            >
              <Image
                src={img.url}
                alt={`${plan.name} ${i + 1}`}
                width={1200}
                height={1600}
                sizes="(max-width: 768px) 100vw, 720px"
                className="h-auto w-full object-contain"
                priority={i === 0}
              />
            </button>
          </Card>
        ))}
      </div>

      <Dialog open={zoomed !== null} onOpenChange={(v) => { if (!v) setZoomed(null); }}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">{plan.name}</DialogTitle>
          {zoomed && (
            <div className="max-h-[80vh] overflow-auto">
              <Image
                src={zoomed}
                alt={plan.name}
                width={2000}
                height={2600}
                sizes="100vw"
                className="h-auto w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
