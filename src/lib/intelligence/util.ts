// Small math utilities used across engines.

export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Squash a value with sensible min/max to a 0..100 scale. */
export const normalize = (v: number, min: number, max: number) => {
  if (max === min) return 50;
  return clamp(((v - min) / (max - min)) * 100);
};

export const safeDiv = (a: number, b: number, fallback = 0) =>
  b === 0 || !Number.isFinite(b) ? fallback : a / b;

export const round = (v: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export const mean = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

/** Poisson pmf. */
export function poisson(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // log-space for numerical stability
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}
