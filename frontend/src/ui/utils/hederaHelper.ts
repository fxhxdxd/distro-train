import {
  ContractCallQuery,
  Client,
  ContractFunctionParameters,
  AccountId,
  Hbar,
} from '@hashgraph/sdk';
import axios from 'axios';
import Web3 from 'web3';
import { abi } from './abi';
import {
  OPERATOR_ID,
  OPERATOR_KEY,
  CONTRACT_ID,
  privateKeyPem,
} from './constant';
import { PrivateKey } from '@hashgraph/sdk';

export interface WeightEntry {
  /** Presigned URL or bare CID — use this for downloads */
  url: string;
  /** Bare IPFS CID (canonical, deduplicated) */
  cid: string;
  /** Hedera account ID of the trainer node, e.g. "0.0.12345" */
  trainerAddress: string;
}


export const getTaskId = async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  await delay(2000); // Wait for 2 seconds
  const client = Client.forTestnet();
  client.setDefaultMaxQueryPayment(new Hbar(5));
  const operatorKey = PrivateKey.fromStringECDSA(OPERATOR_KEY);
  client.setOperator(OPERATOR_ID, operatorKey);

  const tx_get = new ContractCallQuery()
    .setContractId(CONTRACT_ID)
    .setGas(1_000_000)
    .setFunction('getTaskId');

  const contractCallResult = await tx_get.execute(client);
  const message = contractCallResult.getUint256(0);
  return message.toString();
};

export const checkTaskStatus = async (taskId: string): Promise<boolean> => {
  try {
    const client = Client.forTestnet();
    client.setDefaultMaxQueryPayment(new Hbar(5));
    const operatorKey = PrivateKey.fromStringECDSA(OPERATOR_KEY);
    client.setOperator(OPERATOR_ID, operatorKey);
    const query = new ContractCallQuery()
      .setContractId(CONTRACT_ID)
      .setGas(1_000_000)
      .setFunction(
        'taskExists',
        new ContractFunctionParameters().addUint256(parseInt(taskId))
      );

    const result = await query.execute(client);
    const message = result.getBool(0);
    console.log('result', message);
    return message;
  } catch (error) {
    console.error(`Failed to check status for task ${taskId}:`, error);
    // Return false on error to prevent the polling from crashing
    return false;
  }
};

function decodeEvent(eventName: string, log: any) {
  const eventAbi = abi.find(
    (event) => event.name === eventName && event.type === 'event'
  );
  const web3 = new Web3();
  if (!eventAbi || !eventAbi.inputs) {
    throw new Error(`Event ABI for '${eventName}' not found or missing inputs`);
  }

  const decodedLog = web3.eth.abi.decodeLog(
    eventAbi.inputs,
    log.data || '0x',
    log.topics.slice(1)
  );
  return decodedLog;
}

async function decryptMessage(base64Ciphertext: any, privateKeyPem: any) {
  function base64ToArrayBuffer(base64: any) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function pemToArrayBuffer(pem: any) {
    const b64Lines = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    return base64ToArrayBuffer(b64Lines);
  }

  const keyBuffer = pemToArrayBuffer(privateKeyPem);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  const ciphertext = base64ToArrayBuffer(base64Ciphertext);
  console.log('ciphertext ', ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    ciphertext
  );
  console.log('decrypted: ', decrypted);

  return new TextDecoder().decode(decrypted);
}

export async function generatePresignedUrl(hash: string): Promise<string | null> {
  try {
    const clientApiUrl = 'http://localhost:9001'; // Client node API
    console.log(`Requesting presigned URL for hash: ${hash}`);

    const response = await axios.post(`${clientApiUrl}/generate-presigned-url`, {
      hash: hash
    });

    if (response.data.status === 'ok') {
      console.log(`Presigned URL generated: ${response.data.presignedUrl}`);
      return response.data.presignedUrl;
    }

    console.warn('Failed to generate presigned URL:', response.data);
    // #region agent log
    fetch('http://127.0.0.1:7710/ingest/7ac52342-3854-424e-853b-78553b66bed5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f5fd95'},body:JSON.stringify({sessionId:'f5fd95',runId:'pre-fix',hypothesisId:'H403',location:'frontend/src/ui/utils/hederaHelper.ts:133',message:'generatePresignedUrl returned non-ok status',data:{hash,status:response.data?.status ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    return null;
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    // #region agent log
    fetch('http://127.0.0.1:7710/ingest/7ac52342-3854-424e-853b-78553b66bed5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f5fd95'},body:JSON.stringify({sessionId:'f5fd95',runId:'pre-fix',hypothesisId:'H403',location:'frontend/src/ui/utils/hederaHelper.ts:136',message:'generatePresignedUrl threw',data:{hash,errorName:(error as any)?.name ?? null,errorMessage:(error as any)?.message ?? String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    return null;
  }
}

/**
 * Resolve an EVM address (0x...) to a canonical Hedera account ID (0.0.12345)
 * by querying the mirror node.  Falls back to the SDK conversion if the lookup
 * fails or the account field is absent.
 */
async function resolveOperatorId(evmAddress: string): Promise<string> {
  try {
    const addr = evmAddress.startsWith('0x') ? evmAddress : `0x${evmAddress}`;
    const res = await axios.get(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${addr}`
    );
    if (res.data?.account) return res.data.account as string;
  } catch {
    // mirror node unavailable — fall through to SDK
  }
  return AccountId.fromSolidityAddress(evmAddress).toString();
}

/**
 * Extract a raw IPFS CID from a value that may be a full gateway URL or a bare CID.
 * e.g. "https://gateway.pinata.cloud/ipfs/QmXYZ" → "QmXYZ"
 *      "QmXYZ" → "QmXYZ"
 */
function extractCid(hashOrUrl: string): string {
  const trimmed = hashOrUrl.trim();
  const gatewayMarker = '/ipfs/';
  const idx = trimmed.lastIndexOf(gatewayMarker);
  if (idx !== -1) {
    return trimmed.slice(idx + gatewayMarker.length).split('?')[0];
  }
  return trimmed;
}

export async function fetchWeightsSubmittedEvent(
  contractId: string,
  taskId: string
): Promise<WeightEntry[] | null> {
  await new Promise((res) => setTimeout(res, 5000));

  const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${contractId.toString()}/results/logs?order=desc&limit=100`;
  const foundWeights: WeightEntry[] = [];
  const seenCids = new Set<string>();
  try {
    const response = await axios.get(url);
    const jsonResponse = response.data;
    console.log(
      `Found ${jsonResponse.logs.length} total event(s) for the contract.`
    );

    for (const log of jsonResponse.logs) {
      try {
        const event = decodeEvent('WeightsSubmitted', log);

        if ((event.taskId as string).toString() === taskId) {
          const weightsHash = event.weightsHash as string;
          const trainerAddress = await resolveOperatorId(event.trainer as string);

          console.log(
            `Found matching 'WeightsSubmitted' event for task ${taskId}:`,
            event
          );
          console.log(`Weights Hash: ${weightsHash}`);
          console.log(`Trainer: ${trainerAddress}`);
          console.log(`Reward: ${event.rewardAmount}`);

          const hashes = weightsHash.includes(',')
            ? weightsHash.split(',').map((h) => h.trim()).filter(Boolean)
            : [weightsHash.trim()];

          for (const h of hashes) {
            // Normalize to bare CID to avoid double-prefixing and duplicates
            const cid = extractCid(h);
            if (seenCids.has(cid)) {
              console.log(`Skipping duplicate CID: ${cid}`);
              continue;
            }
            seenCids.add(cid);

            const presignedUrl = await generatePresignedUrl(cid);
            const entryUrl = presignedUrl ?? cid;

            if (presignedUrl) {
              console.log(`Presigned URL: ${presignedUrl}`);
            }

            foundWeights.push({ url: entryUrl, cid, trainerAddress });
          }
        }
      } catch (err) {
        console.log('Error decoding event: ', err);
        // This will catch errors from decodeEvent if the log is for a different event type.
        // We can safely ignore these and continue searching.
      }
    }

    console.log(`Found ${foundWeights.length} weights for task ${taskId}.`);
    return foundWeights;
  } catch (err) {
    console.error('Error fetching event logs:', err);
    return null;
  }
}
