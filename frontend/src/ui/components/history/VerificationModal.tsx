import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShieldX,
  User,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import type { WeightEntry } from '../../utils/hederaHelper';
import type { TrainingProject } from '../../pages/TrainingHistory';
import { fetchManifest, verifyWeight } from '../../utils/apiHelper';
import {
  compareWeights,
  parsePythonWeightDict,
  type ComparisonResult,
} from '../../utils/weightComparison';

// ── Types ──────────────────────────────────────────────────────────────────────

type VerificationStatus =
  | 'idle'
  | 'loading-manifest'
  | 'ready'
  | 'verifying'
  | 'done'
  | 'error';

interface ChunkVerificationResult {
  chunkIndex: number;
  chunkUrl: string;
  result: ComparisonResult;
}

// ── Helper: download raw text content from a URL ──────────────────────────────

async function fetchTextContent(url: string): Promise<string> {
  const response = await axios.get<string>(url, { responseType: 'text' });
  return typeof response.data === 'string'
    ? response.data
    : JSON.stringify(response.data);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: VerificationStatus }) => {
  const map: Record<VerificationStatus, { label: string; cls: string }> = {
    idle: { label: 'Idle', cls: 'text-text-secondary bg-surface' },
    'loading-manifest': { label: 'Loading manifest…', cls: 'text-primary bg-primary/10' },
    ready: { label: 'Ready', cls: 'text-primary bg-primary/10' },
    verifying: { label: 'Verifying…', cls: 'text-yellow-400 bg-yellow-400/10' },
    done: { label: 'Complete', cls: 'text-green-400 bg-green-400/10' },
    error: { label: 'Error', cls: 'text-red-400 bg-red-400/10' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
};

const DeviationBar = ({
  label,
  value,
  tolerance,
}: {
  label: string;
  value: number;
  tolerance: number;
}) => {
  const pass = value <= tolerance;
  return (
    <div className='flex items-center justify-between text-xs'>
      <span className='text-text-secondary w-40 shrink-0'>{label}</span>
      <span
        className={`font-mono ${pass ? 'text-green-400' : 'text-red-400'}`}
      >
        {value === 0 ? '0' : value.toExponential(3)}
      </span>
      {pass ? (
        <CheckCircle2 size={12} className='text-green-400 ml-2 shrink-0' />
      ) : (
        <X size={12} className='text-red-400 ml-2 shrink-0' />
      )}
    </div>
  );
};

const ResultCard = ({
  chunkResult,
  tolerance,
}: {
  chunkResult: ChunkVerificationResult;
  tolerance: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { result, chunkIndex, chunkUrl } = chunkResult;

  return (
    <div
      className={`rounded-lg border p-3 ${
        result.match
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          {result.match ? (
            <ShieldCheck size={16} className='text-green-400 shrink-0' />
          ) : (
            <ShieldX size={16} className='text-red-400 shrink-0' />
          )}
          <span
            className={`text-sm font-semibold ${
              result.match ? 'text-green-400' : 'text-red-400'
            }`}
          >
            Chunk {chunkIndex + 1} — {result.match ? 'VERIFIED' : 'MISMATCH'}
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className='text-text-secondary hover:text-text-primary transition-colors'
          aria-label='Toggle details'
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <p className='text-xs font-mono text-text-secondary break-all mb-2'>
        {chunkUrl}
      </p>

      <div className='space-y-1'>
        <DeviationBar
          label='Coefficient deviation'
          value={result.coefficientDeviation}
          tolerance={tolerance}
        />
        <DeviationBar
          label='Intercept deviation'
          value={result.interceptDeviation}
          tolerance={tolerance}
        />
        <DeviationBar
          label='Scaler mean deviation'
          value={result.scalerMeanDeviation}
          tolerance={tolerance}
        />
        <DeviationBar
          label='Scaler scale deviation'
          value={result.scalerScaleDeviation}
          tolerance={tolerance}
        />
      </div>

      {expanded && (
        <div className='mt-3 pt-3 border-t border-border/50'>
          <p className='text-xs text-text-secondary font-medium mb-1'>
            Raw deviation report:
          </p>
          <pre className='text-xs font-mono text-text-primary bg-background rounded p-2 overflow-x-auto whitespace-pre-wrap'>
            {result.details.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: TrainingProject;
  weightEntry: WeightEntry;
}

const TOLERANCE = 1e-6;

export const VerificationModal = ({
  isOpen,
  onClose,
  project,
  weightEntry,
}: VerificationModalProps) => {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [chunkUrls, setChunkUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [results, setResults] = useState<ChunkVerificationResult[]>([]);
  const [progress, setProgress] = useState<string>('');

  // ── Load manifest whenever the modal opens ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // Reset state for each open
    setResults([]);
    setErrorMessage('');
    setProgress('');
    setStatus('loading-manifest');

    fetchManifest(project.datasetHash)
      .then((urls) => {
        setChunkUrls(urls);
        setStatus('ready');
      })
      .catch((err) => {
        setErrorMessage(
          `Failed to fetch dataset manifest: ${(err as Error).message}`
        );
        setStatus('error');
      });
  }, [isOpen, project.datasetHash]);

  // ── Verify against a single specific chunk ──────────────────────────────────
  const verifySingleChunk = useCallback(
    async (chunkUrl: string, chunkIndex: number) => {
      setStatus('verifying');
      setProgress(`Downloading submitted weight file…`);

      try {
        // 1. Download submitted weight content
        const submittedRaw = await fetchTextContent(weightEntry.url);

        setProgress(`Re-running model on Chunk ${chunkIndex + 1}…`);

        // 2. Re-run model on this chunk via client node
        const recomputedRaw = await verifyWeight(chunkUrl, project.modelHash);

        setProgress(`Comparing weights…`);

        // 3. Parse + compare
        const submitted = parsePythonWeightDict(submittedRaw);
        const recomputed = parsePythonWeightDict(recomputedRaw);
        const comparison = compareWeights(submitted, recomputed, TOLERANCE);

        const newResult: ChunkVerificationResult = {
          chunkIndex,
          chunkUrl,
          result: comparison,
        };

        setResults((prev) => {
          // Replace if same chunk already in list
          const filtered = prev.filter((r) => r.chunkIndex !== chunkIndex);
          return [...filtered, newResult].sort((a, b) => a.chunkIndex - b.chunkIndex);
        });

        setStatus('done');
        setProgress('');

        if (comparison.match) {
          toast.success(`Chunk ${chunkIndex + 1} verified — weights match!`);
        } else {
          toast.warning(
            `Chunk ${chunkIndex + 1} mismatch — max deviation: ${comparison.maxDeviation.toExponential(3)}`
          );
        }
      } catch (err) {
        const msg = (err as Error).message;
        setErrorMessage(msg);
        setStatus('error');
        toast.error(`Verification failed: ${msg}`);
      }
    },
    [weightEntry.url, project.modelHash]
  );

  // ── Auto-detect: try every chunk in sequence ────────────────────────────────
  const autoDetect = useCallback(async () => {
    if (chunkUrls.length === 0) return;
    setStatus('verifying');
    setResults([]);
    const allResults: ChunkVerificationResult[] = [];

    try {
      setProgress('Downloading submitted weight file…');
      const submittedRaw = await fetchTextContent(weightEntry.url);
      const submitted = parsePythonWeightDict(submittedRaw);

      for (let i = 0; i < chunkUrls.length; i++) {
        setProgress(
          `Re-running model on Chunk ${i + 1} of ${chunkUrls.length}…`
        );
        try {
          const recomputedRaw = await verifyWeight(
            chunkUrls[i],
            project.modelHash
          );
          const recomputed = parsePythonWeightDict(recomputedRaw);
          const comparison = compareWeights(submitted, recomputed, TOLERANCE);
          allResults.push({ chunkIndex: i, chunkUrl: chunkUrls[i], result: comparison });
          setResults([...allResults]);

          // If we found an exact match, no need to keep going
          if (comparison.match) {
            toast.success(
              `Auto-detect: weight matches Chunk ${i + 1}!`
            );
            break;
          }
        } catch (err) {
          // Record partial failure and continue
          console.warn(`Chunk ${i + 1} verification error:`, err);
        }
      }

      setStatus('done');
      setProgress('');

      const matched = allResults.find((r) => r.result.match);
      if (!matched) {
        toast.warning('Auto-detect: no exact chunk match found. See details below.');
      }
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMessage(msg);
      setStatus('error');
    }
  }, [chunkUrls, weightEntry.url, project.modelHash]);

  const isRunning = status === 'verifying' || status === 'loading-manifest';

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
              <Dialog.Panel className='w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden'>
                {/* Header */}
                <div className='bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-5 border-b border-border'>
                  <div className='flex items-center justify-between'>
                    <Dialog.Title className='flex items-center gap-3 text-lg font-bold text-text-primary'>
                      <div className='w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30'>
                        <ShieldCheck size={16} className='text-primary' />
                      </div>
                      Deterministic Verification
                    </Dialog.Title>
                    <div className='flex items-center gap-3'>
                      <StatusBadge status={status} />
                      <button
                        onClick={onClose}
                        className='text-text-secondary hover:text-text-primary transition-colors'
                        disabled={isRunning}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <p className='text-text-secondary text-xs mt-2'>
                    Re-runs the model on each dataset chunk locally and compares
                    the output against the submitted weight file.
                  </p>
                </div>

                {/* Body */}
                <div className='p-6 space-y-5 max-h-[70vh] overflow-y-auto'>
                  {/* Weight info */}
                  <div className='bg-background rounded-lg border border-border p-4 space-y-2'>
                    <p className='text-xs font-medium text-text-secondary uppercase tracking-wider'>
                      Weight File Being Verified
                    </p>
                    <div className='flex items-center gap-2'>
                      <User size={12} className='text-primary shrink-0' />
                      <span className='text-xs text-text-secondary'>Trainer:</span>
                      <span className='text-xs font-mono text-primary'>
                        {weightEntry.trainerAddress}
                      </span>
                    </div>
                    <p className='text-xs font-mono text-text-primary break-all bg-surface px-2 py-1 rounded border border-border/30'>
                      {weightEntry.cid}
                    </p>
                  </div>

                  {/* Model info */}
                  <div className='bg-background rounded-lg border border-border p-4'>
                    <p className='text-xs font-medium text-text-secondary uppercase tracking-wider mb-1'>
                      Model Script (IPFS)
                    </p>
                    <p className='text-xs font-mono text-text-primary break-all'>
                      {project.modelHash}
                    </p>
                  </div>

                  {/* Error banner */}
                  {status === 'error' && errorMessage && (
                    <div className='bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
                      <p className='text-xs text-red-400 font-medium'>Error</p>
                      <p className='text-xs text-red-400/80 mt-1 break-all'>
                        {errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Progress indicator */}
                  {status === 'verifying' && progress && (
                    <div className='flex items-center gap-2 text-xs text-primary'>
                      <Loader2 size={14} className='animate-spin shrink-0' />
                      <span>{progress}</span>
                    </div>
                  )}

                  {/* Chunks list */}
                  {(status === 'ready' || status === 'done' || status === 'verifying') &&
                    chunkUrls.length > 0 && (
                      <div>
                        <div className='flex items-center justify-between mb-3'>
                          <p className='text-xs font-medium text-text-secondary uppercase tracking-wider'>
                            Dataset Chunks ({chunkUrls.length})
                          </p>
                          <button
                            onClick={autoDetect}
                            disabled={isRunning}
                            className='flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <Zap size={12} />
                            Auto-Detect Match
                          </button>
                        </div>

                        <div className='space-y-2'>
                          {chunkUrls.map((url, i) => {
                            const chunkResult = results.find(
                              (r) => r.chunkIndex === i
                            );
                            return (
                              <div
                                key={url}
                                className='bg-background rounded-lg border border-border p-3'
                              >
                                <div className='flex items-start justify-between gap-2'>
                                  <div className='flex-1 min-w-0'>
                                    <p className='text-xs font-medium text-text-secondary mb-1'>
                                      Chunk {i + 1}
                                    </p>
                                    <p className='text-xs font-mono text-text-primary break-all truncate'>
                                      {url}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => verifySingleChunk(url, i)}
                                    disabled={isRunning}
                                    className='flex items-center gap-1.5 text-xs whitespace-nowrap font-medium px-2.5 py-1.5 bg-surface hover:bg-border text-text-primary rounded border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
                                  >
                                    <ShieldCheck size={11} />
                                    Verify
                                  </button>
                                </div>
                                {chunkResult && (
                                  <div className='mt-2 pt-2 border-t border-border/50'>
                                    <ResultCard
                                      chunkResult={chunkResult}
                                      tolerance={TOLERANCE}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Loading manifest */}
                  {status === 'loading-manifest' && (
                    <div className='flex items-center gap-2 text-xs text-text-secondary'>
                      <Loader2 size={14} className='animate-spin' />
                      Fetching dataset manifest…
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className='bg-background/50 px-6 py-4 border-t border-border flex items-center justify-between'>
                  <p className='text-xs text-text-secondary'>
                    Tolerance: {TOLERANCE.toExponential(0)} — sklearn lbfgs is
                    deterministic across identical environments
                  </p>
                  <button
                    onClick={onClose}
                    disabled={isRunning}
                    className='px-4 py-2 text-sm font-medium bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50'
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
