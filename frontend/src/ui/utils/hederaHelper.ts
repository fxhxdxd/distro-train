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
import { OPERATOR_ID, OPERATOR_KEY, CONTRACT_ID } from './constant';
import { importRoundPrivateKey } from './sessionKeys';
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

/**
 * Returns true while the task is still running on-chain, false once every
 * chunk has been submitted (taskExists flips to false), and null when the
 * query itself failed. Callers MUST treat null as "unknown" — a failed query
 * previously returned false, which the history poller misread as "task
 * complete" and froze a partial weight list into the project.
 */
export const checkTaskStatus = async (
  taskId: string
): Promise<boolean | null> => {
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
    return null;
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

/** Wire prefix the trainer stamps on an encrypted submission. */
const ENCRYPTED_PAYLOAD_PREFIX = 'v1';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * True when `value` is an encrypted submission rather than a bare CID.
 *
 * Rounds that ran before encryption landed still have plaintext CIDs in their
 * event logs, and those have to keep working, so the format is sniffed rather
 * than assumed.
 */
export function isEncryptedPayload(value: string): boolean {
  const parts = value.trim().split('.');
  return parts.length === 4 && parts[0] === ENCRYPTED_PAYLOAD_PREFIX;
}

/**
 * Decrypt a `v1.<wrappedKey>.<iv>.<ciphertext>` submission.
 *
 * Unwraps the AES-256-GCM key with RSA-OAEP, then decrypts the payload. GCM
 * verifies its tag during decrypt, so a tampered or truncated payload throws
 * here instead of returning a plausible-looking wrong CID.
 */
export async function decryptSubmission(
  payload: string,
  privateKey: CryptoKey
): Promise<string> {
  const [, wrappedKeyB64, ivB64, ciphertextB64] = payload.trim().split('.');

  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToBytes(wrappedKeyB64)
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivB64) },
    aesKey,
    base64ToBytes(ciphertextB64)
  );

  return new TextDecoder().decode(plaintext);
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

  // Loaded once per scan rather than per log. Null for rounds that predate
  // encrypted submissions, which still carry plaintext CIDs.
  const privateKey = await importRoundPrivateKey(taskId).catch((err) => {
    console.error(`Could not load round key for task ${taskId}:`, err);
    return null;
  });

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

            for (const raw of hashes) {
              // Decrypt BEFORE deduping. RSA-OAEP is randomised, so the same
              // CID encrypts to a different payload every time and deduping on
              // the ciphertext would never match.
              let h = raw;
              if (isEncryptedPayload(raw)) {
                if (!privateKey) {
                  console.warn(
                    `Task ${taskId}: encrypted submission but no round key ` +
                      `available, skipping. The key is stored per task when ` +
                      `training starts and cannot be recovered if lost.`
                  );
                  continue;
                }
                try {
                  h = await decryptSubmission(raw, privateKey);
                } catch (err) {
                  // A GCM tag failure means the payload was tampered with, or
                  // it was encrypted to a different key than this round's.
                  console.error(
                    `Failed to decrypt a submission for task ${taskId}:`,
                    err
                  );
                  continue;
                }
              }

              const cid = extractCid(h);
              if (seenCids.has(cid)) {
                console.log(`Skipping duplicate CID: ${cid}`);
                continue;
              }
              seenCids.add(cid);

              const presignedUrl = await generatePresignedUrl(cid);
              // Never fall back to a bare CID for `url`: fetching "<cid>"
              // resolves relative to the renderer origin (e.g.
              // http://localhost:5173/<cid>), so the dev server returns
              // index.html and weight parsing fails with "Unexpected token '<'".
              // Use a full public gateway URL as the fallback instead.
              const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
              foundWeights.push({
                url: presignedUrl ?? gatewayUrl,
                cid,
                trainerAddress,
              });
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
