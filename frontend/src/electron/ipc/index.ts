import { registerHistoryHandlers } from './historyHandlers.js';
import { registerCredentialHandlers } from './credentialHandlers.js';
import { registerDialogHandlers } from './dialogHandlers.js';
import { registerPinataHandlers } from './pinataHandlers.js';
import { registerSessionKeyHandlers } from './sessionKeyHandlers.js';

export function registerIpcHandlers() {
  registerHistoryHandlers();
  registerCredentialHandlers();
  registerDialogHandlers();
  registerPinataHandlers();
  registerSessionKeyHandlers();
}
