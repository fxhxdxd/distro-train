import type { ISettings } from '../renderer';

const STORAGE_KEY = 'aws_credentials';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

export const saveCredentials = async (settings: ISettings): Promise<void> => {
  if (isElectron) {
    // Electron mode: use secure keytar storage
    return window.electronAPI.saveCredentials(settings);
  } else {
    // Web mode: use localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save credentials to localStorage:', error);
      return Promise.reject(
        new Error('Failed to save credentials. Please check your browser settings.')
      );
    }
  }
};

export const loadCredentials = async (): Promise<ISettings | null> => {
  if (isElectron) {
    // Electron mode: use secure keytar storage
    return window.electronAPI.loadCredentials();
  } else {
    // Web mode: use localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ISettings;
      }
      return null;
    } catch (error) {
      console.error('Failed to load credentials from localStorage:', error);
      return null;
    }
  }
};
