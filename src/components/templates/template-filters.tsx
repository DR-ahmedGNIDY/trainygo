"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Lock, Pin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

/** Which templates the coach wants listed. */
export type TemplateSource = "all" | "mine" | "global";

/** The subset of a template row this toolbar needs to filter on. */
export interface FilterableTemplate {
  nameAr: string;
  nameEn: string;
  /** Authored by FITXNET: visible to every coach, read-only to them. */
  official: boolean;
}

/**
 * Marks a template as official (FITXNET-authored, read-only for coaches) or
 * private to the coach.
 */
export function TemplateSourceBadge({ official }: { official: boolean }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  if (!official) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Lock className="h-3 w-3" />
        {L("خاص", "Private")}
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="gap-1">
      <BadgeCheck className="h-3 w-3" />
      {L("رسمي", "Official")}
    </Badge>
  );
}

/** The fuller wording, for surfaces with room for it (e.g. the preview page). */
export function OfficialTemplateBadge() {
  const { locale } = useI18n();
  return (
    <Badge variant="default" className="gap-1">
      <BadgeCheck className="h-3 w-3" />
      {locale === "ar" ? "قالب رسمي من FITXNET" : "Official FITXNET template"}
    </Badge>
  );
}

/** Shown on templates the super admin pinned to the top of every list. */
export function FeaturedBadge() {
  const { locale } = useI18n();
  return (
    <Badge variant="warning" className="gap-1">
      <Pin className="h-3 w-3" />
      {locale === "ar" ? "مميّز" : "Featured"}
    </Badge>
  );
}

/**
 * Client-side source filter + search over an already-loaded template list.
 * The lists are small and unpaginated, so filtering here keeps typing instant
 * and avoids a second copy of the visibility rules on the client — the server
 * has already decided *which* templates this coach may see at all, and in what
 * order (featured -> official -> newest), which this preserves.
 */
export function useTemplateFilters<T extends FilterableTemplate>(
  items: T[],
  /**
   * `enabled: false` drops the source tabs and keeps only search — for the
   * admin area, where every template is official and "mine vs global" is moot.
   */
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { locale } = useI18n();
  const [source, setSource] = useState<TemplateSource>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (source === "mine" && item.official) return false;
      if (source === "global" && !item.official) return false;
      if (!q) return true;
      // Search spans both locales so a coach finds a template by either name.
      return (
        item.nameAr.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q)
      );
    });
  }, [items, source, search]);

  const counts = useMemo(
    () => ({
      all: items.length,
      mine: items.filter((i) => !i.official).length,
      global: items.filter((i) => i.official).length,
    }),
    [items],
  );

  const toolbar = (
    <TemplateFilterBar
      source={source}
      onSourceChange={setSource}
      search={search}
      onSearchChange={setSearch}
      counts={counts}
      locale={locale}
      showSource={enabled}
    />
  );

  return { filtered, toolbar, source, search };
}

function TemplateFilterBar({
  source,
  onSourceChange,
  search,
  onSearchChange,
  counts,
  locale,
  showSource,
}: {
  source: TemplateSource;
  onSourceChange: (s: TemplateSource) => void;
  search: string;
  onSearchChange: (s: string) => void;
  counts: Record<TemplateSource, number>;
  locale: string;
  showSource: boolean;
}) {
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const tabs: { key: TemplateSource; text: string }[] = [
    { key: "all", text: L("الكل", "All") },
    { key: "mine", text: L("قوالبي", "My templates") },
    { key: "global", text: L("قوالب رسمية", "Official templates") },
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {showSource &&
          tabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              size="sm"
              variant={source === tab.key ? "default" : "outline"}
              onClick={() => onSourceChange(tab.key)}
            >
              {tab.text}
              <span className="text-xs opacity-70">{counts[tab.key]}</span>
            </Button>
          ))}
      </div>
      <div className="relative sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={L("ابحث في القوالب…", "Search templates…")}
          className="ps-9"
        />
      </div>
    </div>
  );
}
