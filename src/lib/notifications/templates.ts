import type { NotificationType } from "@/lib/constants";
import type { INotificationTarget } from "@/models/Notification";

/**
 * ─── Versioned notification templates ───────────────────────────────────────
 *
 * Emitters reference a template by KEY (never by hand-written text), and the
 * dispatcher renders it. Each template carries an ordered list of VERSIONS.
 *
 * Because the dispatcher snapshots the rendered text onto the Notification,
 * editing a template can NEVER alter past notifications. Versioning exists so
 * we can (a) change wording by appending a new version, (b) know exactly which
 * wording produced a historical notification, and (c) re-render later if needed
 * — all without a data migration. To change copy: append a new version object
 * and bump `latest`. Do not mutate a shipped version in place.
 *
 * P1 ships the registry + the raw/passthrough path used by the 11 existing
 * callers. Migrating those callers onto keys is a later, incremental step; the
 * schema and dispatcher already support it today.
 */

export type TemplateParams = Record<string, string | number>;

export interface RenderedTemplate {
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  target?: INotificationTarget;
}

interface TemplateVersion {
  version: number;
  render: (params: TemplateParams) => RenderedTemplate;
}

interface TemplateDef {
  latest: number;
  versions: TemplateVersion[];
}

export type TemplateKey =
  | "workout_assigned"
  | "nutrition_updated"
  | "subscription_expiring"
  | "coach_message"
  | "assessment_added"
  | "system_announcement";

const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  workout_assigned: {
    latest: 1,
    versions: [
      {
        version: 1,
        render: () => ({
          type: "new_program",
          titleAr: "تم إسناد برنامج تدريبي جديد لك",
          titleEn: "A new workout program was assigned to you",
          target: { route: "client_workout" },
        }),
      },
    ],
  },
  nutrition_updated: {
    latest: 1,
    versions: [
      {
        version: 1,
        render: () => ({
          type: "new_nutrition_plan",
          titleAr: "تم تحديث خطتك الغذائية",
          titleEn: "Your nutrition plan was updated",
          target: { route: "client_nutrition" },
        }),
      },
    ],
  },
  subscription_expiring: {
    latest: 1,
    versions: [
      {
        version: 1,
        render: (p) => ({
          type: "subscription_expiry",
          titleAr: "اشتراكك على وشك الانتهاء",
          titleEn: "Your subscription is expiring soon",
          bodyAr: p.days ? `يتبقى ${p.days} يوم على انتهاء اشتراكك.` : undefined,
          bodyEn: p.days ? `${p.days} day(s) left on your subscription.` : undefined,
          target: { route: "coach_subscription" },
        }),
      },
    ],
  },
  coach_message: {
    latest: 1,
    versions: [
      {
        version: 1,
        render: (p) => ({
          type: "new_message",
          titleAr: "رسالة جديدة",
          titleEn: "New message",
          target: {
            route: String(p.audience) === "coach" ? "client_messages" : "coach_messages",
          },
        }),
      },
    ],
  },
  assessment_added: {
    latest: 1,
    versions: [
      {
        version: 1,
        render: () => ({
          type: "new_checkin",
          titleAr: "تم إضافة تقييم جديد",
          titleEn: "A new assessment was added",
          target: { route: "coach_checkins" },
        }),
      },
    ],
  },
  system_announcement: {
    latest: 1,
    versions: [
      {
        version: 1,
        render: (p) => ({
          type: "system",
          titleAr: String(p.titleAr ?? p.title ?? ""),
          titleEn: String(p.titleEn ?? p.title ?? ""),
          bodyAr: p.bodyAr != null ? String(p.bodyAr) : undefined,
          bodyEn: p.bodyEn != null ? String(p.bodyEn) : undefined,
          target: { route: "admin_notifications" },
        }),
      },
    ],
  },
};

/**
 * Render a template. Defaults to the latest version; pass `version` to pin a
 * historical wording. Returns the rendered content plus the resolved version
 * number so the dispatcher can record provenance.
 */
export function renderTemplate(
  key: TemplateKey,
  params: TemplateParams = {},
  version?: number,
): RenderedTemplate & { version: number } {
  const def = TEMPLATES[key];
  if (!def) throw new Error(`Unknown notification template: ${key}`);
  const resolved = version ?? def.latest;
  const v = def.versions.find((x) => x.version === resolved);
  if (!v) throw new Error(`Unknown version ${resolved} for template ${key}`);
  return { ...v.render(params), version: resolved };
}
