# ✅ Contract ID Update Complete

## Updated Files

### 1. Backend (P2P)
- ✅ `p2p/.env` - CONTRACT_ID already set to `0.0.7307807`

### 2. Frontend
- ✅ `frontend/.env` - Updated VITE_CONTRACT_ID to `0.0.7307807`
- ✅ `frontend/src/ui/components/training/UploadPhase.tsx` - Changed from hardcoded to environment variable

## What Changed

**Before:**
```typescript
const contractId = '0.0.6913120'; // Hardcoded old contract
```

**After:**
```typescript
const contractId = import.meta.env.VITE_CONTRACT_ID || '0.0.7307807'; // Uses env var with fallback
```

## 🚨 IMPORTANT: Restart Required

Since you updated the `.env` file, you **MUST restart** your frontend development server for the changes to take effect:

```bash
# Stop the current frontend server (Ctrl+C)
cd frontend

# Restart the development server
npm run dev
# or
yarn dev
```

## Verification Steps

After restarting the frontend:

1. **Check the console** - You should see the new contract ID being used
2. **Create a new training task** - It should now use contract `0.0.7307807`
3. **Monitor the logs** - Look for "Submitting weights to blockchain" with the new contract ID

### Quick Test

You can verify the contract ID is loaded correctly:

```bash
cd frontend
npm run dev
# Check browser console - CONTRACT_ID should be 0.0.7307807
```

## Summary

- ✅ Backend already pointed to new contract
- ✅ Frontend now updated to point to new contract
- ⚠️ **You need to restart the frontend dev server**
- ✅ All hardcoded contract IDs removed
- ✅ Using environment variables consistently

## New Contract Features

Contract `0.0.7307807` has the updated `submitWeights()` function that:
- Accepts **1 parameter** (Akave hash) instead of 3 encrypted parts
- Uses **5M gas** instead of 10M (cheaper)
- Stores only **64 characters** instead of 1000+ (no more CONTRACT_REVERT)

---

**Next Step:** Restart your frontend server and test with a new training task!
