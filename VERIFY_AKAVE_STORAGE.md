# Verifying Akave O3 Storage

## Understanding Your Data Flow

### 1. **dataset_url**
- This is a **presigned URL** pointing to a **manifest file**
- The manifest file contains **comma-separated URLs** of dataset chunks
- Each chunk URL is also a presigned URL pointing to actual CSV data
- Format: `https://o3-rc2.akave.xyz/akave-bucket/{hash}?X-Amz-...`

### 2. **model_hash**
- This is the **SHA256 hash** of your model file (Python script)
- Used as the **S3 object key** in Akave O3
- The actual model file is stored with this hash as its name
- You can retrieve it using a presigned URL

## Quick Start - Verify Your Data

### Setup
Make the verification script executable:
```bash
chmod +x akave/verify_bucket.py
```

### 1. List All Objects in Your Bucket
```bash
python akave/verify_bucket.py list
```
This shows all files stored in your Akave O3 bucket with their keys (hashes).

### 2. Check a Specific Object by Hash
If you have a hash (like `model_hash` from your training):
```bash
python akave/verify_bucket.py metadata <your_hash_here>
```

Example:
```bash
python akave/verify_bucket.py metadata f402e7f71a64441ec8c4ff2567d1dae9451b98c8bf34f625aa11f8e018ecc3f7
```

### 3. Download and Preview an Object
```bash
python akave/verify_bucket.py preview <your_hash_here>
```

This downloads the object and shows the first 20 lines.

### 4. Verify a Presigned URL (dataset_url or model weights URL)
```bash
python akave/verify_bucket.py verify-url "https://o3-rc2.akave.xyz/akave-bucket/..."
```

Example:
```bash
python akave/verify_bucket.py verify-url "https://o3-rc2.akave.xyz/akave-bucket/abc123...?X-Amz-Algorithm=..."
```

### 5. Verify a Dataset Manifest
If you have a `dataset_url` (manifest containing chunk URLs):
```bash
python akave/verify_bucket.py verify-manifest "https://o3-rc2.akave.xyz/..."
```

This will:
- Fetch the manifest file
- Show all chunk URLs
- Test the first chunk for accessibility

### 6. Find Object by Local File Hash
If you have a local file and want to find it in the bucket:
```bash
python akave/verify_bucket.py hash ./path/to/file.csv
```

Example:
```bash
python akave/verify_bucket.py hash ./dataset.csv
python akave/verify_bucket.py hash ./model.py
```

## Understanding the Storage Structure

### Dataset Upload Flow
```
Local dataset.csv
    ↓ (chunked)
Chunk 1, Chunk 2, Chunk 3...
    ↓ (uploaded to Akave O3)
Bucket: akave-bucket
    ├── {hash1} → chunk1.csv content
    ├── {hash2} → chunk2.csv content
    └── {hash3} → chunk3.csv content
    ↓ (manifest created)
Manifest file: "{url1},{url2},{url3}"
    ↓ (uploaded to Akave O3)
    {manifest_hash} → manifest content
    ↓ (presigned URL generated)
dataset_url → "https://o3-rc2.akave.xyz/akave-bucket/{manifest_hash}?..."
```

### Model Upload Flow
```
Local model.py
    ↓ (SHA256 hash calculated)
model_hash = "f402e7f..."
    ↓ (uploaded to Akave O3)
Bucket: akave-bucket/{model_hash} → model.py content
    ↓ (presigned URL generated)
model_url → "https://o3-rc2.akave.xyz/akave-bucket/{model_hash}?..."
```

### Trained Weights Flow
```
Training completes
    ↓
weights = {...} (model parameters)
    ↓ (converted to string)
weights_string = str(weights)
    ↓ (uploaded to Akave O3)
Bucket: akave-bucket/{weights_hash} → weights content
    ↓ (presigned URL generated)
weights_url → "https://..."
    ↓ (encrypted in 3 parts)
cipher1, cipher2, cipher3
    ↓ (published to blockchain)
Smart Contract stores encrypted URLs
```

## Using AWS CLI Directly

If you prefer using AWS CLI commands directly:

### List all objects:
```bash
aws s3 ls s3://akave-bucket \
  --endpoint-url https://o3-rc2.akave.xyz \
  --profile akave-o3
```

### Download an object:
```bash
aws s3 cp s3://akave-bucket/{object_key} ./{output_file} \
  --endpoint-url https://o3-rc2.akave.xyz \
  --profile akave-o3
```

### Get object info:
```bash
aws s3api head-object \
  --bucket akave-bucket \
  --key {object_key} \
  --endpoint-url https://o3-rc2.akave.xyz \
  --profile akave-o3
```

### Generate presigned URL:
```bash
aws s3 presign s3://akave-bucket/{object_key} \
  --expires-in 36000000 \
  --endpoint-url https://o3-rc2.akave.xyz \
  --profile akave-o3
```

## Programmatic Verification (Python)

You can also verify data programmatically:

```python
from akave.mcache import Akave
import requests

akave = Akave()

# 1. Upload a file and get its hash
file_hash = akave.upload_file("./my_dataset.csv")
print(f"File uploaded with hash: {file_hash}")

# 2. Get presigned URL for the file
url = akave.get_presigned_url(file_hash)
print(f"Presigned URL: {url}")

# 3. Verify the URL works
response = requests.get(url)
if response.status_code == 200:
    print("✅ File is accessible!")
    print(f"Content preview: {response.text[:100]}...")
else:
    print(f"❌ Failed: {response.status_code}")

# 4. Calculate hash of any local file
local_hash = akave.sha256_of_file("./some_file.csv")
print(f"Local file hash: {local_hash}")
```

## Common Scenarios

### Scenario 1: "I want to see what's in my dataset_url"
```bash
# Copy the dataset_url from your training logs
python akave/verify_bucket.py verify-manifest "YOUR_DATASET_URL_HERE"
```

### Scenario 2: "I uploaded a model, where did it go?"
```bash
# Find the model by its local file
python akave/verify_bucket.py hash ./model.py

# Or list all objects and look for the hash
python akave/verify_bucket.py list
```

### Scenario 3: "I want to see the trained weights"
```bash
# Get the weights URL from blockchain or logs, then:
python akave/verify_bucket.py verify-url "WEIGHTS_URL_HERE"
```

### Scenario 4: "Show me everything in my bucket"
```bash
# List all objects
python akave/verify_bucket.py list

# Preview a specific object
python akave/verify_bucket.py preview {hash_from_list}
```

## Troubleshooting

### "Permission Denied" or "Access Denied"
- Check your `.env` file has correct AWS credentials
- Run: `python -c "from akave.mcache import Akave; Akave.configure_aws()"`

### "Object Not Found"
- The object might not be uploaded yet
- Verify the hash is correct
- List all objects to see what's actually there

### "Presigned URL Expired"
- Presigned URLs have an expiry (default: 36000000 seconds)
- Regenerate the URL using the object hash

### "Cannot Read Content"
- Some objects might be binary (pickled weights)
- Try downloading instead of previewing
- Use Python to deserialize if needed

## Integration with Your Workflow

### During Upload Phase:
```python
# In your code, after uploading:
from akave.mcache import Akave
akave = Akave()
file_hash = akave.upload_file("dataset.csv")

# Immediately verify:
print(f"Verify with: python akave/verify_bucket.py preview {file_hash}")
```

### During Training:
```python
# After getting dataset_url and model_hash:
print(f"Dataset manifest: {dataset_url}")
print(f"Model hash: {model_hash}")
print(f"Verify manifest: python akave/verify_bucket.py verify-manifest '{dataset_url}'")
print(f"Verify model: python akave/verify_bucket.py preview {model_hash}")
```

### After Training:
```python
# After weights are uploaded:
print(f"Weights URL: {weights_url}")
print(f"Verify weights: python akave/verify_bucket.py verify-url '{weights_url}'")
```

## Security Note

⚠️  **Presigned URLs contain authentication tokens in query parameters**

- Do not share presigned URLs publicly
- They grant temporary access without credentials
- They will expire after the configured time
- Regenerate URLs if they're compromised
