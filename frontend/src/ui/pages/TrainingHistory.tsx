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
            window.electronAPI.stopLogSubscription();
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

  return (
    <div>
      <h1 className='text-3xl font-bold text-text-primary mb-2'>
        Training History
      </h1>
      <p className='text-text-secondary mb-8'>
        Overview of all your past and current training jobs.
      </p>

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
