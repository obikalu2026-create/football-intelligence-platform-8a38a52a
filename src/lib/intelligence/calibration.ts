// Evaluation metrics: Brier score, log-loss, accuracy.
export function brierScore(probs: number[], outcomes: number[]): number {
  if (probs.length !== outcomes.length || probs.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const d = probs[i] - outcomes[i];
    s += d * d;
  }
  return s / probs.length;
}

export function logLoss(probs: number[], outcomes: number[], eps = 1e-9): number {
  if (probs.length !== outcomes.length || probs.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = Math.min(1 - eps, Math.max(eps, probs[i]));
    s += -(outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p));
  }
  return s / probs.length;
}

export function accuracy(predicted: string[], actual: string[]): number {
  if (predicted.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i < predicted.length; i++) if (predicted[i] === actual[i]) hits++;
  return hits / predicted.length;
}
