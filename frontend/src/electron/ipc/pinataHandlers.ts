import { ipcMain } from 'electron';
import { PinataCliService } from '../pinataCli.js';

const pinataService = new PinataCliService();

export function registerPinataHandlers() {
  ipcMain.handle(
    'pinata:configure',
    (
      _event,
      {
        pinataApiKey,
        pinataSecretKey,
      }: { pinataApiKey: string; pinataSecretKey: string }
    ) => {
      return pinataService.configure(pinataApiKey, pinataSecretKey);
    }
  );

  ipcMain.handle('pinata:uploadFile', (_event, filePath: string) => {
    return pinataService.uploadFile(filePath);
  });

  ipcMain.handle('pinata:uploadDataset', (event, filePath: string) => {
    return pinataService.uploadDatasetInChunks(filePath, (message) => {
      event.sender.send('pinata:progress', message);
    });
  });

  ipcMain.handle('pinata:listFiles', () => {
    return pinataService.listFiles();
  });

  ipcMain.handle('pinata:fetchFile', (_event, cid: string) => {
    return pinataService.fetchFile(cid);
  });
}
