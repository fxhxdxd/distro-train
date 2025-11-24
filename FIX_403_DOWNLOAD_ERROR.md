# Fix 403 Error When Downloading Weights

## Problem Analysis

### What's Happening

**Error:** 403 Forbidden when trying to download final weights hash

**Root Cause:** The URL you're trying to download from doesn't have presigned parameters.

### The Flow

1. **Training Completes:**
   - Weights uploaded to Akave with **presigned URL** (valid for ~10 hours)
   - Example: `https://o3-rc2.akave.xyz/akave-bucket/HASH?X-Amz-Algorithm=...&X-Amz-Signature=...`

2. **Coordinator Extracts Hash:**
   - Takes only the hash part: `HASH`
   - Submits to blockchain: `submitWeights(taskId, "HASH")`

3. **Frontend Fetches from Blockchain:**
   - Reads event: `weightsHash = "HASH"`
   - Reconstructs URL: `https://o3-rc2.akave.xyz/akave-bucket/HASH` ← **No presigned params!**

4. **Download Attempt:**
   - Frontend tries to download from reconstructed URL
   - **403 Forbidden** - Akave bucket requires authentication

### Why It Fails

The presigned URL parameters (`X-Amz-*`) are **temporary authentication tokens** that:
- ✅ Were included in the original upload URL
- ❌ Are NOT stored on the blockchain (only hash is stored)
- ❌ Cannot be reconstructed without AWS credentials
- ⏱️ Expire after a certain time (default: 10 hours)

## Solution Options

### Option 1: Generate Fresh Presigned URL (RECOMMENDED) ✅

When the user wants to download, regenerate a fresh presigned URL from the hash.

**Pros:**
- ✅ Always works (even after original URL expires)
- ✅ Secure (new signed URL each time)
- ✅ Follows AWS best practices

**Cons:**
- ⚠️ Requires backend API endpoint
- ⚠️ Needs AWS credentials configured

### Option 2: Store Full URL Off-Chain

Store the complete presigned URL in HCS topic or local database.

**Pros:**
- ✅ Simple to implement
- ✅ No need to regenerate

**Cons:**
- ❌ URLs expire after ~10 hours
- ❌ Requires additional storage
- ❌ Not scalable for long-term storage

### Option 3: Make Bucket Public (TESTING ONLY) 🔓

Configure Akave bucket as public (no authentication needed).

**Pros:**
- ✅ Simplest solution
- ✅ No presigned URLs needed

**Cons:**
- ❌ **INSECURE** - Anyone can access weights
- ❌ Not suitable for production
- ❌ Defeats purpose of blockchain-based access control

## Recommended Implementation (Option 1)

### Architecture

```
Frontend (Download Request)
    ↓
Backend API (/api/generate-presigned-url)
    ↓
Akave CLI (aws s3 presign)
    ↓
Return Presigned URL
    ↓
Frontend (Download File)
```

### Step 1: Create Backend API Endpoint

Add a new API endpoint to the client node API server.

**File:** `p2p/coordinator.py` (in the `create_app()` function)

```python
@app.route("/generate-presigned-url", methods=["POST"])
async def generate_presigned_url():
    try:
        data = await request.get_json()
        weights_hash = data.get("hash")

        if not weights_hash:
            return jsonify({"error": "hash parameter required"}), 400

        # Generate presigned URL using Akave client
        from akave.mcache import Akave
        akave_client = Akave()

        presigned_url = akave_client.get_presigned_url(
            key=weights_hash,
            expires_in=3600  # 1 hour validity
        )

        if presigned_url:
            return jsonify({
                "status": "ok",
                "presignedUrl": presigned_url,
                "hash": weights_hash
            })
        else:
            return jsonify({"error": "Failed to generate presigned URL"}), 500

    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return jsonify({"error": str(e)}), 500
```

### Step 2: Update Frontend to Request Presigned URL

**File:** `frontend/src/ui/utils/hederaHelper.ts`

Update the `fetchWeightsSubmittedEvent` function:

```typescript
export async function fetchWeightsSubmittedEvent(
  contractId: string,
  taskId: string
): Promise<string[] | null> {
  await new Promise((res) => setTimeout(res, 5000));

  const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${contractId.toString()}/results/logs?order=desc&limit=100`;
  const foundWeights: string[] = [];

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

          // NEW: Request presigned URL from backend
          const presignedUrl = await generatePresignedUrl(weightsHash);

          if (presignedUrl) {
            foundWeights.push(presignedUrl);
            console.log(`Weights Hash: ${weightsHash}`);
            console.log(`Presigned URL: ${presignedUrl}`);
          } else {
            console.warn(`Failed to generate presigned URL for hash: ${weightsHash}`);
            // Fallback to base URL (will likely fail download)
            const akaveBaseUrl = 'https://o3-rc2.akave.xyz/akave-bucket';
            foundWeights.push(`${akaveBaseUrl}/${weightsHash}`);
          }

          console.log(
            `Found matching 'WeightsSubmitted' event for task ${taskId}:`,
            event
          );
        }
      } catch (err) {
        console.log('Error decoding event: ', err);
      }
    }

    console.log(`Found ${foundWeights.length} weights for task ${taskId}.`);
    return foundWeights;
  } catch (err) {
    console.error('Error fetching event logs:', err);
    return null;
  }
}

// NEW: Helper function to generate presigned URL
async function generatePresignedUrl(hash: string): Promise<string | null> {
  try {
    const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://0.0.0.0:9001';
    const response = await axios.post(`${clientApiUrl}/generate-presigned-url`, {
      hash: hash
    });

    if (response.data.status === 'ok') {
      return response.data.presignedUrl;
    }
    return null;
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return null;
  }
}
```

### Step 3: Ensure AWS Credentials Are Configured

The Akave client needs AWS credentials to generate presigned URLs.

**Check:** `p2p/.env` should have:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

**Verify AWS CLI is configured:**
```bash
cd p2p
python3 -c "from akave.mcache import Akave; Akave.configure_aws()"
```

Or run from the frontend (client node should configure automatically on startup).

## Alternative Quick Fix (Option 2 - Store Full URL)

If you want a faster solution without backend API changes:

### Modify Coordinator to Store Full URL in HCS

**File:** `p2p/coordinator.py` (around line 510)

```python
# After publishing hash to blockchain
if self.current_task_id is None:
    logger.error("Task ID not set, cannot submit weights to blockchain")
else:
    # Publish hash to blockchain
    self.publish_on_chain(
        self.current_task_id,
        akave_hash,
    )

    # ALSO store full URL in HCS for later retrieval
    full_url_message = f"WEIGHTS_URL:{self.current_task_id}:{weights_url_str}"
    self.submit_hcs_message(full_url_message)
    logger.info(f"Stored full weights URL in HCS for task {self.current_task_id}")
```

### Frontend Fetches from HCS

Create a new function to query HCS messages and extract weights URLs:

```typescript
async function fetchWeightsFromHCS(taskId: string): Promise<string | null> {
  // Query HCS topic for messages containing WEIGHTS_URL:{taskId}:
  // Parse and return the full URL
  // This requires implementing HCS query in frontend
}
```

**Note:** This is more complex and HCS integration in frontend may require additional work.

## Testing Quick Fix (Option 3 - Public Bucket)

**⚠️ FOR TESTING ONLY - NOT FOR PRODUCTION**

Make the bucket public so no presigned URLs needed:

```bash
aws s3api put-bucket-policy \
  --bucket akave-bucket \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::akave-bucket/*"
    }]
  }' \
  --endpoint-url https://o3-rc2.akave.xyz \
  --profile akave-o3
```

Then the simple URL will work:
```
https://o3-rc2.akave.xyz/akave-bucket/HASH
```

## Implementation Checklist

### For Option 1 (Recommended):

- [ ] Add `/generate-presigned-url` endpoint to `p2p/coordinator.py`
- [ ] Update `hederaHelper.ts` with `generatePresignedUrl()` function
- [ ] Update `fetchWeightsSubmittedEvent()` to use presigned URL generation
- [ ] Verify AWS credentials in `p2p/.env`
- [ ] Test: Create training task → Complete → Download weights

### For Option 2 (Store URL in HCS):

- [ ] Modify coordinator to publish full URL to HCS
- [ ] Implement HCS query in frontend
- [ ] Update frontend to fetch from HCS
- [ ] Test end-to-end

### For Option 3 (Public Bucket - Testing Only):

- [ ] Run bucket policy command
- [ ] Test direct URL access
- [ ] ⚠️ **Remove before production!**

## Expected Behavior After Fix

1. User clicks "Download" on weights
2. Frontend fetches hash from blockchain event
3. Frontend calls `/generate-presigned-url` API with hash
4. Backend generates fresh presigned URL (valid for 1 hour)
5. Frontend receives presigned URL
6. Download starts successfully ✅

## Error Handling

Add proper error messages:

```typescript
const presignedUrl = await generatePresignedUrl(weightsHash);

if (!presignedUrl) {
  toast.error('Failed to generate download URL. Please try again.');
  console.error(`Could not generate presigned URL for hash: ${weightsHash}`);
  return;
}

// Proceed with download
```

## Summary

| Solution | Complexity | Security | Longevity |
|----------|-----------|----------|-----------|
| Option 1: Regenerate URL | Medium | ✅ High | ✅ Forever |
| Option 2: Store in HCS | High | ✅ High | ⚠️ ~10 hours |
| Option 3: Public Bucket | Low | ❌ None | ✅ Forever |

**Recommended:** Implement **Option 1** for production-ready solution.

---

**Next Steps:**
1. Choose your preferred option
2. Implement the changes
3. Test with a new training task
4. Verify download works successfully
