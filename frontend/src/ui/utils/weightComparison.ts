/**
 * weightComparison.ts
 *
 * Utilities for parsing Python-repr weight strings produced by the trainer
 * nodes, and numerically comparing two weight dicts to verify deterministic
 * replication.
 *
 * Weight files are stored as Python repr() output, e.g.
 *   {'coefficients': [[0.439...]], 'intercept': [-3.08...], 'classes': [0, 1],
 *    'scaler_mean': [...], 'scaler_scale': [...]}
 */

export interface ModelWeights {
  coefficients: number[][];
  intercept: number[];
  classes: number[];
  scaler_mean: number[];
  scaler_scale: number[];
}

export interface ComparisonResult {
  /** True when every parameter is within the specified tolerance */
  match: boolean;
  /** Largest absolute difference found across all numeric parameters */
  maxDeviation: number;
  /** Max deviation specifically in the coefficients array */
  coefficientDeviation: number;
  /** Max deviation in the intercept array */
  interceptDeviation: number;
  /** Max deviation in scaler_mean */
  scalerMeanDeviation: number;
  /** Max deviation in scaler_scale */
  scalerScaleDeviation: number;
  /** Human-readable summary lines */
  details: string[];
}

/**
 * Convert a Python repr()-style dict string into a parsed ModelWeights object.
 *
 * Handles:
 *  - Single quotes → double quotes
 *  - Python True/False/None → JSON true/false/null
 *  - Trailing whitespace / newlines
 */
export function parsePythonWeightDict(raw: string): ModelWeights {
  const jsonStr = raw
    .trim()
    // Python single-quoted strings → JSON double-quoted
    .replace(/'/g, '"')
    // Python boolean/null literals
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Failed to parse weight file as JSON after Python→JSON conversion.\n` +
        `Parse error: ${(err as Error).message}\n` +
        `First 200 chars of converted string: ${jsonStr.slice(0, 200)}`
    );
  }

  // Validate expected keys
  const required = ['coefficients', 'intercept', 'classes', 'scaler_mean', 'scaler_scale'];
  for (const key of required) {
    if (!(key in parsed)) {
      throw new Error(`Parsed weight dict is missing required key: '${key}'`);
    }
  }

  return {
    coefficients: parsed.coefficients as number[][],
    intercept: parsed.intercept as number[],
    classes: parsed.classes as number[],
    scaler_mean: parsed.scaler_mean as number[],
    scaler_scale: parsed.scaler_scale as number[],
  };
}

/**
 * Compute the maximum absolute difference between two flat number arrays.
 * Returns 0 when both arrays are empty. Throws if lengths differ.
 */
function maxAbsDiff(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Array length mismatch in comparison: ${a.length} vs ${b.length}`
    );
  }
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    max = Math.max(max, Math.abs(a[i] - b[i]));
  }
  return max;
}

/**
 * Compare two parsed ModelWeights objects.
 *
 * @param submitted   Weights fetched from IPFS (what the trainer claimed)
 * @param recomputed  Weights produced locally by re-running the same model
 * @param tolerance   Absolute deviation threshold below which values are
 *                    considered equal (default 1e-6, handles float repr noise)
 */
export function compareWeights(
  submitted: ModelWeights,
  recomputed: ModelWeights,
  tolerance = 1e-6
): ComparisonResult {
  const details: string[] = [];

  // Flatten coefficients: ModelWeights has shape [[c0, c1, ...]] (1 × N matrix)
  const submittedCoeffs = submitted.coefficients.flat();
  const recomputedCoeffs = recomputed.coefficients.flat();

  const coeffDev = maxAbsDiff(submittedCoeffs, recomputedCoeffs);
  const interceptDev = maxAbsDiff(submitted.intercept, recomputed.intercept);
  const scalerMeanDev = maxAbsDiff(submitted.scaler_mean, recomputed.scaler_mean);
  const scalerScaleDev = maxAbsDiff(submitted.scaler_scale, recomputed.scaler_scale);

  const overallMax = Math.max(coeffDev, interceptDev, scalerMeanDev, scalerScaleDev);
  const match = overallMax <= tolerance;

  const fmt = (n: number) =>
    n === 0 ? '0' : n.toExponential(3);

  details.push(`Coefficient deviation:  ${fmt(coeffDev)}${coeffDev > tolerance ? ' ⚠' : ''}`);
  details.push(`Intercept deviation:    ${fmt(interceptDev)}${interceptDev > tolerance ? ' ⚠' : ''}`);
  details.push(`Scaler mean deviation:  ${fmt(scalerMeanDev)}${scalerMeanDev > tolerance ? ' ⚠' : ''}`);
  details.push(`Scaler scale deviation: ${fmt(scalerScaleDev)}${scalerScaleDev > tolerance ? ' ⚠' : ''}`);
  details.push(`Overall max deviation:  ${fmt(overallMax)}`);
  details.push(`Tolerance threshold:    ${fmt(tolerance)}`);
  details.push(match ? 'Result: MATCH ✓' : 'Result: MISMATCH ✗');

  return {
    match,
    maxDeviation: overallMax,
    coefficientDeviation: coeffDev,
    interceptDeviation: interceptDev,
    scalerMeanDeviation: scalerMeanDev,
    scalerScaleDeviation: scalerScaleDev,
    details,
  };
}
