import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  downloadFile: (data: { url: string; fileName: string }) =>
    ipcRenderer.invoke('download:file', data),
  // Credential related APIs
  saveCredentials: (settings: object) =>
    ipcRenderer.invoke('credentials:save', settings),
  loadCredentials: () => ipcRenderer.invoke('credentials:load'),

  // History related APIs
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (projectData: object) =>
    ipcRenderer.invoke('history:add', projectData),
  updateHistoryItem: (data: {
    projectId: string;
    newStatus?: string;
    newWeightsHash?: string;
    trainerCount?: number;
    weightsMetadata?: Array<{ url: string; cid: string; trainerAddress: string }>;
    globalWeights?: string;
  }) => ipcRenderer.invoke('history:update', data),
  deleteHistoryItem: (projectId: string) =>
    ipcRenderer.invoke('history:delete', projectId),

  // Window control APIs
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // App control API
  quitApp: () => ipcRenderer.send('app:quit'),

  // Open external links
  openExternalLink: (url: string) =>
    ipcRenderer.send('shell:openExternal', url),

  // Pinata (IPFS) related APIs
  configurePinata: (creds: {
    pinataApiKey: string;
    pinataSecretKey: string;
  }) => ipcRenderer.invoke('pinata:configure', creds),
  uploadFileToPinata: (filePath: string) =>
    ipcRenderer.invoke('pinata:uploadFile', filePath),
  uploadDatasetToPinata: (filePath: string) =>
    ipcRenderer.invoke('pinata:uploadDataset', filePath),
  listFilesFromPinata: () => ipcRenderer.invoke('pinata:listFiles'),
  fetchFileFromPinata: (cid: string) =>
    ipcRenderer.invoke('pinata:fetchFile', cid),
  onPinataProgress: (callback: (message: string) => void) => {
    ipcRenderer.on('pinata:progress', (_event, message) => callback(message));
  },

  // HCS related APIs
  startLogSubscription: (data: { projectId: string; topicId: string }) =>
    ipcRenderer.send('logs:start', data),

  stopLogSubscription: () => ipcRenderer.send('logs:stop'),

  getLogs: (projectId: string) => ipcRenderer.invoke('logs:get', projectId),

  onNewLog: (callback: (log: any) => void) => {
    const subscription = (_event: any, log: any) => callback(log);
    ipcRenderer.on('hcs:new-log', subscription);

    return () => ipcRenderer.removeListener('hcs:new-log', subscription);
  },
});
