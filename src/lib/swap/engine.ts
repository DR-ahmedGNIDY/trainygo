import type {
  Metrics,
  SwapDomain,
  SwapOption,
  SwapRequest,
  SwapUnit,
} from "./types";

const EPS = 1e-6;

/**
 * Scale a candidate so its metrics land as close as possible to `target`.
 *
 * With one unknown this is a weighted least-squares problem with a closed form:
 * minimising E(s) = Σ wₖ·(rₖ·s − tₖ)² gives s* = Σ(wₖ·rₖ·tₖ) / Σ(wₖ·rₖ²).
 *
 * The error is deliberately measured in ABSOLUTE units, with the domain's
 * `weights` putting every metric on one common scale (for food, kcal). Weighting
 * each metric by its own relative error instead would let a metric that happens
 * to be near zero dominate the fit — a lean-beef swap would be scaled to match
 * the original's few grams of fat and throw away a third of its calories. In
 * absolute terms a metric influences the scale in proportion to how much it
 * actually contributes, which is what a coach means by "similar".
 */
function solveScale(
  rate: Metrics,
  target: Metrics,
  keys: string[],
  weights: Metrics | undefined,
  bounds: { min: number; max: number },
): number {
  let num = 0;
  let den = 0;
  for (const k of keys) {
    const t = target[k] ?? 0;
    const r = rate[k] ?? 0;
    const w = weights?.[k] ?? 1;
    num += w * r * t;
    den += w * r * r;
  }
  if (den <= EPS) return bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, num / den));
}

/**
 * Relative miss on one metric, as the spec's ±5% is stated. `negligible` is the
 * amount too small to care about: it forgives noise-level drift and gives a zero
 * target something to divide by, so a candidate carrying a metric the original
 * didn't have still registers as a real miss instead of an undefined 0/0.
 * Without it, a replacement chicken breast carrying 1.6g of carbs would read as
 * a 320% miss against a chicken breast with none.
 */
function relativeMiss(got: number, target: number, negligible: number): number {
  const diff = Math.abs(got - target);
  if (diff <= negligible) return 0;
  return diff / Math.max(target, negligible);
}

/** Largest relative deviation across the compared keys. */
function deviationOf(
  got: Metrics,
  target: Metrics,
  keys: string[],
  negligible: Metrics,
): number {
  let worst = 0;
  for (const k of keys) {
    worst = Math.max(
      worst,
      relativeMiss(got[k] ?? 0, target[k] ?? 0, negligible[k] ?? EPS),
    );
  }
  return worst;
}

/** Sum of squared relative misses — the tiebreaker once the tiers are equal. */
function errorOf(
  got: Metrics,
  target: Metrics,
  keys: string[],
  negligible: Metrics,
): number {
  let sum = 0;
  for (const k of keys) {
    const miss = relativeMiss(got[k] ?? 0, target[k] ?? 0, negligible[k] ?? EPS);
    sum += miss * miss;
  }
  return sum;
}

/**
 * Rank the replacements for one unit, best first.
 *
 * Pure and deterministic: the same `domain` + `request` always produce the same
 * list, so callers can compute options once and cache them instead of asking a
 * server on every click.
 *
 * Candidates are filtered to the current unit's group (never cross categories)
 * and then ordered by, in strict precedence:
 *   1. metrics within tolerance — a valid swap beats a merely preferred one;
 *   2. priority, penalising only *downgrades*, so an equal-or-better preference
 *      always outranks a lower one and a low-star food is never chosen over a
 *      preferred one while a valid alternative exists;
 *   3. not already used elsewhere in the template;
 *   4. closest metrics overall.
 */
export function buildSwapOptions<U extends SwapUnit>(
  domain: SwapDomain<U>,
  request: SwapRequest<U>,
): SwapOption<U>[] {
  const { current, pool, limit } = request;
  const used = new Set(request.usedElsewhere ?? []);
  const keys = domain.metricKeys;

  // What the replacement has to reproduce: the current unit's metrics at its
  // current scale.
  const currentRate = domain.rate(current.unit);
  const target: Metrics = {};
  for (const k of keys) target[k] = (currentRate[k] ?? 0) * current.scale;
  // The target is fixed for the whole request, so the noise floor is too.
  const negligible = domain.negligible?.(target) ?? {};

  const ranked = pool
    .filter((u) => u.groupKey === current.unit.groupKey && u.id !== current.unit.id)
    .map((unit) => {
      const rate = domain.rate(unit);
      const bounds = domain.scaleBounds(unit);
      const scale = domain.roundScale(solveScale(rate, target, keys, domain.weights, bounds));
      const metrics: Metrics = {};
      const deltas: Metrics = {};
      for (const k of keys) {
        metrics[k] = (rate[k] ?? 0) * scale;
        deltas[k] = metrics[k] - (target[k] ?? 0);
      }
      const deviation = deviationOf(metrics, target, keys, negligible);
      return {
        unit,
        scale,
        metrics,
        deltas,
        deviation,
        withinTolerance: deviation <= domain.tolerance,
        samePriority: unit.priority === current.unit.priority,
        usedElsewhere: used.has(unit.id),
        // Sort-only fields, stripped before returning.
        _downgrade: Math.max(0, current.unit.priority - unit.priority),
        _error: errorOf(metrics, target, keys, negligible),
      };
    })
    .sort(
      (a, b) =>
        Number(b.withinTolerance) - Number(a.withinTolerance) ||
        a._downgrade - b._downgrade ||
        b.unit.priority - a.unit.priority ||
        Number(a.usedElsewhere) - Number(b.usedElsewhere) ||
        a._error - b._error ||
        a.unit.id.localeCompare(b.unit.id),
    )
    .map(({ _downgrade, _error, ...option }) => option);

  return limit != null ? ranked.slice(0, limit) : ranked;
}
