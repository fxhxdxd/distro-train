export interface ISettings {
  pinataApiKey: string;
  pinataSecretKey: string;
}

export interface IElectronAPI {
  openFileDialog: () => Promise<string | null>;
  onProgress: (callback: (message: string) => void) => void;
  saveCredentials: (settings: ISettings) => Promise<void>;
  loadCredentials: () => Promise<ISettings | null>;
  getHistory: () => Promise<any[]>;
  addHistory: (projectData: object) => Promise<void>;
  updateHistoryItem: (data: {
    projectId: string;
    newStatus?: string;
    newWeightsHash?: string;
    trainerCount?: number;
    weightsMetadata?: Array<{ url: string; cid: string; trainerAddress: string }>;
    globalWeights?: string;
  }) => Promise<void>;
  deleteHistoryItem: (projectId: string) => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  quitApp: () => void;
  openExternalLink: (url: string) => void;
  configurePinata: (creds: {
    pinataApiKey: string;
    pinataSecretKey: string;
  }) => Promise<boolean>;
  uploadFileToPinata: (filePath: string) => Promise<string>;
  uploadDatasetToPinata: (
    filePath: string
  ) => Promise<{ datasetHash: string; chunkCount: number }>;
  listFilesFromPinata: () => Promise<any[]>;
  fetchFileFromPinata: (cid: string) => Promise<string>;
  onPinataProgress: (callback: (message: string) => void) => void;
  startLogSubscription: (data: { projectId: string; topicId: string }) => void;
  stopLogSubscription: () => void;
  getLogs: (projectId: string) => Promise<any[]>;
  onNewLog: (callback: (log: any) => void) => () => void;
  downloadFile: (data: {
    url: string;
    fileName: string;
  }) => Promise<{ success: boolean; path?: string; reason?: string }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
