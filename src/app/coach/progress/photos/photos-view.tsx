"use client";

import Image from "next/image";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";

type Photo = { url: string };
export interface PhotoEntry {
  client: string;
  date: string;
  photos: { front?: Photo; side?: Photo; back?: Photo };
}

export function PhotosView({ entries }: { entries: PhotoEntry[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const posLabel = (pos: "front" | "side" | "back") => L({ front: "أمامي", side: "جانبي", back: "خلفي" }[pos], pos);

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.progressPhotos} description={L("صور تقدم عملائك.", "Your clients' progress photos.")} />
      {entries.length === 0 ? (
        <EmptyState icon={Camera} title={L("لا توجد صور تقدم بعد", "No progress photos yet")} description={L("ستظهر هنا عند رفع العملاء لصورهم.", "They appear here once clients upload them.")} />
      ) : (
        <div className="space-y-4">
          {entries.map((e, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{e.client}</CardTitle>
                <span className="text-sm text-muted-foreground" dir="ltr">{new Date(e.date).toISOString().slice(0, 10)}</span>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {(["front", "side", "back"] as const).map((pos) => {
                  const p = e.photos[pos];
                  if (!p) return null;
                  return (
                    <div key={pos} className="space-y-1 text-center">
                      <Image src={p.url} alt={pos} width={150} height={200} className="h-48 w-auto rounded-lg object-cover" />
                      <span className="text-xs text-muted-foreground">{posLabel(pos)}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
