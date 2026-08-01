import { ipcMain } from 'electron';
import keytar from 'keytar';

const SERVICE_NAME = 'distro-train';

/**
 * Per-round RSA private keys, stored in the OS keychain.
 *
 * Each training round generates a throwaway keypair; the trainers encrypt
 * their weight references to the public half, so the private half has to
 * survive until those submissions land on-chain and get collected. Holding it
 * only in renderer memory means an app reload makes every weight file for
 * that round permanently unreadable.
 *
 * One entry per task ID so a key is never reused across rounds, and so
 * deleting a project's key cannot affect any other project.
 */
export function registerSessionKeyHandlers() {
  ipcMain.handle(
    'roundkey:save',
    async (_event, taskId: string, privateKeyB64: string) => {
      await keytar.setPassword(SERVICE_NAME, `roundkey:${taskId}`, privateKeyB64);
    }
  );

  ipcMain.handle('roundkey:load', async (_event, taskId: string) => {
    return keytar.getPassword(SERVICE_NAME, `roundkey:${taskId}`);
  });

  ipcMain.handle('roundkey:delete', async (_event, taskId: string) => {
    return keytar.deletePassword(SERVICE_NAME, `roundkey:${taskId}`);
  });
}
