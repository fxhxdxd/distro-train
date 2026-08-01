/**
 * sessionKeys.ts
 *
 * Storage for the per-round RSA private key.
 *
 * Each training round generates a throwaway RSA-OAEP keypair. The public half
 * goes out to trainers in the `assign` pubsub message; the private half has to
 * outlive the page session, because weight submissions trickle in over minutes
 * and the user may reload or reopen the app before the round finishes. A key
 * lost before collection makes every weight file for that round unreadable.
 *
 * Electron stores it in the OS keychain via keytar. The browser fallback uses
 * localStorage, which is readable by any XSS on the origin: acceptable for a
 * throwaway key scoped to one round, not acceptable for long-lived secrets.
 * Electron is the supported path.
 */

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
const LS_PREFIX = 'distro_train_roundkey_';

export async function saveRoundKey(
  taskId: string,
  privateKeyB64: string
): Promise<void> {
  if (isElectron) {
    return window.electronAPI.saveRoundKey(taskId, privateKeyB64);
  }
  localStorage.setItem(LS_PREFIX + taskId, privateKeyB64);
}

export async function loadRoundKey(taskId: string): Promise<string | null> {
  if (isElectron) {
    return window.electronAPI.loadRoundKey(taskId);
  }
  return localStorage.getItem(LS_PREFIX + taskId);
}

export async function deleteRoundKey(taskId: string): Promise<void> {
  if (isElectron) {
    await window.electronAPI.deleteRoundKey(taskId);
    return;
  }
  localStorage.removeItem(LS_PREFIX + taskId);
}

// ── Key generation ────────────────────────────────────────────────────────────

export interface RoundKeypair {
  /** PEM-encoded SPKI public key, ready to be sent to trainers. */
  publicPem: string;
  /** Base64 PKCS#8 private key, as persisted. */
  privateKeyB64: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // chunked to avoid blowing the argument stack
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

function toPem(base64: string, label: string): string {
  const lines = base64.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN ${label} KEY-----\n${lines}\n-----END ${label} KEY-----`;
}

/**
 * Generate the round keypair and persist the private half under `taskId`.
 *
 * `extractable: true` is required because the private key has to be exported
 * to PKCS#8 to be stored at all. That is the cost of surviving a reload.
 */
export async function generateAndStoreRoundKeypair(
  taskId: string
): Promise<RoundKeypair> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);

  const privateKeyB64 = arrayBufferToBase64(pkcs8);
  await saveRoundKey(taskId, privateKeyB64);

  return {
    publicPem: toPem(arrayBufferToBase64(spki), 'PUBLIC'),
    privateKeyB64,
  };
}

/**
 * Import the stored PKCS#8 key for a round back into a usable CryptoKey.
 * Returns null when no key was stored, which means the round predates
 * encrypted submissions or the key was lost.
 */
export async function importRoundPrivateKey(
  taskId: string
): Promise<CryptoKey | null> {
  const stored = await loadRoundKey(taskId);
  if (!stored) return null;

  const binary = atob(stored);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}
