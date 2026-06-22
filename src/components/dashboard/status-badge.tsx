"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { AccountStatus } from "@/lib/constants";

const VARIANT: Record<
  AccountStatus,
  "default" | "secondary" | "warning" | "destructive" | "success"
> = {
  trial: "warning",
  active: "success",
  expired: "destructive",
  suspended: "secondary",
};

/** Localized status pill for account/coach/client statuses. */
export function StatusBadge({ status }: { status: AccountStatus }) {
  const { t } = useI18n();
  return <Badge variant={VARIANT[status]}>{t.account[status]}</Badge>;
}
