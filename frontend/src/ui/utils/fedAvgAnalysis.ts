/**
 * fedAvgAnalysis.ts
 *
 * Post-aggregation analysis utilities for Phase 6.
 * Pure functions — no React, no async, no side effects.
 */

import type { ModelWeights } from './fedAvg';

// ── Norm ──────────────────────────────────────────────────────────────────────

/** L2 norm of a model's coefficient vector. */
export function coefficientNorm(weights: ModelWeights): number {
  const c = weights.coefficients[0];
  return Math.sqrt(c.reduce((s, v) => s + v * v, 0));
}

// ── Convergence Report ────────────────────────────────────────────────────────

export interface FeatureStats {
  featureIndex: number;
  /** Global (averaged) coefficient value for this feature. */
  globalValue: number;
  /** Standard deviation of per-trainer values around the mean. */
  stdDev: number;
  min: number;
  max: number;
  range: number;
  /** One entry per trainer in the order passed to computeConvergence. */
  perTrainer: number[];
}

export interface ConvergenceReport {
  features: FeatureStats[];
  avgStdDev: number;
  tightestFeatureIndex: number;
  mostSpreadFeatureIndex: number;
}

/**
 * Compute per-feature convergence statistics across the trainer weight files
 * that were kept after filtering. Low avgStdDev signals strong inter-trainer
 * agreement — the primary proof that FedAvg succeeded.
 */
export function computeConvergence(
  trainerWeights: ModelWeights[],
  globalModel: ModelWeights
): ConvergenceReport {
  const N = trainerWeights.length;
  const numFeatures = globalModel.coefficients[0].length;

  const features: FeatureStats[] = [];

  for (let f = 0; f < numFeatures; f++) {
    const vals = trainerWeights.map((w) => w.coefficients[0][f]);
    const mean = vals.reduce((s, v) => s + v, 0) / N;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / N;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    features.push({
      featureIndex: f,
      globalValue: globalModel.coefficients[0][f],
      stdDev,
      min,
      max,
      range: max - min,
      perTrainer: vals,
    });
  }

  const avgStdDev = features.reduce((s, f) => s + f.stdDev, 0) / numFeatures;

  let tightestFeatureIndex = 0;
  let mostSpreadFeatureIndex = 0;
  features.forEach((f, i) => {
    if (f.stdDev < features[tightestFeatureIndex].stdDev) tightestFeatureIndex = i;
    if (f.stdDev > features[mostSpreadFeatureIndex].stdDev) mostSpreadFeatureIndex = i;
  });

  return { features, avgStdDev, tightestFeatureIndex, mostSpreadFeatureIndex };
}

// ── Feature Importance ────────────────────────────────────────────────────────

export interface FeatureImportance {
  featureIndex: number;
  absCoeff: number;
  coefficient: number;
  direction: 'positive' | 'negative';
}

/**
 * Rank all features by absolute coefficient value in the global model.
 * Returns descending order — index 0 is the most influential feature.
 */
export function rankFeatureImportance(globalModel: ModelWeights): FeatureImportance[] {
  return globalModel.coefficients[0]
    .map(
      (coeff, i): FeatureImportance => ({
        featureIndex: i,
        absCoeff: Math.abs(coeff),
        coefficient: coeff,
        direction: coeff >= 0 ? 'positive' : 'negative',
      })
    )
    .sort((a, b) => b.absCoeff - a.absCoeff);
}

// ── Model Comparison ──────────────────────────────────────────────────────────

export interface ComparisonMetrics {
  /** L2 distance between the two coefficient vectors. */
  l2Distance: number;
  /** Cosine similarity between the two coefficient vectors (1 = identical direction). */
  cosineSimilarity: number;
  /** Largest absolute per-feature delta. */
  maxFeatureDelta: number;
  /** Feature index of the largest delta. */
  maxDeltaFeatureIndex: number;
  /** Absolute delta per feature: |baseline[f] - defended[f]|. */
  perFeatureDelta: number[];
  /** Relative delta per feature as a percentage of the baseline value. */
  perFeatureDeltaPercent: number[];
}

/**
 * Quantify the difference between a baseline (undefended) global model and
 * a defended one. Used in Baseline Comparison Mode.
 */
export function compareGlobalModels(
  baseline: ModelWeights,
  defended: ModelWeights
): ComparisonMetrics {
  const a = baseline.coefficients[0];
  const b = defended.coefficients[0];

  const perFeatureDelta = a.map((v, i) => Math.abs(v - b[i]));
  const perFeatureDeltaPercent = a.map((v, i) =>
    Math.abs(v) < 1e-10 ? 0 : (Math.abs(v - b[i]) / Math.abs(v)) * 100
  );

  const l2Distance = Math.sqrt(perFeatureDelta.reduce((s, d) => s + d * d, 0));

  const dotAB = a.reduce((s, v, i) => s + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  const cosineSimilarity = normA === 0 || normB === 0 ? 0 : dotAB / (normA * normB);

  let maxFeatureDelta = 0;
  let maxDeltaFeatureIndex = 0;
  perFeatureDelta.forEach((d, i) => {
    if (d > maxFeatureDelta) {
      maxFeatureDelta = d;
      maxDeltaFeatureIndex = i;
    }
  });

  return {
    l2Distance,
    cosineSimilarity,
    maxFeatureDelta,
    maxDeltaFeatureIndex,
    perFeatureDelta,
    perFeatureDeltaPercent,
  };
}

// ── Clip Report ───────────────────────────────────────────────────────────────

export interface ClipReport {
  fileIndex: number;
  trainerAddress: string;
  originalNorm: number;
  /** True if the file was actually clipped (i.e. its norm exceeded maxNorm). */
  clipped: boolean;
  clippedNorm: number;
}

/**
 * Build per-file norm-clipping reports by comparing weights before and after
 * applying clipNorm. Pass the raw weights as `before` and the clipped array
 * as `after`; trainerAddresses should be index-aligned with both arrays.
 */
export function buildClipReports(
  before: ModelWeights[],
  after: ModelWeights[],
  trainerAddresses: string[]
): ClipReport[] {
  return before.map((w, i) => {
    const originalNorm = coefficientNorm(w);
    const clippedNorm = coefficientNorm(after[i]);
    return {
      fileIndex: i,
      trainerAddress: trainerAddresses[i] ?? `Trainer #${i + 1}`,
      originalNorm,
      clipped: clippedNorm < originalNorm - 1e-10,
      clippedNorm,
    };
  });
}
