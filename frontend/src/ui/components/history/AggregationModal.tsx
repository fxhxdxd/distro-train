import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  GitMerge,
  Loader2,
  Shield,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TrainingProject } from '../../pages/TrainingHistory';
import type { WeightEntry } from '../../utils/hederaHelper';
import {
  clipNorm,
  filterByCosine,
  federatedAverage,
  loadAllWeights,
  serializeWeightsToString,
  downloadStringAsFile,
  parsePythonWeightDict,
  type ModelWeights,
} from '../../utils/fedAvg';
import {
  buildClipReports,
  computeConvergence,
  rankFeatureImportance,
  compareGlobalModels,
  type ClipReport,
  type ConvergenceReport,
  type FeatureImportance,
  type ComparisonMetrics,
} from '../../utils/fedAvgAnalysis';
import { updateTrainingHistoryItem } from '../../utils/historyHelper';

// ── Types ──────────────────────────────────────────────────────────────────────

type AggregationStatus = 'idle' | 'loading' | 'done' | 'error';

interface DefenseSettings {
  normClipping: boolean;
  maxNorm: number;
  cosineFilter: boolean;
  cosineThreshold: number;
  /** Run a second undefended pass for side-by-side comparison. */
  comparisonMode: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function displayArray(arr: number[], maxItems = 6): string {
  if (arr.length <= maxItems) {
    return '[' + arr.map((n) => n.toPrecision(6)).join(', ') + ']';
  }
  const head = arr.slice(0, maxItems).map((n) => n.toPrecision(6));
  return '[' + head.join(', ') + `, … +${arr.length - maxItems} more]`;
}

/** Auto-generated plain-English description of defense impact. */
function buildImpactSummary(
  metrics: ComparisonMetrics,
  excludedCount: number,
  clippedCount: number
): string {
  const parts: string[] = [];
  if (clippedCount > 0) parts.push(`Norm clipping adjusted ${clippedCount} file(s).`);
  if (excludedCount > 0)
    parts.push(`Cosine filter excluded ${excludedCount} outlier file(s) from the average.`);

  const cos = metrics.cosineSimilarity.toFixed(4);
  const l2 = metrics.l2Distance.toFixed(4);
  if (metrics.cosineSimilarity > 0.999) {
    parts.push(
      `Defended model is nearly identical to the baseline (cosine = ${cos}, L2 = ${l2}).`
    );
  } else if (metrics.cosineSimilarity > 0.99) {
    parts.push(
      `Defended model is very close to the baseline (cosine = ${cos}, L2 = ${l2}).`
    );
  } else if (metrics.cosineSimilarity > 0.95) {
    parts.push(`Defense had moderate impact (cosine = ${cos}, L2 = ${l2}).`);
  } else {
    parts.push(
      `Defense significantly shifted the model direction (cosine = ${cos}, L2 = ${l2}).`
    );
  }
  parts.push(
    `Largest single-feature shift at feature #${metrics.maxDeltaFeatureIndex} (Δ = ${metrics.maxFeatureDelta.toFixed(6)}).`
  );
  return parts.join(' ');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const ParameterRow = ({ label, values }: { label: string; values: number[] }) => (
  <div className='bg-background rounded-lg border border-border/50 p-3'>
    <p className='text-xs font-medium text-text-secondary mb-1'>{label}</p>
    <p className='text-xs font-mono text-text-primary break-all'>{displayArray(values)}</p>
    <p className='text-xs text-text-secondary mt-1'>{values.length} values</p>
  </div>
);

const CollapsiblePanel = ({
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className='border border-border rounded-lg overflow-hidden'>
    <button
      onClick={onToggle}
      className='w-full flex items-center justify-between px-3 py-2.5 bg-background hover:bg-surface transition-colors'
    >
      <span className='flex items-center gap-2 text-xs font-medium text-text-secondary'>
        {icon}
        {title}
        {badge && (
          <span className='px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-semibold'>
            {badge}
          </span>
        )}
      </span>
      {isOpen ? (
        <ChevronUp size={13} className='text-text-secondary' />
      ) : (
        <ChevronDown size={13} className='text-text-secondary' />
      )}
    </button>
    {isOpen && (
      <div className='px-3 py-3 space-y-4 bg-surface border-t border-border'>{children}</div>
    )}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

interface AggregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: TrainingProject;
  /** Called after successful aggregation so the parent can update its state */
  onGlobalWeightsSaved?: (globalWeights: string) => void;
}

export const AggregationModal = ({
  isOpen,
  onClose,
  project,
  onGlobalWeightsSaved,
}: AggregationModalProps) => {
  // ── Core state ───────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<AggregationStatus>('idle');
  const [progress, setProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [globalModel, setGlobalModel] = useState<ModelWeights | null>(null);
  const [globalWeightsStr, setGlobalWeightsStr] = useState<string>('');
  const [excludedIndices, setExcludedIndices] = useState<number[]>([]);
  const [similarities, setSimilarities] = useState<number[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defense, setDefense] = useState<DefenseSettings>({
    normClipping: false,
    maxNorm: 10,
    cosineFilter: false,
    cosineThreshold: 0.5,
    comparisonMode: false,
  });

  // ── Phase 6 analysis state ───────────────────────────────────────────────────
  const [clipReports, setClipReports] = useState<ClipReport[]>([]);
  const [convergenceReport, setConvergenceReport] = useState<ConvergenceReport | null>(null);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([]);
  const [baselineModel, setBaselineModel] = useState<ModelWeights | null>(null);
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetrics | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [defenseReportOpen, setDefenseReportOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // If globalWeights already computed (persisted), show immediately
  const precomputed = project.globalWeights ?? null;
  const entries: WeightEntry[] = useMemo(
    () => project.weightsMetadata ?? [],
    [project.weightsMetadata]
  );

  // Select all weight files by default when entries change
  useEffect(() => {
    setSelectedIndices(new Set(entries.map((_, i) => i)));
  }, [entries]);

  const toggleIndex = (i: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectedEntries = entries.filter((_, i) => selectedIndices.has(i));

  // ── Run FedAvg ───────────────────────────────────────────────────────────────
  const runAggregation = useCallback(async () => {
    const chosen = entries.filter((_, i) => selectedIndices.has(i));
    if (chosen.length < 2) {
      toast.error('Select at least 2 weight files for federated averaging.');
      return;
    }

    setStatus('loading');
    setGlobalModel(null);
    setGlobalWeightsStr('');
    setErrorMessage('');
    setExcludedIndices([]);
    setSimilarities([]);
    setClipReports([]);
    setConvergenceReport(null);
    setFeatureImportance([]);
    setBaselineModel(null);
    setComparisonMetrics(null);

    try {
      setProgress(`Downloading weight file 1 of ${chosen.length}…`);

      // Download once — shared by both baseline and defended runs
      const rawWeights = await loadAllWeights(
        chosen.map((e) => e.url),
        (loaded, total) => {
          if (loaded < total) {
            setProgress(`Downloading weight file ${loaded + 1} of ${total}…`);
          } else {
            setProgress('Applying defense filters…');
          }
        }
      );

      // ── Baseline (undefended) — always computed ───────────────────────────
      const baseline = federatedAverage(rawWeights);

      // ── Defended pipeline ─────────────────────────────────────────────────
      let parsedWeights = [...rawWeights];

      // Stage 1: Norm clipping
      if (defense.normClipping) {
        setProgress(`Clipping coefficient norms to ${defense.maxNorm}…`);
        const clipped = parsedWeights.map((w) => clipNorm(w, defense.maxNorm));
        setClipReports(
          buildClipReports(
            parsedWeights,
            clipped,
            chosen.map((e) => e.trainerAddress)
          )
        );
        parsedWeights = clipped;
      }

      // Stage 2: Cosine similarity filtering
      if (defense.cosineFilter && parsedWeights.length >= 3) {
        setProgress('Filtering outliers by cosine similarity…');
        const result = filterByCosine(parsedWeights, defense.cosineThreshold);
        setSimilarities(result.similarities);
        if (result.excludedIndices.length > 0) {
          setExcludedIndices(result.excludedIndices);
          toast.info(
            `Cosine filter excluded ${result.excludedIndices.length} outlier file(s) from averaging.`
          );
          parsedWeights = result.kept;
        }
      } else if (defense.cosineFilter) {
        setSimilarities(new Array(parsedWeights.length).fill(1));
      }

      setProgress('Computing federated average…');
      const averaged = federatedAverage(parsedWeights);
      const serialized = serializeWeightsToString(averaged);

      setGlobalModel(averaged);
      setGlobalWeightsStr(serialized);

      // ── Dual-run comparison (only when defense + comparison mode) ─────────
      const anyDefense = defense.normClipping || defense.cosineFilter;
      if (anyDefense && defense.comparisonMode) {
        setBaselineModel(baseline);
        setComparisonMetrics(compareGlobalModels(baseline, averaged));
      }

      // ── Post-aggregation analysis ─────────────────────────────────────────
      setProgress('Analyzing convergence…');
      setConvergenceReport(computeConvergence(parsedWeights, averaged));
      setFeatureImportance(rankFeatureImportance(averaged));

      setStatus('done');
      setProgress('');

      // Persist to history so the result survives page reloads
      await updateTrainingHistoryItem({
        projectId: project.id,
        globalWeights: serialized,
      });
      onGlobalWeightsSaved?.(serialized);

      toast.success('Federated averaging complete!');
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMessage(msg);
      setStatus('error');
      setProgress('');
      toast.error(`Aggregation failed: ${msg}`);
    }
  }, [entries, selectedIndices, project.id, onGlobalWeightsSaved, defense]);

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const content = globalWeightsStr || precomputed;
    if (!content) return;
    downloadStringAsFile(content, `${project.projectName}_fedavg_global_model.txt`);
    toast.success('Global model downloaded!');
  };

  // Parse precomputed for display if no in-session result yet
  const displayModel: ModelWeights | null = (() => {
    if (globalModel) return globalModel;
    if (precomputed) {
      try {
        return parsePythonWeightDict(precomputed);
      } catch {
        return null;
      }
    }
    return null;
  })();

  const isRunning = status === 'loading';
  const hasResult = status === 'done' || !!precomputed;
  const clippedCount = clipReports.filter((r) => r.clipped).length;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-200'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-150'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/60 backdrop-blur-sm' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-200'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-150'
              leaveFrom='opacity-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-full max-w-2xl glass-panel rounded-2xl shadow-2xl overflow-hidden'>
                {/* Header */}
                <div className='bg-gradient-to-r from-primary-light/10 to-primary/10 px-6 py-5 border-b border-white/10'>
                  <div className='flex items-center justify-between'>
                    <Dialog.Title className='flex items-center gap-3 text-lg font-bold text-text-primary'>
                      <div className='w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30'>
                        <GitMerge size={16} className='text-primary' />
                      </div>
                      Federated Averaging
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      disabled={isRunning}
                      className='text-text-secondary hover:text-text-primary transition-colors'
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className='text-text-secondary text-xs mt-2'>
                    Aggregates all trained weight files into a single global model using FedAvg
                    (simple unweighted average).
                  </p>
                </div>

                {/* Body */}
                <div className='p-6 space-y-5 max-h-[75vh] overflow-y-auto'>
                  {/* Input weight files — selectable */}
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <p className='text-xs font-medium text-text-secondary uppercase tracking-wider'>
                        Input Weight Files ({selectedEntries.length}/{entries.length} selected)
                      </p>
                      <button
                        onClick={() => {
                          if (selectedIndices.size === entries.length) {
                            setSelectedIndices(new Set());
                          } else {
                            setSelectedIndices(new Set(entries.map((_, i) => i)));
                          }
                        }}
                        className='text-[10px] text-primary hover:text-primary/80 transition-colors'
                      >
                        {selectedIndices.size === entries.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    {entries.length === 0 ? (
                      <p className='text-xs text-text-secondary italic'>
                        No attributed weight files found. Run a training session with v2
                        attribution support to enable FedAvg.
                      </p>
                    ) : (
                      <div className='space-y-2'>
                        {entries.map((entry, i) => {
                          const isSelected = selectedIndices.has(i);
                          return (
                            <button
                              key={entry.cid}
                              type='button'
                              onClick={() => toggleIndex(i)}
                              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                isSelected
                                  ? 'bg-background border-border'
                                  : 'bg-background/50 border-border/30 opacity-50'
                              }`}
                            >
                              <input
                                type='checkbox'
                                checked={isSelected}
                                readOnly
                                className='accent-primary shrink-0 pointer-events-none'
                              />
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-1.5 mb-0.5'>
                                  <span className='text-xs font-medium text-text-primary'>
                                    Weight File #{i + 1}
                                  </span>
                                  <span className='text-xs text-text-secondary'>·</span>
                                  <User size={10} className='text-primary/70' />
                                  <span className='text-xs font-mono text-primary truncate'>
                                    {entry.trainerAddress}
                                  </span>
                                </div>
                                <p className='text-xs font-mono text-text-secondary truncate'>
                                  {entry.cid}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Method info */}
                  <div className='bg-primary/5 border border-primary/20 rounded-lg p-3'>
                    <p className='text-xs font-medium text-primary mb-1'>
                      Method: Simple FedAvg (unweighted)
                    </p>
                    <p className='text-xs text-text-secondary'>
                      Each weight file contributes equally. All chunks are ~50 KB, so row counts
                      are approximately uniform — a weighted average would give nearly identical
                      results.
                    </p>
                  </div>

                  {/* Defense settings */}
                  <div className='border border-border rounded-lg overflow-hidden'>
                    <button
                      onClick={() => setSettingsOpen((o) => !o)}
                      className='w-full flex items-center justify-between px-3 py-2.5 bg-background hover:bg-surface transition-colors'
                    >
                      <span className='flex items-center gap-2 text-xs font-medium text-text-secondary'>
                        <Shield size={13} className='text-primary/70' />
                        Defense Settings
                        {(defense.normClipping || defense.cosineFilter) && (
                          <span className='px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-semibold'>
                            {[defense.normClipping && 'Norm', defense.cosineFilter && 'Cosine']
                              .filter(Boolean)
                              .join(' + ')}
                          </span>
                        )}
                      </span>
                      {settingsOpen ? (
                        <ChevronUp size={13} className='text-text-secondary' />
                      ) : (
                        <ChevronDown size={13} className='text-text-secondary' />
                      )}
                    </button>

                    {settingsOpen && (
                      <div className='px-3 py-3 space-y-4 bg-surface border-t border-border'>
                        {/* Norm clipping */}
                        <div>
                          <label className='flex items-center gap-2 cursor-pointer mb-2'>
                            <input
                              type='checkbox'
                              checked={defense.normClipping}
                              onChange={(e) =>
                                setDefense((d) => ({ ...d, normClipping: e.target.checked }))
                              }
                              className='accent-primary'
                            />
                            <span className='text-xs font-medium text-text-primary'>
                              Norm Clipping
                            </span>
                          </label>
                          <p className='text-xs text-text-secondary mb-2 pl-5'>
                            Clips each model's coefficient L2 norm to a maximum before averaging.
                            Prevents a single poisoned model from dominating the aggregate.
                          </p>
                          {defense.normClipping && (
                            <div className='flex items-center gap-2 pl-5'>
                              <span className='text-xs text-text-secondary'>Max norm:</span>
                              <input
                                type='number'
                                min={0.1}
                                step={0.5}
                                value={defense.maxNorm}
                                onChange={(e) =>
                                  setDefense((d) => ({
                                    ...d,
                                    maxNorm: Math.max(0.1, parseFloat(e.target.value) || 10),
                                  }))
                                }
                                className='w-20 px-2 py-1 text-xs bg-background border border-border rounded text-text-primary focus:outline-none focus:border-primary'
                              />
                            </div>
                          )}
                        </div>

                        {/* Cosine similarity filter */}
                        <div>
                          <label className='flex items-center gap-2 cursor-pointer mb-2'>
                            <input
                              type='checkbox'
                              checked={defense.cosineFilter}
                              onChange={(e) =>
                                setDefense((d) => ({ ...d, cosineFilter: e.target.checked }))
                              }
                              className='accent-primary'
                            />
                            <span className='text-xs font-medium text-text-primary'>
                              Cosine Similarity Filtering
                            </span>
                          </label>
                          <p className='text-xs text-text-secondary mb-2 pl-5'>
                            Excludes files whose average cosine similarity to the other models
                            falls below the threshold. Catches outlier or adversarial updates.
                            Requires ≥ 3 weight files.
                          </p>
                          {defense.cosineFilter && (
                            <div className='flex items-center gap-2 pl-5'>
                              <span className='text-xs text-text-secondary'>Threshold (0–1):</span>
                              <input
                                type='number'
                                min={0}
                                max={1}
                                step={0.05}
                                value={defense.cosineThreshold}
                                onChange={(e) =>
                                  setDefense((d) => ({
                                    ...d,
                                    cosineThreshold: Math.min(
                                      1,
                                      Math.max(0, parseFloat(e.target.value) || 0.5)
                                    ),
                                  }))
                                }
                                className='w-20 px-2 py-1 text-xs bg-background border border-border rounded text-text-primary focus:outline-none focus:border-primary'
                              />
                            </div>
                          )}
                        </div>

                        {/* Comparison mode — only shown when a defense is active */}
                        {(defense.normClipping || defense.cosineFilter) && (
                          <div className='border-t border-border/50 pt-3'>
                            <label className='flex items-center gap-2 cursor-pointer'>
                              <input
                                type='checkbox'
                                checked={defense.comparisonMode}
                                onChange={(e) =>
                                  setDefense((d) => ({ ...d, comparisonMode: e.target.checked }))
                                }
                                className='accent-primary'
                              />
                              <span className='text-xs font-medium text-text-primary'>
                                Baseline Comparison Mode
                              </span>
                            </label>
                            <p className='text-xs text-text-secondary mt-1 pl-5'>
                              Runs FedAvg twice — once without defenses (baseline) and once with —
                              then shows the quantitative difference. Useful for measuring defense
                              impact on the global model.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pre-computed banner */}
                  {precomputed && !globalModel && (
                    <div className='flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2'>
                      <CheckCircle2 size={14} className='text-green-400 shrink-0' />
                      <p className='text-xs text-green-400'>
                        Global model already computed — showing saved result. Re-run to refresh.
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {status === 'error' && errorMessage && (
                    <div className='bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
                      <p className='text-xs text-red-400 font-medium'>Error</p>
                      <p className='text-xs text-red-400/80 mt-1 break-all'>{errorMessage}</p>
                    </div>
                  )}

                  {/* Progress */}
                  {isRunning && progress && (
                    <div className='flex items-center gap-2 text-xs text-primary'>
                      <Loader2 size={14} className='animate-spin shrink-0' />
                      <span>{progress}</span>
                    </div>
                  )}

                  {/* Run button */}
                  <button
                    onClick={runAggregation}
                    disabled={isRunning || selectedEntries.length < 2}
                    className='w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-light to-primary text-white font-semibold rounded-lg hover:shadow-[0_0_24px_rgba(217,70,239,0.24)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {isRunning ? (
                      <>
                        <Loader2 size={16} className='animate-spin' />
                        Computing…
                      </>
                    ) : (
                      <>
                        <GitMerge size={16} />
                        {precomputed ? 'Re-run Federated Averaging' : 'Run Federated Averaging'}
                      </>
                    )}
                  </button>

                  {/* Results */}
                  {hasResult && displayModel && (
                    <div>
                      <div className='flex items-center justify-between mb-3'>
                        <p className='text-xs font-medium text-text-secondary uppercase tracking-wider'>
                          Global Model
                        </p>
                        <div className='flex items-center gap-1 text-xs text-text-secondary bg-surface px-2 py-1 rounded'>
                          <GitMerge size={10} />
                          {selectedEntries.length} files averaged
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <ParameterRow
                          label={`Coefficients (${displayModel.coefficients[0].length} features)`}
                          values={displayModel.coefficients[0]}
                        />
                        <ParameterRow label='Intercept' values={displayModel.intercept} />
                        <ParameterRow
                          label={`Scaler Mean (${displayModel.scaler_mean.length} features)`}
                          values={displayModel.scaler_mean}
                        />
                        <ParameterRow
                          label={`Scaler Scale (${displayModel.scaler_scale.length} features)`}
                          values={displayModel.scaler_scale}
                        />
                        <div className='bg-background rounded-lg border border-border/50 p-3'>
                          <p className='text-xs font-medium text-text-secondary mb-1'>Classes</p>
                          <p className='text-xs font-mono text-text-primary'>
                            {JSON.stringify(displayModel.classes)}
                          </p>
                        </div>
                      </div>

                      {/* Download */}
                      <button
                        onClick={handleDownload}
                        className='mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium border border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors'
                      >
                        <Download size={14} />
                        Download Global Model (.txt)
                      </button>
                    </div>
                  )}

                  {/* ── Phase 6: Model Analysis Panel ───────────────────────────────── */}
                  {status === 'done' && convergenceReport && (
                    <CollapsiblePanel
                      title='Model Analysis'
                      icon={<BarChart2 size={13} className='text-primary/70' />}
                      badge={`avgσ = ${convergenceReport.avgStdDev.toFixed(4)}`}
                      isOpen={analysisOpen}
                      onToggle={() => setAnalysisOpen((o) => !o)}
                    >
                      {/* Convergence summary */}
                      <div>
                        <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                          Convergence Report
                        </p>
                        <div className='grid grid-cols-3 gap-2 mb-3'>
                          <div className='bg-background rounded p-2 text-center'>
                            <p className='text-[10px] text-text-secondary'>Avg σ</p>
                            <p className='text-sm font-mono font-bold text-text-primary'>
                              {convergenceReport.avgStdDev.toFixed(4)}
                            </p>
                          </div>
                          <div className='bg-background rounded p-2 text-center'>
                            <p className='text-[10px] text-text-secondary'>Tightest</p>
                            <p className='text-sm font-mono font-bold text-green-400'>
                              F{convergenceReport.tightestFeatureIndex}
                            </p>
                            <p className='text-[9px] text-text-secondary'>
                              σ ={' '}
                              {convergenceReport.features[
                                convergenceReport.tightestFeatureIndex
                              ].stdDev.toFixed(4)}
                            </p>
                          </div>
                          <div className='bg-background rounded p-2 text-center'>
                            <p className='text-[10px] text-text-secondary'>Most Spread</p>
                            <p className='text-sm font-mono font-bold text-yellow-400'>
                              F{convergenceReport.mostSpreadFeatureIndex}
                            </p>
                            <p className='text-[9px] text-text-secondary'>
                              σ ={' '}
                              {convergenceReport.features[
                                convergenceReport.mostSpreadFeatureIndex
                              ].stdDev.toFixed(4)}
                            </p>
                          </div>
                        </div>

                        {/* Per-feature σ bars — top 10 by spread */}
                        <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                          Top 10 Features by Spread (σ)
                        </p>
                        <div className='space-y-1.5'>
                          {[...convergenceReport.features]
                            .sort((a, b) => b.stdDev - a.stdDev)
                            .slice(0, 10)
                            .map((f) => {
                              const maxSigma =
                                convergenceReport.features[
                                  convergenceReport.mostSpreadFeatureIndex
                                ].stdDev;
                              const barWidth = maxSigma > 0 ? (f.stdDev / maxSigma) * 100 : 0;
                              const barColor =
                                f.stdDev < 0.01
                                  ? 'bg-green-500'
                                  : f.stdDev < 0.05
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500';
                              return (
                                <div key={f.featureIndex} className='flex items-center gap-2'>
                                  <span className='text-[10px] font-mono text-text-secondary w-8 shrink-0'>
                                    F{f.featureIndex}
                                  </span>
                                  <div className='flex-1 bg-background rounded-full h-1.5 overflow-hidden'>
                                    <div
                                      className={`h-full rounded-full ${barColor}`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className='text-[10px] font-mono text-text-secondary w-16 text-right shrink-0'>
                                    σ={f.stdDev.toFixed(4)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Feature importance */}
                      {featureImportance.length > 0 && (
                        <div>
                          <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                            Top 10 Feature Importance (|coefficient|)
                          </p>
                          <div className='space-y-1.5'>
                            {featureImportance.slice(0, 10).map((f, rank) => {
                              const maxAbs = featureImportance[0].absCoeff;
                              const barWidth = maxAbs > 0 ? (f.absCoeff / maxAbs) * 100 : 0;
                              return (
                                <div key={f.featureIndex} className='flex items-center gap-2'>
                                  <span className='text-[10px] text-text-secondary w-4 shrink-0'>
                                    #{rank + 1}
                                  </span>
                                  <span className='text-[10px] font-mono text-text-secondary w-8 shrink-0'>
                                    F{f.featureIndex}
                                  </span>
                                  <div className='flex-1 bg-background rounded-full h-1.5 overflow-hidden'>
                                    <div
                                      className={`h-full rounded-full ${
                                        f.direction === 'positive' ? 'bg-blue-500' : 'bg-orange-500'
                                      }`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`text-[10px] font-mono w-20 text-right shrink-0 ${
                                      f.direction === 'positive'
                                        ? 'text-blue-400'
                                        : 'text-orange-400'
                                    }`}
                                  >
                                    {f.coefficient > 0 ? '+' : ''}
                                    {f.coefficient.toFixed(4)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Trainer contribution heatmap — top 5 features by importance */}
                      {featureImportance.length > 0 &&
                        convergenceReport.features.length > 0 &&
                        convergenceReport.features[0].perTrainer.length > 0 && (
                          <div>
                            <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                              Trainer Contribution Heatmap (Top 5 Features by |coefficient|)
                            </p>
                            <div className='overflow-x-auto'>
                              <table className='w-full text-[10px] font-mono border-separate border-spacing-0.5'>
                                <thead>
                                  <tr>
                                    <th className='text-left text-text-secondary pr-2 pb-1'>
                                      Trainer
                                    </th>
                                    {featureImportance.slice(0, 5).map((f) => (
                                      <th
                                        key={f.featureIndex}
                                        className='text-center text-text-secondary px-2 pb-1'
                                      >
                                        F{f.featureIndex}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {convergenceReport.features[0].perTrainer.map((_, ti) => (
                                    <tr key={ti}>
                                      <td className='text-text-secondary pr-2 py-0.5 max-w-[72px] truncate'>
                                        #{ti + 1}
                                      </td>
                                      {featureImportance.slice(0, 5).map((fi) => {
                                        const fStats =
                                          convergenceReport.features[fi.featureIndex];
                                        const val = fStats.perTrainer[ti];
                                        const diff = Math.abs(val - fStats.globalValue);
                                        const deviations =
                                          fStats.stdDev > 0 ? diff / fStats.stdDev : 0;
                                        const cellClass =
                                          deviations <= 1
                                            ? 'bg-green-500/20 text-green-400'
                                            : deviations <= 2
                                              ? 'bg-yellow-500/20 text-yellow-400'
                                              : 'bg-red-500/20 text-red-400';
                                        return (
                                          <td
                                            key={fi.featureIndex}
                                            className={`text-center px-2 py-0.5 rounded ${cellClass}`}
                                          >
                                            {val.toFixed(3)}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className='text-[9px] text-text-secondary mt-1.5'>
                              Green = within 1σ · Yellow = 1–2σ · Red = &gt;2σ from global mean
                            </p>
                          </div>
                        )}
                    </CollapsiblePanel>
                  )}

                  {/* ── Phase 6: Defense Report Panel ───────────────────────────────── */}
                  {status === 'done' &&
                    (clipReports.length > 0 ||
                      (defense.cosineFilter && similarities.length > 0)) && (
                      <CollapsiblePanel
                        title='Defense Report'
                        icon={<Shield size={13} className='text-primary/70' />}
                        badge={
                          excludedIndices.length > 0
                            ? `${excludedIndices.length} excluded`
                            : clippedCount > 0
                              ? `${clippedCount} clipped`
                              : undefined
                        }
                        isOpen={defenseReportOpen}
                        onToggle={() => setDefenseReportOpen((o) => !o)}
                      >
                        {/* Norm clip report */}
                        {clipReports.length > 0 && (
                          <div>
                            <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                              Norm Clipping (max = {defense.maxNorm})
                            </p>
                            <div className='space-y-1'>
                              {clipReports.map((r) => (
                                <div
                                  key={r.fileIndex}
                                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                                    r.clipped
                                      ? 'bg-yellow-500/5 border-yellow-500/30'
                                      : 'bg-background border-border'
                                  }`}
                                >
                                  {r.clipped ? (
                                    <AlertTriangle size={11} className='text-yellow-400 shrink-0' />
                                  ) : (
                                    <CheckCircle2 size={11} className='text-green-400 shrink-0' />
                                  )}
                                  <span className='text-[10px] text-text-secondary flex-1 min-w-0 truncate'>
                                    #{r.fileIndex + 1}{' '}
                                    <span className='font-mono text-primary/70'>
                                      {r.trainerAddress}
                                    </span>
                                  </span>
                                  <span className='text-[10px] font-mono text-text-secondary shrink-0'>
                                    ‖w‖ {r.originalNorm.toFixed(3)}
                                    {r.clipped && (
                                      <span className='text-yellow-400'>
                                        {' → '}
                                        {r.clippedNorm.toFixed(3)}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cosine filter report */}
                        {defense.cosineFilter && similarities.length > 0 && (
                          <div>
                            <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                              Cosine Similarity (threshold = {defense.cosineThreshold})
                            </p>
                            <div className='space-y-1'>
                              {entries.map((entry, i) => {
                                const sim = similarities[i];
                                const excluded = excludedIndices.includes(i);
                                return (
                                  <div
                                    key={entry.cid}
                                    className={`flex items-center gap-2 rounded-lg border p-2 ${
                                      excluded
                                        ? 'bg-red-500/5 border-red-500/30'
                                        : 'bg-background border-border'
                                    }`}
                                  >
                                    {excluded ? (
                                      <AlertTriangle size={11} className='text-red-400 shrink-0' />
                                    ) : (
                                      <CheckCircle2
                                        size={11}
                                        className='text-green-400 shrink-0'
                                      />
                                    )}
                                    <span className='text-[10px] text-text-secondary flex-1 min-w-0 truncate'>
                                      #{i + 1}{' '}
                                      <span className='font-mono text-primary/70'>
                                        {entry.trainerAddress}
                                      </span>
                                    </span>
                                    <span
                                      className={`text-[10px] font-mono shrink-0 ${
                                        excluded ? 'text-red-400' : 'text-green-400'
                                      }`}
                                    >
                                      {sim !== undefined ? sim.toFixed(4) : '—'}
                                      {excluded && ' (excluded)'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CollapsiblePanel>
                    )}

                  {/* ── Phase 6: Baseline Comparison Panel ──────────────────────────── */}
                  {status === 'done' && comparisonMetrics && baselineModel && (
                    <CollapsiblePanel
                      title='Baseline Comparison'
                      icon={<GitMerge size={13} className='text-primary/70' />}
                      badge={`cosine = ${comparisonMetrics.cosineSimilarity.toFixed(4)}`}
                      isOpen={comparisonOpen}
                      onToggle={() => setComparisonOpen((o) => !o)}
                    >
                      {/* Top metrics */}
                      <div className='grid grid-cols-3 gap-2'>
                        <div className='bg-background rounded p-2 text-center'>
                          <p className='text-[10px] text-text-secondary'>L2 Distance</p>
                          <p className='text-sm font-mono font-bold text-text-primary'>
                            {comparisonMetrics.l2Distance.toFixed(4)}
                          </p>
                        </div>
                        <div className='bg-background rounded p-2 text-center'>
                          <p className='text-[10px] text-text-secondary'>Cosine Sim</p>
                          <p
                            className={`text-sm font-mono font-bold ${
                              comparisonMetrics.cosineSimilarity > 0.99
                                ? 'text-green-400'
                                : comparisonMetrics.cosineSimilarity > 0.95
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {comparisonMetrics.cosineSimilarity.toFixed(4)}
                          </p>
                        </div>
                        <div className='bg-background rounded p-2 text-center'>
                          <p className='text-[10px] text-text-secondary'>Max Δ</p>
                          <p className='text-sm font-mono font-bold text-text-primary'>
                            {comparisonMetrics.maxFeatureDelta.toFixed(4)}
                          </p>
                          <p className='text-[9px] text-text-secondary'>
                            F{comparisonMetrics.maxDeltaFeatureIndex}
                          </p>
                        </div>
                      </div>

                      {/* Per-feature delta bars — top 10 by delta% */}
                      <div>
                        <p className='text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2'>
                          Top 10 Features by Δ%
                        </p>
                        <div className='space-y-1.5'>
                          {comparisonMetrics.perFeatureDeltaPercent
                            .map((pct, i) => ({
                              i,
                              pct,
                              delta: comparisonMetrics.perFeatureDelta[i],
                            }))
                            .sort((a, b) => b.pct - a.pct)
                            .slice(0, 10)
                            .map(({ i, pct, delta }) => {
                              const maxPct = comparisonMetrics.perFeatureDeltaPercent.reduce(
                                (m, v) => Math.max(m, v),
                                0
                              );
                              const barWidth = maxPct > 0 ? (pct / maxPct) * 100 : 0;
                              return (
                                <div key={i} className='flex items-center gap-2'>
                                  <span className='text-[10px] font-mono text-text-secondary w-8 shrink-0'>
                                    F{i}
                                  </span>
                                  <div className='flex-1 bg-background rounded-full h-1.5 overflow-hidden'>
                                    <div
                                      className='h-full rounded-full bg-primary'
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className='text-[10px] font-mono text-text-secondary w-28 text-right shrink-0'>
                                    {pct.toFixed(1)}% (Δ{delta.toFixed(4)})
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Auto-generated impact summary */}
                      <div className='bg-primary/5 border border-primary/20 rounded-lg p-3'>
                        <p className='text-[10px] font-semibold text-primary mb-1.5'>
                          Defense Impact Summary
                        </p>
                        <p className='text-xs text-text-secondary leading-relaxed'>
                          {buildImpactSummary(
                            comparisonMetrics,
                            excludedIndices.length,
                            clippedCount
                          )}
                        </p>
                      </div>
                    </CollapsiblePanel>
                  )}
                </div>

                {/* Footer */}
                <div className='bg-background/50 px-6 py-4 border-t border-border'>
                  <button
                    onClick={onClose}
                    disabled={isRunning}
                    className='px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary-light to-primary text-white rounded-lg hover:shadow-[0_0_20px_rgba(217,70,239,0.2)] transition-colors disabled:opacity-50'
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
