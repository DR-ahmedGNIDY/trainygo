import type { NotificationType } from "@/lib/constants";
import type { INotificationTarget } from "@/models/Notification";
import type { TemplateKey, TemplateParams } from "./templates";

interface BaseInput {
  recipient: string;
  /**
   * When set, guarantees at-most-once creation: a retried or duplicated
   * operation resolves to the SAME notification instead of creating another.
   * Enforced both in the Dispatcher (pre-check) and by a unique index.
   */
  idempotencyKey?: string;
  /** Explicit web link; overrides the link derived from `target`. */
  link?: string;
  /** Structured, cross-platform navigation target. */
  target?: INotificationTarget;
}

/** Raw content supplied by the caller (back-compat path for existing callers). */
export interface RawDispatchInput extends BaseInput {
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
}

/** Content produced from a versioned template. */
export interface TemplatedDispatchInput extends BaseInput {
  templateKey: TemplateKey;
  params?: TemplateParams;
  /** Pin a specific template version; defaults to the template's latest. */
  version?: number;
}

export type DispatchInput = RawDispatchInput | TemplatedDispatchInput;

export interface DispatchResult {
  id: string;
  /** True when an existing notification was returned via idempotency. */
  deduped: boolean;
}
