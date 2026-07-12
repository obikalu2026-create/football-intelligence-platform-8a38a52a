import { clamp } from "../util";
import type { TeamFormInput } from "../types";

/**
 * Form rating (0..100) from recent 5 fixtures. Points/15 * 100.
 * Falls back to parsing form_string when points_last_5 is missing.
 */
export function formRating(form: TeamFormInput | null | undefined): number {
  if (!form) return 50;
  if (form.points_last_5 != null) return clamp((form.points_last_5 / 15) * 100);
  if (form.form_string) {
    const pts = [...form.form_string.toUpperCase()].reduce(
      (a, c) => a + (c === "W" ? 3 : c === "D" ? 1 : 0),
      0,
    );
    return clamp((pts / (form.form_string.length * 3)) * 100);
  }
  return 50;
}
