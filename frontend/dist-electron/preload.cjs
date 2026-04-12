"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: () => electron_1.ipcRenderer.invoke('dialog:openFile'),
    downloadFile: (data) => electron_1.ipcRenderer.invoke('download:file', data),
    // Credential related APIs
    saveCredentials: (settings) => electron_1.ipcRenderer.invoke('credentials:save', settings),
    loadCredentials: () => electron_1.ipcRenderer.invoke('credentials:load'),
    // History related APIs
    getHistory: () => electron_1.ipcRenderer.invoke('history:get'),
    addHistory: (projectData) => electron_1.ipcRenderer.invoke('history:add', projectData),
    updateHistoryItem: (data) => electron_1.ipcRenderer.invoke('history:update', data),
    deleteHistoryItem: (projectId) => electron_1.ipcRenderer.invoke('history:delete', projectId),
    // Window control APIs
    minimizeWindow: () => electron_1.ipcRenderer.send('window:minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window:maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window:close'),
    // App control API
    quitApp: () => electron_1.ipcRenderer.send('app:quit'),
    // Open external links
    openExternalLink: (url) => electron_1.ipcRenderer.send('shell:openExternal', url),
    // Pinata (IPFS) related APIs
    configurePinata: (creds) => electron_1.ipcRenderer.invoke('pinata:configure', creds),
    uploadFileToPinata: (filePath) => electron_1.ipcRenderer.invoke('pinata:uploadFile', filePath),
    uploadDatasetToPinata: (filePath) => electron_1.ipcRenderer.invoke('pinata:uploadDataset', filePath),
    listFilesFromPinata: () => electron_1.ipcRenderer.invoke('pinata:listFiles'),
    fetchFileFromPinata: (cid) => electron_1.ipcRenderer.invoke('pinata:fetchFile', cid),
    onPinataProgress: (callback) => {
        electron_1.ipcRenderer.on('pinata:progress', (_event, message) => callback(message));
    },
    // HCS related APIs
    startLogSubscription: (data) => electron_1.ipcRenderer.send('logs:start', data),
    stopLogSubscription: () => electron_1.ipcRenderer.send('logs:stop'),
    getLogs: (projectId) => electron_1.ipcRenderer.invoke('logs:get', projectId),
    onNewLog: (callback) => {
        const subscription = (_event, log) => callback(log);
        electron_1.ipcRenderer.on('hcs:new-log', subscription);
        return () => electron_1.ipcRenderer.removeListener('hcs:new-log', subscription);
    },
});
