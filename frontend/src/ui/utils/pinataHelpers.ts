import axios from 'axios';

export interface PinataCredentials {
  pinataApiKey: string;
  pinataSecretKey: string;
}

const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Backend API URL - can be configured via environment variable
const UPLOAD_API_URL =
  import.meta.env.VITE_UPLOAD_API_URL || 'http://localhost:9001';

/**
 * Configures Pinata credentials.
 */
export const configurePinata = (creds: PinataCredentials): Promise<boolean> => {
  if (!isElectron) {
    // In web mode, credentials are stored locally, no configuration needed
    return Promise.resolve(true);
  }
  return window.electronAPI.configurePinata(creds);
};

/**
 * Uploads a single file (e.g., model script) to IPFS via Pinata.
 * Works in both Electron (file path) and web (File object) modes.
 */
export const uploadFileToPinata = async (
  file: string | File
): Promise<string> => {
  if (isElectron) {
    if (typeof file !== 'string') {
      throw new Error('File path expected in Electron mode');
    }
    return window.electronAPI.uploadFileToPinata(file);
  } else {
    if (!(file instanceof File)) {
      throw new Error('File object expected in web mode');
    }

    const formData = new FormData();
    formData.append('file', file);

    const credentials = localStorage.getItem('pinata_credentials');
    if (!credentials) {
      throw new Error('Pinata credentials not found. Please configure in Settings.');
    }

    const { pinataApiKey, pinataSecretKey } = JSON.parse(credentials);

    const response = await axios.post(`${UPLOAD_API_URL}/upload/file`, formData, {
      headers: {
        'X-Pinata-Api-Key': pinataApiKey,
        'X-Pinata-Secret-Key': pinataSecretKey,
      },
    });

    return response.data.hash;
  }
};

/**
 * Uploads a large dataset to IPFS via Pinata using the chunking and manifest strategy.
 * Works in both Electron (file path) and web (File object) modes.
 */
export const uploadDatasetToPinata = async (
  file: string | File
): Promise<{ datasetHash: string; chunkCount: number }> => {
  if (isElectron) {
    if (typeof file !== 'string') {
      throw new Error('File path expected in Electron mode');
    }
    return window.electronAPI.uploadDatasetToPinata(file);
  } else {
    if (!(file instanceof File)) {
      throw new Error('File object expected in web mode');
    }

    const formData = new FormData();
    formData.append('file', file);

    const credentials = localStorage.getItem('pinata_credentials');
    if (!credentials) {
      throw new Error('Pinata credentials not found. Please configure in Settings.');
    }

    const { pinataApiKey, pinataSecretKey } = JSON.parse(credentials);

    const response = await axios.post(
      `${UPLOAD_API_URL}/upload/dataset`,
      formData,
      {
        headers: {
          'X-Pinata-Api-Key': pinataApiKey,
          'X-Pinata-Secret-Key': pinataSecretKey,
        },
      }
    );

    return {
      datasetHash: response.data.datasetHash,
      chunkCount: response.data.chunkCount,
    };
  }
};

/**
 * Lists all pinned files on Pinata.
 */
export const listFilesFromPinata = (): Promise<any[]> => {
  if (!isElectron) {
    throw new Error('listFilesFromPinata is only available in Electron mode');
  }
  return window.electronAPI.listFilesFromPinata();
};

/**
 * Fetches the content of a file from IPFS given its CID.
 */
export const fetchFileFromPinata = (cid: string): Promise<string> => {
  if (!isElectron) {
    throw new Error('fetchFileFromPinata is only available in Electron mode');
  }
  return window.electronAPI.fetchFileFromPinata(cid);
};

/**
 * Listens for real-time progress updates during a dataset upload.
 */
export const onPinataProgress = (callback: (message: string) => void) => {
  if (!isElectron) {
    return;
  }
  window.electronAPI.onPinataProgress(callback);
};
