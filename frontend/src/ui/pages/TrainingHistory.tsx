import React, { useState, useEffect, useMemo } from 'react';
import {
  deleteHistoryItem,
  getTrainingHistory,
  updateTrainingHistoryItem,
} from '../utils/historyHelper';
import { HistoryTable } from '../components/history/HistoryTable';
import { ProjectDetailsModal } from '../components/history/ProjectDetailsModal';
import { toast } from 'sonner';
import {
  checkTaskStatus,
  fetchWeightsSubmittedEvent,
  type WeightEntry,
} from '../utils/hederaHelper';
import { LogViewerModal } from '../components/history/LogViewerModal';
import { CONTRACT_ID } from '../utils/constant';
import { CheckCircle, Clock, History, Loader } from 'lucide-react';

export interface TrainingProject {
  id: string;
  projectName: string;
  datasetHash: string;
  modelHash: string;
  date: string;
  status: 'Initialized' | 'Running' | 'Completed' | 'Failed';
  weightsHash: string | null;
  chunkCount?: number;
  trainerCount?: number;
  /** Structured weight entries with per-trainer attribution, populated after completion */
  weightsMetadata?: WeightEntry[];
  /** Python-repr string of the FedAvg global model, populated after aggregation */
  globalWeights?: string;
}

const TrainingHistoryPage = () => {
  const [history, setHistory] = useState<TrainingProject[]>([]);

  // Store only the ID so the modal always reflects the latest history entry,
  // even when polling updates weightsMetadata after the modal is already open.
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selectedProject = useMemo(
    () => history.find((p) => p.id === selectedProjectId) ?? null,
    [history, selectedProjectId]
  );

  const [logViewProjectId, setLogViewProjectId] = useState<string | null>(null);
  const logViewProject = useMemo(
    () => history.find((p) => p.id === logViewProjectId) ?? null,
    [history, logViewProjectId]
  );

  useEffect(() => {
    const loadHistory = async () => {
      const savedHistory = await getTrainingHistory();
      setHistory(savedHistory);
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const jobsToPoll = history.filter((job) => job.status === 'Running');

    if (jobsToPoll.length === 0) {
      return;
    }

    // polling for 20 seconds
    const intervalId = setInterval(async () => {
      console.log(`Polling ${jobsToPoll.length} active job(s)...`);
      for (const job of jobsToPoll) {
        try {
          const isComplete = await checkTaskStatus(job.id);
          // const isComplete = true;

          if (!isComplete) {
            window.electronAPI?.stopLogSubscription();
            const weightsArray = await fetchWeightsSubmittedEvent(
              CONTRACT_ID,
              job.id
            );
            if (weightsArray && weightsArray.length > 0) {
              const weightsHash = weightsArray.map((w) => w.url).join(', ');

              await updateTrainingHistoryItem({
                projectId: job.id,
                newStatus: 'Completed',
                newWeightsHash: weightsHash,
                weightsMetadata: weightsArray,
              });

              setHistory((prev) =>
                prev.map((p) =>
                  p.id === job.id
                    ? {
                        ...p,
                        status: 'Completed',
                        weightsHash,
                        weightsMetadata: weightsArray,
                      }
                    : p
                )
              );
              toast.success(
                `Project '${job.projectName}' has completed training!`
              );
            }
          }
        } catch (error) {
          console.error(`Polling failed for job ${job.id}:`, error);
        }
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [history]);

  const handleDeleteProject = async (projectId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this training history? This action cannot be undone.'
      )
    ) {
      const success = await deleteHistoryItem(projectId);
      if (success) {
        setHistory((currentHistory) =>
          currentHistory.filter((p) => p.id !== projectId)
        );
        toast.success('Project history deleted.');

        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }
      } else {
        toast.error('Failed to delete project history.');
      }
    }
  };

  const completedCount = history.filter((job) => job.status === 'Completed').length;
  const runningCount = history.filter((job) => job.status === 'Running').length;
  const initializedCount = history.filter(
    (job) => job.status === 'Initialized'
  ).length;

  return (
    <div className='space-y-6'>
      <section className='dashboard-panel rounded-3xl p-6 lg:p-8'>
        <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-start gap-4'>
            <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary-light/35 to-primary/15'>
              <History className='h-7 w-7 text-primary-light' />
            </div>
            <div>
              <h1 className='text-3xl font-bold text-text-primary'>
                Training History
              </h1>
              <p className='mt-2 max-w-xl text-sm leading-relaxed text-text-secondary'>
                Review live jobs, inspect submitted weights, open logs, and run
                aggregation checks for completed projects.
              </p>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-3 lg:w-[420px]'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-4'>
              <CheckCircle className='mb-3 h-4 w-4 text-emerald-300' />
              <p className='text-2xl font-bold text-text-primary'>
                {completedCount}
              </p>
              <p className='text-xs text-text-secondary'>Completed</p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-4'>
              <Loader className='mb-3 h-4 w-4 text-blue-300' />
              <p className='text-2xl font-bold text-text-primary'>
                {runningCount}
              </p>
              <p className='text-xs text-text-secondary'>Running</p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-4'>
              <Clock className='mb-3 h-4 w-4 text-yellow-300' />
              <p className='text-2xl font-bold text-text-primary'>
                {initializedCount}
              </p>
              <p className='text-xs text-text-secondary'>Queued</p>
            </div>
          </div>
        </div>
      </section>

      <HistoryTable
        history={history}
        onViewDetails={(project) => setSelectedProjectId(project.id)}
        onDelete={handleDeleteProject}
        onViewLogs={(project) => setLogViewProjectId(project.id)}
      />

      <ProjectDetailsModal
        isOpen={!!selectedProjectId}
        project={selectedProject}
        onClose={() => setSelectedProjectId(null)}
        onDelete={handleDeleteProject}
      />

      <LogViewerModal
        isOpen={!!logViewProjectId}
        project={logViewProject}
        onClose={() => setLogViewProjectId(null)}
      />
    </div>
  );
};

export default TrainingHistoryPage;
