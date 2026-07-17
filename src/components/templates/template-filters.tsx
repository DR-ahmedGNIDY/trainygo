"use client";

import { useMemo, useState } from "react";
import { Globe, Lock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import { TEMPLATE_CREATOR_LABELS, label } from "@/lib/i18n/labels";
import type { TemplateCreatorType } from "@/lib/constants";

/** Which templates the coach wants listed. */
export type TemplateSource = "all" | "mine" | "global";

/** The subset of a template row this toolbar needs to filter on. */
export interface FilterableTemplate {
  nameAr: string;
  nameEn: string;
  createdByType: TemplateCreatorType;
}

/**
 * Marks a template as global (super-admin authored, read-only for coaches) or
 * private to the coach.
 */
export function TemplateSourceBadge({ createdByType }: { createdByType: TemplateCreatorType }) {
  const { locale } = useI18n();
  const isGlobal = createdByType !== "coach";
  const Icon = isGlobal ? Globe : Lock;
  return (
    <Badge variant={isGlobal ? "default" : "secondary"} className="gap-1">
      <Icon className="h-3 w-3" />
      {label(TEMPLATE_CREATOR_LABELS, createdByType, locale)}
    </Badge>
  );
}

/**
 * Client-side source filter + search over an already-loaded template list.
 * The lists are small and unpaginated, so filtering here keeps typing instant
 * and avoids a second copy of the visibility rules on the client — the server
 * has already decided *which* templates this coach may see at all.
 */
export function useTemplateFilters<T extends FilterableTemplate>(
  items: T[],
  /**
   * `enabled: false` drops the source tabs and keeps only search — for the
   * admin area, where every template is global and "mine vs global" is moot.
   */
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { locale } = useI18n();
  const [source, setSource] = useState<TemplateSource>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const isGlobal = item.createdByType !== "coach";
      if (source === "mine" && isGlobal) return false;
      if (source === "global" && !isGlobal) return false;
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
      mine: items.filter((i) => i.createdByType === "coach").length,
      global: items.filter((i) => i.createdByType !== "coach").length,
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
    { key: "global", text: L("قوالب عامة", "Global templates") },
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {showSource && tabs.map((tab) => (
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
