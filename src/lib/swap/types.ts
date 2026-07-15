/**
 * Domain-agnostic swap vocabulary.
 *
 * The swap engine knows nothing about food: it swaps a *unit* (something with an
 * id, a group it may only be swapped within, and a priority) for another unit of
 * the same group, rescaling it so the *metrics* stay as close as possible to the
 * original. Foods scale by grams and are measured in macros; a future exercise
 * swap scales by reps and is measured in volume — both fit this shape.
 */

export interface SwapUnit {
  id: string;
  /** Swaps never cross groups: food category, muscle group, supplement type… */
  groupKey: string;
  /** Preference weight, higher = more preferred. */
  priority: number;
}

/** A named measurement vector, e.g. { calories, protein, carbs, fat }. */
export type Metrics = Record<string, number>;

/**
 * How one domain plugs into the engine. Implementations are pure — no DB, no
 * framework — so they run identically on the server and in the browser.
 */
export interface SwapDomain<U extends SwapUnit> {
  /** Metric keys compared when matching, most significant first. */
  metricKeys: string[];
  /**
   * Per-metric weight used when solving the scale, in ABSOLUTE units — these
   * put every metric on one common scale so none can dominate the fit just by
   * being close to zero. See `solveScale`.
   */
  weights?: Metrics;
  /**
   * Per-metric absolute amounts too small to count as a miss, given what's being
   * matched. Takes the target so the threshold can scale with the item: what's
   * noise on a 600 kcal dinner is not noise on a 60 kcal snack. Also supplies a
   * denominator for a zero target, where relative error is otherwise undefined.
   */
  negligible?(target: Metrics): Metrics;
  /** Metrics contributed by ONE unit of scale (one gram, one rep…). */
  rate(unit: U): Metrics;
  /** Allowed scale range for this unit, so portions stay realistic. */
  scaleBounds(unit: U): { min: number; max: number };
  /** Round a solved scale to a value a human would actually write down. */
  roundScale(scale: number): number;
  /** A candidate is "valid" when every metric lands within this fraction. */
  tolerance: number;
}

export interface SwapRequest<U extends SwapUnit> {
  /** The unit being replaced, at its current scale. */
  current: { unit: U; scale: number };
  /** Everything the coach could swap to; other groups are filtered out here. */
  pool: U[];
  /**
   * Unit ids already used elsewhere in the same template. These are ranked last
   * rather than dropped — the spec allows repetition when nothing else fits.
   */
  usedElsewhere?: Iterable<string>;
  /**
   * Where the swap is happening, if the domain has such a notion — the meal a
   * food sits in, the session an exercise belongs to. Units the predicate
   * accepts rank above those it doesn't, without ever being dropped: a soft
   * preference, mirroring how the generator picks in the first place.
   */
  fitsContext?: (unit: U) => boolean;
  /** Cap on returned options; omit for all valid candidates. */
  limit?: number;
}

export interface SwapOption<U extends SwapUnit> {
  unit: U;
  /** Grams (or reps…) needed so this unit matches the original's metrics. */
  scale: number;
  /** Resulting metrics at `scale`. */
  metrics: Metrics;
  /** Signed difference against the original's metrics, per key. */
  deltas: Metrics;
  /** Largest relative deviation across all metric keys. */
  deviation: number;
  /** True when `deviation` is within the domain's tolerance. */
  withinTolerance: boolean;
  /** True when the candidate carries the same priority as the original. */
  samePriority: boolean;
  /** True when this unit already appears elsewhere in the template. */
  usedElsewhere: boolean;
  /**
   * True when the unit suits where the swap is happening (see
   * `SwapRequest.fitsContext`). Always true when the request set no context.
   */
  fitsContext: boolean;
}
