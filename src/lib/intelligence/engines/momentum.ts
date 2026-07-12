import { clamp } from "../util";
import type { TeamFormInput } from "../types";

/**
 * Momentum rating (0..100). Weights most recent matches more heavily.
 * Uses form_string with exponential decay.
 */
export function momentumRating(form: TeamFormInput | null | undefined): number {
  if (!form) return 50;
  if (form.momentum_score != null) return clamp(form.momentum_score);
  if (!form.form_string) return 50;
  const results = [...form.form_string.toUpperCase()];
  let weighted = 0;
  let totalWeight = 0;
  results.forEach((c, i) => {
    // Most recent first (index 0). Weight = e^(-0.3*i)
    const w = Math.exp(-0.3 * i);
    const pts = c === "W" ? 3 : c === "D" ? 1 : 0;
    weighted += pts * w;
    totalWeight += 3 * w;
  });
  return totalWeight === 0 ? 50 : clamp((weighted / totalWeight) * 100);
}
