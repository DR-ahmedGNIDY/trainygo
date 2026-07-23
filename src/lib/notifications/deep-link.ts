import type { INotificationTarget } from "@/models/Notification";

/**
 * Turns a platform-neutral notification target into a concrete web path.
 *
 * This is the WEB routing table. Native apps (Android/iOS) will ship their own
 * table keyed on the same `route` names, so a notification's `target` is the
 * single source of intent and never needs to change per platform.
 *
 * A route builder receives the target and returns a path. Unknown routes fall
 * back to `/` so a bad/older route name can never throw at render time.
 */
type RouteBuilder = (target: INotificationTarget) => string;

const WEB_ROUTES: Record<string, RouteBuilder> = {
  coach_client: (t) => `/coach/clients/${t.entityId ?? ""}`,
  coach_messages: () => `/coach/messages`,
  coach_checkins: () => `/coach/checkins`,
  coach_requests: () => `/coach/requests`,
  coach_subscription: () => `/coach/subscription`,
  client_workout: () => `/client/workout`,
  client_nutrition: () => `/client/nutrition`,
  client_messages: () => `/client/messages`,
  client_reports: () => `/client/reports`,
  admin_notifications: () => `/admin/notifications`,
  admin_coaches: () => `/admin/coaches`,
};

/** Resolve a structured target to a web path (used to populate `link`). */
export function resolveLink(target: INotificationTarget): string {
  const builder = WEB_ROUTES[target.route];
  return builder ? builder(target) : "/";
}

/** True when a route name is known to the web table. */
export function isKnownRoute(route: string): boolean {
  return route in WEB_ROUTES;
}
