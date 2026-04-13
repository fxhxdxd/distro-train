import axios from 'axios';

interface AdvertizeResponse {
  received: {
    args: string[];
    cmd: string;
  };
  status: 'ok' | string;
}

interface TrainerNode {
  maddr: string;
  peer_id: string;
  pub_maddr: string;
  role: 'TRAINER' | 'CLIENT';
}

interface BootmeshResponse {
  bootmesh: {
    [projectName: string]: TrainerNode[];
  };
  status: 'ok' | string;
}

interface TrainPayload {
  projectId: string;
  datasetAndModelHashAndPublicKey: string;
}

interface TrainResponse {
  received: {
    args: string[];
    cmd: string;
  };
  status: 'ok' | string;
}

const apiClient = axios.create({
  baseURL: 'http://localhost:9001',  // CLIENT node API (bootstrap is on 9000)
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    let errorMessage = 'An unknown error occurred.';

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage =
          error.response.data?.error ||
          `Request failed with status ${error.response.status}`;
      } else if (error.request) {
        errorMessage =
          'Could not connect to the server. Please ensure it is running.';
      } else {
        errorMessage = error.message;
      }
    }

    return Promise.reject(new Error(errorMessage));
  }
);
export const initializeTrainingRound = async (
  projectName: string
): Promise<boolean> => {
  const requestBody = {
    cmd: 'advertize',
    args: [projectName],
  };
  const response = await apiClient.post<AdvertizeResponse>(
    '/command',
    requestBody
  );
  return response.data && response.data.status === 'ok';
};

export const fetchNetworkState = async (): Promise<BootmeshResponse> => {
  const requestBody = {
    cmd: 'bootmesh',
  };

  const response = await apiClient.post<BootmeshResponse>(
    '/command',
    requestBody
  );
  return response.data;
};

export const startFinalTraining = async (
  payload: TrainPayload
): Promise<boolean> => {
  const requestBody = {
    cmd: 'train',
    args: [payload.projectId, payload.datasetAndModelHashAndPublicKey],
  };
  console.log([payload.projectId, payload.datasetAndModelHashAndPublicKey]);
  const response = await apiClient.post<TrainResponse>('/command', requestBody);
  return response.data && response.data.status === 'ok';
};

/**
 * Fetch a dataset manifest from its IPFS gateway URL and return the list of
 * chunk gateway URLs it contains (comma-separated content).
 */
export const fetchManifest = async (manifestUrl: string): Promise<string[]> => {
  const response = await axios.get<string>(manifestUrl);
  const raw = typeof response.data === 'string' ? response.data : String(response.data);
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
};

interface VerifyWeightResponse {
  status: 'ok' | string;
  weights: string;
}

/**
 * Ask the client node to re-run the model on a specific chunk and return the
 * locally-computed weights string for comparison.
 */
export const verifyWeight = async (
  chunkUrl: string,
  modelUrl: string
): Promise<string> => {
  const response = await apiClient.post<VerifyWeightResponse>('/verify-weight', {
    chunkUrl,
    modelUrl,
  });
  if (response.data.status !== 'ok') {
    throw new Error('Verification endpoint returned non-ok status');
  }
  return response.data.weights;
};
