import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import readline from 'readline';
const PINATA_API_URL = 'https://api.pinata.cloud';
const DEFAULT_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs';
export class PinataCliService {
    apiKey;
    secretApiKey;
    gatewayUrl;
    constructor(apiKey, secretApiKey, gatewayUrl) {
        this.apiKey = apiKey || process.env.PINATA_API_KEY || '';
        this.secretApiKey = secretApiKey || process.env.PINATA_SECRET_API_KEY || '';
        this.gatewayUrl = gatewayUrl || process.env.PINATA_GATEWAY_URL || DEFAULT_GATEWAY_URL;
    }
    configure(apiKey, secretApiKey) {
        this.apiKey = apiKey;
        this.secretApiKey = secretApiKey;
        console.log('Pinata credentials configured successfully!');
        return true;
    }
    get headers() {
        return {
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.secretApiKey,
        };
    }
    getGatewayUrl(cid) {
        return `${this.gatewayUrl}/${cid}`;
    }
    async pinFile(filePath) {
        const fileBuffer = await fs.promises.readFile(filePath);
        const fileName = path.basename(filePath);
        const form = new FormData();
        form.append('file', new Blob([fileBuffer]), fileName);
        const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
            method: 'POST',
            headers: {
                ...this.headers,
            },
            body: form,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Pinata upload failed (${response.status}): ${text}`);
        }
        const data = (await response.json());
        return data.IpfsHash;
    }
    async uploadString(content) {
        const tempFilePath = path.join(os.tmpdir(), `pinata-chunk-${crypto.randomBytes(16).toString('hex')}`);
        try {
            await fs.promises.writeFile(tempFilePath, content, 'utf8');
            return await this.pinFile(tempFilePath);
        }
        finally {
            if (fs.existsSync(tempFilePath)) {
                await fs.promises.unlink(tempFilePath);
            }
        }
    }
    async uploadFile(filePath) {
        const cid = await this.pinFile(filePath);
        return this.getGatewayUrl(cid);
    }
    async uploadDatasetInChunks(filePath, onProgress) {
        const CHUNK_SIZE = 50 * 1024;
        const chunkUrls = [];
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity,
        });
        const iterator = rl[Symbol.asyncIterator]();
        const headerResult = await iterator.next();
        if (headerResult.done) {
            throw new Error('Cannot process an empty or headerless file.');
        }
        const header = headerResult.value + '\n';
        let currentChunk = [], currentSize = 0, chunkIndex = 0;
        for await (const line of { [Symbol.asyncIterator]: () => iterator }) {
            const lineWithNewline = line + '\n';
            const lineSize = Buffer.byteLength(lineWithNewline, 'utf-8');
            if (currentSize + lineSize > CHUNK_SIZE && currentChunk.length > 0) {
                chunkIndex++;
                onProgress(`Uploading chunk ${chunkIndex}...`);
                const chunkContent = header + currentChunk.join('');
                const chunkCid = await this.uploadString(chunkContent);
                chunkUrls.push(this.getGatewayUrl(chunkCid));
                currentChunk = [lineWithNewline];
                currentSize = lineSize;
            }
            else {
                currentChunk.push(lineWithNewline);
                currentSize += lineSize;
            }
        }
        if (currentChunk.length > 0) {
            chunkIndex++;
            onProgress(`Uploading final chunk ${chunkIndex}...`);
            const chunkContent = header + currentChunk.join('');
            const chunkCid = await this.uploadString(chunkContent);
            chunkUrls.push(this.getGatewayUrl(chunkCid));
        }
        onProgress('Uploading manifest file...');
        const manifestContent = chunkUrls.join(',');
        const manifestCid = await this.uploadString(manifestContent);
        onProgress('Dataset uploaded successfully!');
        const datasetHash = this.getGatewayUrl(manifestCid);
        return { datasetHash, chunkCount: chunkUrls.length };
    }
    async listFiles() {
        const response = await fetch(`${PINATA_API_URL}/data/pinList?status=pinned`, { headers: this.headers });
        if (!response.ok) {
            throw new Error(`Failed to list pins: ${response.statusText}`);
        }
        const data = (await response.json());
        return data.rows || [];
    }
    async fetchFile(cid) {
        const url = this.getGatewayUrl(cid);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        return await response.text();
    }
}
