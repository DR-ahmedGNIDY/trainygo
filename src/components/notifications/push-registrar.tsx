"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  isPushSupported,
  permissionState,
  enablePush,
  syncPushIfGranted,
  registerServiceWorker,
} from "@/lib/notifications/client/push-client";

/**
 * Registers the Service Worker and, when the user has already granted
 * permission, silently re-syncs their subscription on load (token rotation /
 * new device). When permission hasn't been decided yet, it shows a small
 * one-tap enable button. Renders nothing when push is unsupported or denied.
 *
 * Purely a transport control — no notification content lives here.
 */
export function PushRegistrar() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<NotificationPermission | "unsupported">("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setState(permissionState());
    // Register the SW up front so it's active and ready to receive pushes, then
    // keep an already-granted subscription fresh (no prompt).
    void registerServiceWorker().then(() => syncPushIfGranted(locale));
  }, [locale]);

  if (state !== "default") return null; // unsupported/granted/denied → nothing to show.

  async function onEnable() {
    setBusy(true);
    try {
      const ok = await enablePush(locale);
      setState(ok ? "granted" : permissionState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onEnable}
      disabled={busy}
      className="gap-2"
      title={t.dashboard.ui.enablePush}
    >
      <BellRing className="h-4 w-4" />
      <span className="hidden sm:inline">{t.dashboard.ui.enablePush}</span>
    </Button>
  );
}
