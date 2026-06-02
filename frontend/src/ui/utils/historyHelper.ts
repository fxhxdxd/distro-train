import type { WeightEntry } from './hederaHelper';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Web mode mirrors the Electron store: a single `trainingHistory` array kept
// in localStorage, with per-project logs under `logs-<id>`.
const STORAGE_KEY = 'training_history';

interface HistoryUpdate {
  projectId: string;
  newStatus?: string;
  newWeightsHash?: string;
  trainerCount?: number;
  weightsMetadata?: WeightEntry[];
  globalWeights?: string;
}

const readWebHistory = (): any[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as any[]) : [];
  } catch (error) {
    console.error('Failed to read training history from localStorage:', error);
    return [];
  }
};

const writeWebHistory = (history: any[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const getTrainingHistory = async (): Promise<any[]> => {
  if (isElectron) {
    return await window.electronAPI.getHistory();
  }
  return readWebHistory();
};

export const addTrainingHistory = async (projectData: object): Promise<void> => {
  if (isElectron) {
    await window.electronAPI.addHistory(projectData);
    return;
  }
  const history = readWebHistory();
  history.unshift(projectData);
  writeWebHistory(history);
};

export const updateTrainingHistoryItem = async (
  data: HistoryUpdate
): Promise<boolean> => {
  if (isElectron) {
    await window.electronAPI.updateHistoryItem(data);
    return true;
  }
  const {
    projectId,
    newStatus,
    newWeightsHash,
    trainerCount,
    weightsMetadata,
    globalWeights,
  } = data;
  const history = readWebHistory();
  const projectIndex = history.findIndex((p) => p.id === projectId);
  if (projectIndex === -1) {
    return false;
  }
  if (newStatus) history[projectIndex].status = newStatus;
  if (newWeightsHash) history[projectIndex].weightsHash = newWeightsHash;
  if (trainerCount !== undefined) history[projectIndex].trainerCount = trainerCount;
  if (weightsMetadata !== undefined) history[projectIndex].weightsMetadata = weightsMetadata;
  if (globalWeights !== undefined) history[projectIndex].globalWeights = globalWeights;
  writeWebHistory(history);
  return true;
};

export const deleteHistoryItem = async (projectId: string): Promise<boolean> => {
  if (isElectron) {
    return window.electronAPI.deleteHistoryItem(projectId);
  }
  const history = readWebHistory();
  writeWebHistory(history.filter((p) => p.id !== projectId));
  localStorage.removeItem(`logs-${projectId}`);
  return true;
};
