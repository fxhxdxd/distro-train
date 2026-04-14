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

/**
 * Compute the keccak256 event-signature topic for a given ABI event name.
 * Used to guard decoding so we never attempt to parse the wrong event type.
 */
function eventTopic(eventName: string): string {
  const eventAbi = abi.find((e) => e.name === eventName && e.type === 'event');
  if (!eventAbi || !eventAbi.inputs) {
    throw new Error(`Event ABI for '${eventName}' not found`);
  }
  const web3 = new Web3();
  const signature = `${eventName}(${(eventAbi.inputs as any[]).map((i: any) => i.type).join(',')})`;
  return web3.utils.keccak256(signature);
}

// Cache topic hashes once at module load time.
let _weightsSubmittedTopic: string | null = null;
let _taskCreatedTopic: string | null = null;

function getWeightsSubmittedTopic(): string {
  if (!_weightsSubmittedTopic) _weightsSubmittedTopic = eventTopic('WeightsSubmitted');
  return _weightsSubmittedTopic;
}

function getTaskCreatedTopic(): string {
  if (!_taskCreatedTopic) _taskCreatedTopic = eventTopic('TaskCreated');
  return _taskCreatedTopic;
}

function decodeEvent(eventName: string, log: any) {
  const eventAbi = abi.find(
    (event) => event.name === eventName && event.type === 'event'
  );
  const web3 = new Web3();
  if (!eventAbi || !eventAbi.inputs) {
    throw new Error(`Event ABI for '${eventName}' not found or missing inputs`);
  }

  // Guard: reject the log immediately if topics[0] doesn't match this event's
  // signature hash.  Without this check, events with identical indexed-param
  // shapes (e.g. TaskCreated and WeightsSubmitted both have uint256 + address)
  // silently decode each other's data and produce garbage weight entries.
  const expectedTopic = eventTopic(eventName);
  if (!log.topics || log.topics[0]?.toLowerCase() !== expectedTopic.toLowerCase()) {
    throw new Error(`topics[0] mismatch for ${eventName}`);
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
  try {
    return AccountId.fromSolidityAddress(evmAddress).toString();
  } catch {
    // SDK conversion also failed (e.g. malformed address) — return raw value
    // so the weight entry is never silently dropped.
    return evmAddress;
  }
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
  // Allow the mirror node a few seconds to index the most recent transactions.
  await new Promise((res) => setTimeout(res, 5000));

  const MIRROR = 'https://testnet.mirrornode.hedera.com';
  const foundWeights: WeightEntry[] = [];
  const seenCids = new Set<string>();

  // Paginate through ALL contract logs (newest → oldest).
  // We stop early once we encounter the TaskCreated event for this task,
  // because no WeightsSubmitted events for this task can appear after that
  // point in the descending order.
  let nextUrl: string | null =
    `${MIRROR}/api/v1/contracts/${contractId}/results/logs?order=desc&limit=100`;
  const MAX_PAGES = 50; // safety cap (~5 000 logs)
  let page = 0;

  try {
    while (nextUrl && page < MAX_PAGES) {
      page++;
      const response = await axios.get(nextUrl);
      const { logs, links } = response.data as {
        logs: any[];
        links?: { next?: string };
      };

      console.log(
        `[fetchWeightsSubmittedEvent] page ${page}: ${logs.length} logs`
      );

      let taskCreatedSeen = false;

      for (const log of logs) {
        // ── WeightsSubmitted ────────────────────────────────────────────────
        try {
          const event = decodeEvent('WeightsSubmitted', log);

          if ((event.taskId as string).toString() === taskId) {
            const weightsHash = event.weightsHash as string;
            const trainerAddress = await resolveOperatorId(
              event.trainer as string
            );

            console.log(
              `WeightsSubmitted for task ${taskId}: trainer=${trainerAddress} hash=${weightsHash}`
            );

            const hashes = weightsHash.includes(',')
              ? weightsHash.split(',').map((h) => h.trim()).filter(Boolean)
              : [weightsHash.trim()];

            for (const h of hashes) {
              const cid = extractCid(h);
              if (seenCids.has(cid)) {
                console.log(`Skipping duplicate CID: ${cid}`);
                continue;
              }
              seenCids.add(cid);

              const presignedUrl = await generatePresignedUrl(cid);
              foundWeights.push({ url: presignedUrl ?? cid, cid, trainerAddress });
            }
          }
        } catch {
          // Not a WeightsSubmitted log — try next event type below.
        }

        // ── TaskCreated — signals we've passed all events for this task ────
        try {
          const event = decodeEvent('TaskCreated', log);
          if ((event.taskId as string).toString() === taskId) {
            console.log(
              `TaskCreated found for task ${taskId} — stopping pagination.`
            );
            taskCreatedSeen = true;
          }
        } catch {
          // Not a TaskCreated log.
        }
      }

      // Early exit: we've gone back far enough in time.
      if (taskCreatedSeen) break;

      nextUrl = links?.next ? `${MIRROR}${links.next}` : null;
    }

    console.log(`Found ${foundWeights.length} weight(s) for task ${taskId}.`);
    return foundWeights;
  } catch (err) {
    console.error('Error fetching event logs:', err);
    return null;
  }
}
