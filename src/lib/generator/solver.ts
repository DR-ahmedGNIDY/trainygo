/**
 * Deterministic gram solver.
 *
 * Given a small set of foods (their macros PER GRAM) and a meal's calorie +
 * macro targets, find grams for each food so the totals hit the target. This is
 * a bounded, non-negative linear least-squares problem — we solve it with
 * coordinate descent: repeatedly set each food's grams to the value that exactly
 * minimises the weighted squared error while holding the others fixed. Each 1-D
 * step has a closed form (the error is quadratic in a single food's grams), so
 * it converges in a handful of sweeps with no brute force and no randomness.
 */

export interface SolverFood {
  /** Macros contributed per gram of this food. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  minGram: number;
  maxGram: number;
  startGram: number;
}

export interface SolverTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Macros are weighted highest: calories ≈ 4·protein + 4·carbs + 9·fat, so once
// the three macros land the calorie total follows. Calories carry a small
// weight only as a tiebreaker. Weighting calories high instead would
// double-count and let the individual macros drift.
const W = { calories: 0.2, protein: 1, carbs: 1, fat: 1 };
const SWEEPS = 120;
const EPS = 1e-6;

type MacroKey = "calories" | "protein" | "carbs" | "fat";
const KEYS: MacroKey[] = ["calories", "protein", "carbs", "fat"];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Solve for grams. Returns one value per input food, in order.
 * Targets are floored at a small epsilon so a zero target can't divide by zero.
 */
export function solveGrams(foods: SolverFood[], target: SolverTarget): number[] {
  if (foods.length === 0) return [];

  const t: Record<MacroKey, number> = {
    calories: Math.max(target.calories, EPS),
    protein: Math.max(target.protein, EPS),
    carbs: Math.max(target.carbs, EPS),
    fat: Math.max(target.fat, EPS),
  };

  const grams = foods.map((f) => clamp(f.startGram, f.minGram, f.maxGram));

  // Running totals across all foods for each macro.
  const total: Record<MacroKey, number> = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const recompute = () => {
    for (const k of KEYS) {
      total[k] = foods.reduce((s, f, i) => s + f[k] * grams[i], 0);
    }
  };
  recompute();

  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      // Error E as a function of grams[i] is A*g^2 + B*g + C. Its minimum is at
      // g* = -B/(2A). Here `others_k` is the macro total excluding food i.
      let A = 0;
      let B = 0;
      for (const k of KEYS) {
        const w = W[k] / (t[k] * t[k]);
        const mi = f[k];
        const others = total[k] - f[k] * grams[i];
        A += w * mi * mi;
        B += 2 * w * mi * (others - t[k]);
      }
      const next = A > EPS ? clamp(-B / (2 * A), f.minGram, f.maxGram) : grams[i];
      if (next !== grams[i]) {
        const delta = next - grams[i];
        grams[i] = next;
        for (const k of KEYS) total[k] += f[k] * delta;
      }
    }
  }

  return grams;
}
