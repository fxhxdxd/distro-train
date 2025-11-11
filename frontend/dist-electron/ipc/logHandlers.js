import { ipcMain } from 'electron';
export function registerLogHandlers(mainWindow, logService, store) {
    ipcMain.on('logs:start', (_event, { projectId, topicId }) => {
        if (mainWindow) {
            logService.startSubscription(mainWindow, projectId, topicId);
        }
    });
    ipcMain.on('logs:stop', () => {
        logService.stopSubscription();
    });
}
