import React, { Fragment, useState, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Info, Copy, Trash2, Download, User, ShieldCheck, GitMerge, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import type { TrainingProject } from '../../pages/TrainingHistory';
import { generatePresignedUrl, type WeightEntry } from '../../utils/hederaHelper';
import { VerificationModal } from './VerificationModal';
import { AggregationModal } from './AggregationModal';

// #region agent log
const __agentLog = (location: string, message: string, data: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7710/ingest/7ac52342-3854-424e-853b-78553b66bed5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f5fd95'},body:JSON.stringify({sessionId:'f5fd95',runId:'pre-fix',hypothesisId:'H403',location,message,data,timestamp:Date.now()})}).catch(()=>{});
};
// #endregion agent log

const DetailRow = ({
  label,
  value,
  copyable = true,
  downloadable = true,
}: {
  label: string;
  value: string | null;
  copyable?: boolean;
  downloadable?: boolean;
}) => {
  const copy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success(`${label} copied!`);
    }
  };

  const handleDownload = async (downloadUrl: string, label: string) => {
    if (!downloadUrl) {
      toast.error('No download URL available.');
      return;
    }

    // #region agent log
    __agentLog('frontend/src/ui/components/history/ProjectDetailsModal.tsx:handleDownload', 'download requested', {
      label,
      downloadUrl,
      isHttp: downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://'),
    });
    // #endregion agent log

    // Prefer presigned URLs for private Pinata content.
    let finalUrl = downloadUrl;
    const isHttp = downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://');
    if (!isHttp) {
      const presigned = await generatePresignedUrl(downloadUrl);
      // #region agent log
      __agentLog('frontend/src/ui/components/history/ProjectDetailsModal.tsx:handleDownload', 'presign attempted', {
        label,
        hash: downloadUrl,
        presignedOk: Boolean(presigned),
      });
      // #endregion agent log
      if (presigned) {
        finalUrl = presigned;
        console.log('[handleDownload] Using presigned URL:', finalUrl);
      } else {
        finalUrl = `https://gateway.pinata.cloud/ipfs/${downloadUrl}`;
        console.log('[handleDownload] Constructed fallback gateway URL from hash:', finalUrl);
      }
    } else {
      console.log('[handleDownload] Using full URL directly:', finalUrl);
    }

    console.log('Downloading file from URL:', finalUrl);

    const toastId = toast.loading('Opening save dialog...');

    try {
      const downloadResult = await window.electronAPI.downloadFile({
        url: finalUrl,
        fileName: `${label.replace(/\s/g, '_')}.txt`,
      });

      if (downloadResult.success) {
        toast.success('Download started!', { id: toastId });
      } else if (downloadResult.reason !== 'Dialog canceled') {
        throw new Error(downloadResult.reason || 'Download failed.');
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      toast.error('Download Failed', {
        id: toastId,
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className='bg-background p-4 rounded-lg border border-border'>
      <div className='flex justify-between items-center mb-2'>
        <span className='text-text-secondary font-medium text-sm'>{label}</span>
        <div className='flex items-center gap-2'>
          {downloadable && value && value !== 'N/A' && (
            <button
              onClick={() => handleDownload(value, label)}
              className='text-green-400 hover:text-green-300 flex items-center gap-1 px-2 py-1 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors text-xs'
            >
              <Download size={12} /> Download
            </button>
          )}
          {copyable && value && value !== 'N/A' && (
            <button
              onClick={copy}
              className='text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded transition-colors text-xs'
            >
              <Copy size={12} /> Copy
            </button>
          )}
        </div>
      </div>
      <p className='text-text-primary break-all font-mono text-sm bg-surface p-2 rounded border border-border/50'>
        {value || 'N/A'}
      </p>
    </div>
  );
};

const WeightsHashRow = ({
  weightsHash,
  weightsMetadata,
  onVerify,
}: {
  weightsHash: string | null;
  weightsMetadata?: WeightEntry[];
  onVerify?: (entry: WeightEntry) => void;
}) => {
  console.log('WeightsHashRow : ', weightsHash);

  /**
   * Build a stable operatorId → nodeNum map.
   * Node numbers are assigned in order of first appearance across all entries,
   * so the same operator always gets the same node number regardless of how
   * many weight files they submitted (one file per chunk trained).
   */
  const operatorNodeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of weightsMetadata ?? []) {
      if (!map.has(entry.trainerAddress)) {
        map.set(entry.trainerAddress, map.size + 1);
      }
    }
    return map;
  }, [weightsMetadata]);

  const handleWeightDownload = async (downloadUrl: string, label: string) => {
    if (!downloadUrl) {
      toast.error('No download URL available.');
      return;
    }

    let finalUrl = downloadUrl;
    const isHttp =
      downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://');
    if (!isHttp) {
      const presigned = await generatePresignedUrl(downloadUrl);
      finalUrl = presigned ?? `https://gateway.pinata.cloud/ipfs/${downloadUrl}`;
    }

    const toastId = toast.loading('Opening save dialog...');
    try {
      const result = await window.electronAPI.downloadFile({
        url: finalUrl,
        fileName: `${label.replace(/\s/g, '_')}.txt`,
      });
      if (result.success) {
        toast.success('Download started!', { id: toastId });
      } else if (result.reason !== 'Dialog canceled') {
        throw new Error(result.reason || 'Download failed.');
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      toast.error('Download Failed', {
        id: toastId,
        description: (error as Error).message,
      });
    }
  };

  if (!weightsHash || weightsHash === 'N/A') {
    return (
      <DetailRow
        label='Final Weights Hash (Hedera)'
        value={weightsHash}
        copyable
        downloadable
      />
    );
  }

  // Use structured metadata when available (new training runs)
  if (weightsMetadata && weightsMetadata.length > 0) {
    return (
      <div className='bg-background p-4 rounded-lg border border-border'>
        <div className='flex justify-between items-center mb-3'>
          <span className='text-text-secondary font-medium text-sm'>
            Final Weights (Hedera)
          </span>
          <span className='text-xs text-text-secondary bg-surface px-2 py-1 rounded'>
            {weightsMetadata.length} file{weightsMetadata.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className='space-y-3'>
          {weightsMetadata.map((entry, index) => {
            const nodeNum = operatorNodeMap.get(entry.trainerAddress) ?? index + 1;
            return (
            <div
              key={entry.cid}
              className='bg-surface p-3 rounded border border-border/50'
            >
              <div className='flex justify-between items-center mb-2'>
                <span className='text-xs font-medium text-text-secondary'>
                  Weight File #{index + 1}
                </span>
                <div className='flex items-center gap-2'>
                  {onVerify && (
                    <button
                      onClick={() => onVerify(entry)}
                      className='text-yellow-400 hover:text-yellow-300 flex items-center gap-1 px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 rounded transition-colors text-xs'
                    >
                      <ShieldCheck size={12} /> Verify
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleWeightDownload(entry.url, `Weight_File_${index + 1}`)
                    }
                    className='text-green-400 hover:text-green-300 flex items-center gap-1 px-2 py-1 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors text-xs'
                  >
                    <Download size={12} /> Download
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(entry.cid);
                      toast.success(`CID ${index + 1} copied!`);
                    }}
                    className='text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded transition-colors text-xs'
                  >
                    <Copy size={12} /> Copy CID
                  </button>
                </div>
              </div>

              {/* Node number — stable per operator: same operator always = same node */}
              <div className='flex items-center gap-1.5 mb-1.5'>
                <Cpu size={11} className='text-text-secondary/70 shrink-0' />
                <span className='text-xs text-text-secondary'>Node:</span>
                <span className='text-xs font-mono text-text-primary'>
                  #{nodeNum}
                </span>
              </div>

              {/* Trainer operator ID */}
              <div className='flex items-center gap-1.5 mb-2'>
                <User size={11} className='text-primary/70 shrink-0' />
                <span className='text-xs text-text-secondary'>Operator ID:</span>
                <span className='text-xs font-mono text-primary'>
                  {entry.trainerAddress}
                </span>
              </div>

              {/* CID */}
              <p className='text-text-primary break-all font-mono text-xs bg-background px-2 py-1 rounded border border-border/30'>
                {entry.cid}
              </p>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Legacy path: flat comma-separated string (older history entries without metadata)
  const hashes = weightsHash.includes(',')
    ? weightsHash.split(',').map((h) => h.trim())
    : [weightsHash];

  if (hashes.length === 1) {
    return (
      <DetailRow
        label='Final Weights Hash (Hedera)'
        value={weightsHash}
        copyable
        downloadable
      />
    );
  }

  return (
    <div className='bg-background p-4 rounded-lg border border-border'>
      <div className='flex justify-between items-center mb-3'>
        <span className='text-text-secondary font-medium text-sm'>
          Final Weights Hash (Hedera)
        </span>
        <span className='text-xs text-text-secondary bg-surface px-2 py-1 rounded'>
          {hashes.length} files
        </span>
      </div>
      <div className='space-y-2'>
        {hashes.map((hash, index) => (
          <div
            key={index}
            className='bg-surface p-3 rounded border border-border/50'
          >
            <div className='flex justify-between items-center mb-1'>
              <span className='text-xs text-text-secondary'>
                Weight File #{index + 1}
              </span>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() =>
                    handleWeightDownload(hash, `Weight_File_${index + 1}`)
                  }
                  className='text-green-400 hover:text-green-300 flex items-center gap-1 px-2 py-1 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors text-xs'
                >
                  <Download size={12} /> Download
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                    toast.success(`Weight hash ${index + 1} copied!`);
                  }}
                  className='text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded transition-colors text-xs'
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>
            <p className='text-text-primary break-all font-mono text-xs'>
              {hash}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ProjectDetailsModalProps {
  project: TrainingProject | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (projectId: string) => void;
}

export const ProjectDetailsModal = ({
  project,
  isOpen,
  onClose,
  onDelete,
}: ProjectDetailsModalProps) => {
  const [verifyEntry, setVerifyEntry] = useState<WeightEntry | null>(null);
  const [showAggregation, setShowAggregation] = useState(false);
  const [localProject, setLocalProject] = useState<TrainingProject | null>(null);

  // Keep localProject in sync when prop changes
  React.useEffect(() => { setLocalProject(project); }, [project]);

  if (!project || !localProject) return null;

  const canFedAvg =
    localProject.status === 'Completed' &&
    (localProject.weightsMetadata?.length ?? 0) >= 2;

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' />
        </Transition.Child>
        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-full max-w-3xl transform overflow-hidden rounded-2xl bg-surface border border-border shadow-2xl transition-all'>
                {/* Header */}
                <div className='bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border'>
                  <Dialog.Title
                    as='h3'
                    className='text-2xl font-bold text-text-primary flex items-center gap-3'
                  >
                    <div className='w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30'>
                      <Info size={20} className='text-primary' />
                    </div>
                    Training Job Details
                  </Dialog.Title>
                  <p className='text-text-secondary mt-2'>
                    Complete information about your training job and associated
                    blockchain data
                  </p>
                </div>

                {/* Content */}
                <div className='p-6'>
                  <div className='space-y-4'>
                    <DetailRow
                      label='Project Name'
                      value={project.projectName}
                    />
                    <DetailRow label='Job ID' value={project.id} copyable />
                    <DetailRow label='Status' value={project.status} />
                    <DetailRow
                      label='Dataset Hash (IPFS CID)'
                      value={project.datasetHash}
                      copyable
                      downloadable
                    />
                    <DetailRow
                      label='Model Hash (IPFS CID)'
                      value={project.modelHash}
                      copyable
                      downloadable
                    />
                    <WeightsHashRow
                      weightsHash={localProject.weightsHash}
                      weightsMetadata={localProject.weightsMetadata}
                      onVerify={
                        localProject.status === 'Completed'
                          ? (entry) => setVerifyEntry(entry)
                          : undefined
                      }
                    />
                    <DetailRow
                      label='Date Created'
                      value={new Date(project.date).toLocaleString()}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className='bg-background/50 p-6 border-t border-border flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      className='flex items-center gap-2 px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50'
                      onClick={onClose}
                    >
                      Close
                    </button>
                    {canFedAvg && (
                      <button
                        type='button'
                        onClick={() => setShowAggregation(true)}
                        className='flex items-center gap-2 px-5 py-3 font-semibold rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50'
                      >
                        <GitMerge size={16} />
                        {localProject.globalWeights ? 'View Global Model' : 'Run FedAvg'}
                      </button>
                    )}
                  </div>
                  <button
                    type='button'
                    onClick={() => onDelete(project.id)}
                    className='flex items-center gap-2 px-6 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/50'
                  >
                    <Trash2 size={16} />
                    Delete Entry
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>

    {/* Verification modal — stacked on top of the details modal */}
    {verifyEntry && (
      <VerificationModal
        isOpen={!!verifyEntry}
        onClose={() => setVerifyEntry(null)}
        project={localProject}
        weightEntry={verifyEntry}
      />
    )}

    {/* Aggregation modal */}
    <AggregationModal
      isOpen={showAggregation}
      onClose={() => setShowAggregation(false)}
      project={localProject}
      onGlobalWeightsSaved={(gw) =>
        setLocalProject((prev) => (prev ? { ...prev, globalWeights: gw } : prev))
      }
    />
    </>
  );
};
