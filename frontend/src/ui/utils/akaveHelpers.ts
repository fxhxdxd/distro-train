import axios from 'axios';

export interface AkaveCredentials {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
}

const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Backend API URL - can be configured via environment variable
const UPLOAD_API_URL =
  import.meta.env.VITE_UPLOAD_API_URL || 'http://localhost:9001';

/**
 * Configures the AWS CLI profile with Akave credentials.
 */
export const configureAkave = (creds: AkaveCredentials): Promise<boolean> => {
  if (!isElectron) {
    // In web mode, credentials are stored locally, no configuration needed
    return Promise.resolve(true);
  }
  return window.electronAPI.configureAkave(creds);
};

/**
 * Uploads a single file (e.g., model script) to Akave.
 * Works in both Electron (file path) and web (File object) modes.
 */
export const uploadFileToAkave = async (
  file: string | File
): Promise<string> => {
  if (isElectron) {
    // Electron mode: use file path
    if (typeof file !== 'string') {
      throw new Error('File path expected in Electron mode');
    }
    return window.electronAPI.uploadFileToAkave(file);
  } else {
    // Web mode: use File object and backend API
    if (!(file instanceof File)) {
      throw new Error('File object expected in web mode');
    }

    const formData = new FormData();
    formData.append('file', file);

    // Get credentials from localStorage
    const credentials = localStorage.getItem('aws_credentials');
    if (!credentials) {
      throw new Error('AWS credentials not found. Please configure in Settings.');
    }

    const { awsAccessKeyId, awsSecretAccessKey } = JSON.parse(credentials);

    const response = await axios.post(`${UPLOAD_API_URL}/upload/file`, formData, {
      headers: {
        'X-AWS-Access-Key-Id': awsAccessKeyId,
        'X-AWS-Secret-Access-Key': awsSecretAccessKey,
      },
    });

    return response.data.hash;
  }
};

/**
 * Uploads a large dataset to Akave using the chunking and manifest strategy.
 * Works in both Electron (file path) and web (File object) modes.
 */
export const uploadDatasetToAkave = async (
  file: string | File
): Promise<{ datasetHash: string; chunkCount: number }> => {
  if (isElectron) {
    // Electron mode: use file path
    if (typeof file !== 'string') {
      throw new Error('File path expected in Electron mode');
    }
    return window.electronAPI.uploadDatasetToAkave(file);
  } else {
    // Web mode: use File object and backend API
    if (!(file instanceof File)) {
      throw new Error('File object expected in web mode');
    }

    const formData = new FormData();
    formData.append('file', file);

    // Get credentials from localStorage
    const credentials = localStorage.getItem('aws_credentials');
    if (!credentials) {
      throw new Error('AWS credentials not found. Please configure in Settings.');
    }

    const { awsAccessKeyId, awsSecretAccessKey } = JSON.parse(credentials);

    const response = await axios.post(
      `${UPLOAD_API_URL}/upload/dataset`,
      formData,
      {
        headers: {
          'X-AWS-Access-Key-Id': awsAccessKeyId,
          'X-AWS-Secret-Access-Key': awsSecretAccessKey,
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
 * Lists all files in the Akave bucket.
 */
export const listFilesFromAkave = (): Promise<any[]> => {
  if (!isElectron) {
    throw new Error('listFilesFromAkave is only available in Electron mode');
  }
  return window.electronAPI.listFilesFromAkave();
};

/**
 * Fetches the content of a file from Akave given its object key.
 */
export const fetchFileFromAkave = (objectKey: string): Promise<string> => {
  if (!isElectron) {
    throw new Error('fetchFileFromAkave is only available in Electron mode');
  }
  return window.electronAPI.fetchFileFromAkave(objectKey);
};

/**
 * Listens for real-time progress updates during a dataset upload.
 */
export const onAkaveProgress = (callback: (message: string) => void) => {
  if (!isElectron) {
    // In web mode, progress updates would need to be handled differently
    // For now, we'll just no-op
    return;
  }
  window.electronAPI.onAkaveProgress(callback);
};
