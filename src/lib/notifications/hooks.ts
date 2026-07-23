import type { INotification } from "@/models/Notification";
import type { NotificationChannel } from "@/lib/constants";
import type { DispatchInput } from "./dispatcher.types";
import type {
  DeliveryTarget,
  NotificationPayload,
  DeliveryOutcome,
} from "./channels/types";

/**
 * ─── Dispatcher event hooks ─────────────────────────────────────────────────
 *
 * Extension points fired at each major stage of a dispatch. They let new
 * cross-cutting behaviour — audit logs, analytics, AI suggestions, workflow
 * automation, third-party integrations — plug in by REGISTERING a listener,
 * never by editing the Dispatcher.
 *
 * Contract:
 *  - Hooks are ISOLATED: a throwing or slow hook is caught and logged and can
 *    never break or block a notification (the source-of-truth save always wins).
 *  - Hooks are OBSERVERS today: they cannot alter the payload, and although the
 *    interface already lets a hook REQUEST cancellation (return `{ cancel }`),
 *    the Dispatcher does not honor it yet. `runHooks` aggregates the request and
 *    returns it, so enabling veto later is a one-line check at a gate stage —
 *    no Dispatcher redesign, no interface change.
 */

/**
 * Optional control a hook may return. Reserved for future veto support; today
 * it is aggregated by `runHooks` but not acted on by the Dispatcher.
 */
export interface HookControl {
  /** Request that this dispatch (beforeDispatch) or send (beforeChannelSend) stop. */
  cancel?: boolean;
  reason?: string;
}
export type HookStage =
  | "beforeDispatch"
  | "afterNotificationSaved"
  | "beforeChannelSend"
  | "afterChannelSend"
  | "afterDispatchCompleted";

export interface HookContext {
  stage: HookStage;
  recipient: string;
  /** Present from beforeDispatch onward. */
  input?: DispatchInput;
  /** Present from afterNotificationSaved onward. */
  notification?: INotification;
  /** Present for channel-scoped stages. */
  channel?: NotificationChannel;
  target?: DeliveryTarget;
  payload?: NotificationPayload;
  outcome?: DeliveryOutcome;
}

export type HookListener = (
  ctx: HookContext,
) => void | HookControl | Promise<void | HookControl>;

const LISTENERS = new Map<HookStage, HookListener[]>();

/** Register a listener for a stage. Returns an unsubscribe function. */
export function registerHook(stage: HookStage, listener: HookListener): () => void {
  const list = LISTENERS.get(stage) ?? [];
  list.push(listener);
  LISTENERS.set(stage, list);
  return () => {
    const cur = LISTENERS.get(stage);
    if (cur) LISTENERS.set(stage, cur.filter((l) => l !== listener));
  };
}

/**
 * Run every listener for a stage. Errors are swallowed (logged) so a bad hook
 * never affects the notification. Awaited so ordered side-effects are possible,
 * but each listener is independently isolated.
 *
 * Returns the aggregated control signal (cancel requested by any listener). The
 * Dispatcher does not act on it yet; when veto is needed, a gate stage checks
 * `(await runHooks(...)).cancel` — a one-line change here-and-there, no redesign.
 */
export async function runHooks(ctx: HookContext): Promise<HookControl> {
  const control: HookControl = {};
  const list = LISTENERS.get(ctx.stage);
  if (!list?.length) return control;
  for (const listener of list) {
    try {
      const result = await listener(ctx);
      if (result?.cancel) {
        control.cancel = true;
        control.reason = control.reason ?? result.reason;
      }
    } catch (err) {
      console.error(`[notify] hook '${ctx.stage}' listener failed`, err);
    }
  }
  return control;
}
