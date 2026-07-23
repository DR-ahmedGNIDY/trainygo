import type {
  ChannelAdapter,
  DeliveryTarget,
  NotificationPayload,
  DeliveryOutcome,
} from "./channels/types";

/**
 * Retry policy for external channel sends.
 *
 * Retries run inside the deferred fan-out (after the response), so they are
 * non-blocking. Backoff is kept small on purpose: a serverless invocation only
 * stays alive briefly, so this recovers from transient blips (network, 5xx from
 * a push service) without holding the function open for long. Durable, minutes-
 * later retries would need a queue — see the P3 report's technical-debt note.
 */
export const RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 500,
  factor: 3,
  maxDelayMs: 5_000,
} as const;

/** After this many consecutive failed sends, a device is retired. */
export const MAX_DEVICE_FAILURES = 5;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function backoffDelay(attempt: number): number {
  return Math.min(
    RETRY_POLICY.baseDelayMs * RETRY_POLICY.factor ** (attempt - 1),
    RETRY_POLICY.maxDelayMs,
  );
}

export interface SendAttempt {
  outcome: DeliveryOutcome;
  attempts: number;
}

/**
 * Send through an adapter with exponential-backoff retries. Stops early on
 * success or on a permanent failure (`gone`), otherwise retries up to
 * `maxAttempts`. The adapter stays dumb — all retry/lifecycle policy lives here.
 */
export async function sendWithRetry(
  adapter: ChannelAdapter,
  target: DeliveryTarget,
  payload: NotificationPayload,
): Promise<SendAttempt> {
  let attempts = 0;
  let outcome: DeliveryOutcome;

  for (;;) {
    attempts++;
    outcome = await adapter.send(target, payload).catch(
      (err): DeliveryOutcome => ({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );

    const success = outcome.status === "sent" || outcome.status === "delivered";
    const permanent = outcome.gone === true;
    if (success || permanent || attempts >= RETRY_POLICY.maxAttempts) break;

    await sleep(backoffDelay(attempts));
  }

  return { outcome, attempts };
}
