/**
 * fedAvg.ts
 *
 * Federated Averaging (FedAvg) over sklearn LogisticRegression weight files.
 *
 * Re-uses the parser and ModelWeights type from weightComparison.ts so both
 * features share a single, tested parsing path.
 */

export { parsePythonWeightDict, type ModelWeights } from './weightComparison';
import { parsePythonWeightDict, type ModelWeights } from './weightComparison';
import axios from 'axios';

// ── Defense utilities ──────────────────────────────────────────────────────────

/**
 * Clip the L2 norm of the coefficient vector to `maxNorm`.
 *
 * Prevents a single poisoned or abnormally scaled model from dominating the
 * average. All other fields (intercept, scaler_*) are left untouched because
 * they operate on different scales and are naturally bounded by the data.
 *
 * If the coefficient norm is already ≤ maxNorm the weights are returned as-is.
 */
export function clipNorm(weights: ModelWeights, maxNorm: number): ModelWeights {
  const coeffs = weights.coefficients[0];
  const norm = Math.sqrt(coeffs.reduce((sum, c) => sum + c * c, 0));
  if (norm <= maxNorm || norm === 0) return weights;
  const scale = maxNorm / norm;
  return {
    ...weights,
    coefficients: [coeffs.map((c) => c * scale)],
  };
}

/** Dot product of two equal-length arrays. */
function _dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** L2 norm of an array. */
function _l2(a: number[]): number {
  return Math.sqrt(_dot(a, a));
}

/**
 * Cosine similarity between two vectors, returning 0 when either is the zero
 * vector (avoids division by zero on all-zero weight files).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const denom = _l2(a) * _l2(b);
  return denom === 0 ? 0 : _dot(a, b) / denom;
}

export interface CosineFilterResult {
  /** Weight files that passed the threshold. */
  kept: ModelWeights[];
  /** Original indices of files that were removed (0-based). */
  excludedIndices: number[];
  /** Per-file average cosine similarity to all other files. */
  similarities: number[];
}

/**
 * Filter out weight files whose average cosine similarity to the rest falls
 * below `threshold`.
 *
 * Compares the coefficient vectors only — these carry the model's learned
 * direction in weight-space and are the most meaningful signal for outlier
 * detection.
 *
 * Safety: if filtering would remove ALL files (threshold is too aggressive),
 * the original array is returned unmodified.
 *
 * With N < 3 files there are not enough peers to form a meaningful majority,
 * so filtering is skipped and all files are kept.
 */
export function filterByCosine(
  weights: ModelWeights[],
  threshold: number
): CosineFilterResult {
  const N = weights.length;

  // Need at least 3 to have a meaningful majority opinion.
  if (N < 3) {
    return {
      kept: weights,
      excludedIndices: [],
      similarities: new Array(N).fill(1),
    };
  }

  const vecs = weights.map((w) => w.coefficients[0]);

  // Average cosine similarity of each file to all others.
  const similarities = vecs.map((v, i) => {
    let sum = 0;
    for (let j = 0; j < N; j++) {
      if (i !== j) sum += cosineSimilarity(v, vecs[j]);
    }
    return sum / (N - 1);
  });

  const kept: ModelWeights[] = [];
  const excludedIndices: number[] = [];

  similarities.forEach((sim, i) => {
    if (sim >= threshold) {
      kept.push(weights[i]);
    } else {
      excludedIndices.push(i);
    }
  });

  // Safety valve: never exclude everything.
  if (kept.length === 0) {
    return { kept: weights, excludedIndices: [], similarities };
  }

  return { kept, excludedIndices, similarities };
}

// ── Core algorithm ─────────────────────────────────────────────────────────────

/**
 * Simple unweighted FedAvg over N weight files.
 *
 * Each numeric array field is averaged element-wise; `classes` is taken from
 * the first file (identical across chunks for the same classification task).
 *
 * Why unweighted: chunks are produced by the 50 KB byte-size splitter, so
 * row counts are approximately equal. A weighted variant would require storing
 * per-chunk row counts during the upload phase (planned future enhancement).
 */
export function federatedAverage(weights: ModelWeights[]): ModelWeights {
  if (weights.length === 0) {
    throw new Error('federatedAverage requires at least one weight file.');
  }
  if (weights.length === 1) {
    return weights[0];
  }

  const N = weights.length;

  // Validate all files have the same number of coefficients
  const numCoeffs = weights[0].coefficients[0].length;
  for (let i = 1; i < N; i++) {
    if (weights[i].coefficients[0].length !== numCoeffs) {
      throw new Error(
        `Coefficient length mismatch: file 0 has ${numCoeffs} but file ${i} has ${weights[i].coefficients[0].length}`
      );
    }
    if (weights[i].scaler_mean.length !== numCoeffs) {
      throw new Error(
        `scaler_mean length mismatch at file ${i}`
      );
    }
  }

  const avgCoeffs = new Array<number>(numCoeffs).fill(0);
  let avgIntercept = 0;
  const avgScalerMean = new Array<number>(numCoeffs).fill(0);
  const avgScalerScale = new Array<number>(numCoeffs).fill(0);

  for (const w of weights) {
    for (let j = 0; j < numCoeffs; j++) {
      avgCoeffs[j] += w.coefficients[0][j] / N;
      avgScalerMean[j] += w.scaler_mean[j] / N;
      avgScalerScale[j] += w.scaler_scale[j] / N;
    }
    avgIntercept += w.intercept[0] / N;
  }

  return {
    coefficients: [avgCoeffs],
    intercept: [avgIntercept],
    classes: weights[0].classes,
    scaler_mean: avgScalerMean,
    scaler_scale: avgScalerScale,
  };
}

// ── Serialiser ─────────────────────────────────────────────────────────────────

/**
 * Serialize a ModelWeights object back to the Python repr()-style string that
 * matches the original weight file format (single quotes, no extra spaces).
 *
 * This makes the global model downloadable in the same format the trainer
 * nodes produce, so it can be loaded by existing Python inference code.
 */
export function serializeWeightsToString(weights: ModelWeights): string {
  const pyList = (arr: number[]): string =>
    '[' + arr.map((n) => String(n)).join(', ') + ']';
  const pyMatrix = (mat: number[][]): string =>
    '[' + mat.map(pyList).join(', ') + ']';

  return (
    `{'coefficients': ${pyMatrix(weights.coefficients)}, ` +
    `'intercept': ${pyList(weights.intercept)}, ` +
    `'classes': ${pyList(weights.classes)}, ` +
    `'scaler_mean': ${pyList(weights.scaler_mean)}, ` +
    `'scaler_scale': ${pyList(weights.scaler_scale)}}`
  );
}

// ── Download helper ────────────────────────────────────────────────────────────

/**
 * Fetch the raw text content of a weight file from its gateway URL.
 */
export async function fetchWeightFileContent(url: string): Promise<string> {
  const response = await axios.get<string>(url, { responseType: 'text' });
  const data =
    typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);

  // Guard against a misresolved URL (e.g. a bare CID fetched relative to the
  // dev server) returning the app's own index.html — which otherwise fails
  // downstream with a cryptic "Unexpected token '<'". Fail fast and clearly.
  const contentType = String(response.headers?.['content-type'] ?? '');
  if (contentType.includes('text/html') || data.trimStart().startsWith('<')) {
    throw new Error(
      `Weight file fetch returned HTML, not weights — likely a bad/relative ` +
        `URL or an unreachable gateway. URL: ${url}`
    );
  }
  return data;
}

/**
 * Download all weight files at the given URLs, parse each, and return the
 * array of parsed ModelWeights ready for averaging.
 *
 * Calls `onProgress(i, total)` as each file finishes loading.
 */
export async function loadAllWeights(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<ModelWeights[]> {
  const results: ModelWeights[] = [];
  for (let i = 0; i < urls.length; i++) {
    const raw = await fetchWeightFileContent(urls[i]);
    results.push(parsePythonWeightDict(raw));
    onProgress?.(i + 1, urls.length);
  }
  return results;
}

// ── Browser download trigger ───────────────────────────────────────────────────

/**
 * Trigger a browser/Electron file-save for a plain-text string.
 * Uses a Blob URL so no server round-trip is needed.
 */
export function downloadStringAsFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
