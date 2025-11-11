import { ipcMain, dialog } from 'electron';
import axios from 'axios';
import fs from 'fs';
export function registerDialogHandlers() {
    ipcMain.handle('dialog:openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({});
        if (!canceled && filePaths.length > 0) {
            return filePaths[0];
        }
        return null;
    });
    ipcMain.handle('download:file', async (_event, { url, fileName }) => {
        try {
            const { canceled, filePath } = await dialog.showSaveDialog({
                defaultPath: fileName,
            });
            if (canceled || !filePath) {
                return { success: false, reason: 'Dialog canceled' };
            }
            console.log('Downloading file from URL:', url);
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
            });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', reject);
            });
            return { success: true, path: filePath };
        }
        catch (error) {
            console.error('File download failed:', error);
            return { success: false, reason: error.message };
        }
    });
}
