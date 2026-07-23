"use client";

import { useEffect, useState } from "react";
import { Bell, Save, MoonStar, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import { NOTIFICATION_TYPE_LABELS, label } from "@/lib/i18n/labels";
import { sendTestPush } from "@/lib/notifications/client/push-client";
import { cn } from "@/lib/utils";

interface PreferenceView {
  channels: Record<string, boolean>;
  mutedTypes: string[];
  quietHours: { enabled: boolean; start: string; end: string; timezone: string };
}

/** Small self-contained on/off control (no external switch dependency). */
function Toggle({
  checked,
  onChange,
  label: aria,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5",
        )}
      />
    </button>
  );
}

export function NotificationPreferencesForm() {
  const { t, locale } = useI18n();
  const ui = t.dashboard.ui;
  const [prefs, setPrefs] = useState<PreferenceView | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me/notification-preferences")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.ok) setPrefs(d.preferences);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!prefs) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">…</CardContent>
      </Card>
    );
  }

  const isMuted = (type: string) => prefs.mutedTypes.includes(type);
  const toggleMuted = (type: string, receive: boolean) =>
    setPrefs((p) =>
      p
        ? {
            ...p,
            mutedTypes: receive
              ? p.mutedTypes.filter((x) => x !== type)
              : [...p.mutedTypes, type],
          }
        : p,
    );

  async function save() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (data?.ok) {
        setPrefs(data.preferences);
        toast.success(ui.prefSaved);
      } else {
        toast.error(t.common.errorTitle);
      }
    } catch {
      toast.error(t.common.errorTitle);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          {ui.notifPrefsTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{ui.notifPrefsDesc}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channels */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">{ui.prefChannelsLabel}</Label>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">{ui.prefWebPush}</span>
            <Toggle
              checked={prefs.channels.web_push !== false}
              onChange={(v) =>
                setPrefs((p) => (p ? { ...p, channels: { ...p.channels, web_push: v } } : p))
              }
              label={ui.prefWebPush}
            />
          </div>
        </div>

        <Separator />

        {/* Quiet hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <MoonStar className="h-4 w-4 text-primary" />
              {ui.prefQuietHours}
            </Label>
            <Toggle
              checked={prefs.quietHours.enabled}
              onChange={(v) =>
                setPrefs((p) => (p ? { ...p, quietHours: { ...p.quietHours, enabled: v } } : p))
              }
              label={ui.prefQuietEnable}
            />
          </div>
          {prefs.quietHours.enabled && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">{ui.prefFrom}</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={prefs.quietHours.start}
                  onChange={(e) =>
                    setPrefs((p) =>
                      p ? { ...p, quietHours: { ...p.quietHours, start: e.target.value } } : p,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ui.prefTo}</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={prefs.quietHours.end}
                  onChange={(e) =>
                    setPrefs((p) =>
                      p ? { ...p, quietHours: { ...p.quietHours, end: e.target.value } } : p,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{ui.prefTimezone}</Label>
                <Input
                  dir="ltr"
                  value={prefs.quietHours.timezone}
                  onChange={(e) =>
                    setPrefs((p) =>
                      p ? { ...p, quietHours: { ...p.quietHours, timezone: e.target.value } } : p,
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Muted types */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">{ui.prefMutedTypesLabel}</Label>
            <p className="text-xs text-muted-foreground">{ui.prefMutedTypesDesc}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm">{label(NOTIFICATION_TYPE_LABELS, type, locale)}</span>
                <Toggle
                  checked={!isMuted(type)}
                  onChange={(receive) => toggleMuted(type, receive)}
                  label={label(NOTIFICATION_TYPE_LABELS, type, locale)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setTesting(true);
              try {
                const ok = await sendTestPush();
                ok ? toast.success(ui.prefTestSent) : toast.error(ui.prefTestFailed);
              } finally {
                setTesting(false);
              }
            }}
            disabled={testing}
          >
            <Send className="h-4 w-4" />
            {ui.prefSendTest}
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {t.common.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
