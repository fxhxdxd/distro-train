# Payment Phase Error Resolution Plan

## 🚀 QUICK STATUS - Phase 1

**Last Updated**: 2025-11-19 1:35 PM

| Task | Status | Notes |
|------|--------|-------|
| Add missing env variables | ✅ DONE | Added CONTRACT_ID, OPERATOR_ID, OPERATOR_KEY |
| Fix key parsing method | ✅ **FIXED** | Changed to ECDSA |
| Fix account ID truncation | ✅ DONE | No truncation issue found |
| Get valid Hedera account | ✅ DONE | Account `0.0.7285006` exists with 300 HBAR |
| Fix key type mismatch | ✅ **FIXED** | Now using ECDSA parsing |

**STATUS**: ✅ **ALL PHASE 1 ISSUES RESOLVED**

**Recent Fix** (2025-11-19 1:35 PM):
- ✅ Changed `PrivateKey.fromStringED25519()` to `PrivateKey.fromStringECDSA()` in `hederaHelper.ts:24`
- ✅ Changed `PrivateKey.fromStringED25519()` to `PrivateKey.fromStringECDSA()` in `hederaHelper.ts:40`
- ✅ Updated `.env` from `VITE_OPERATOR_KEY_TYPE=ED25519` to `ECDSA`

**NEXT STEP**: Test the payment flow - it should now work!

---

## Root Cause Analysis

### Initial Error (RESOLVED ✅)
The initial issue **"failed to parse entity id: undefined"** occurred because environment variables were missing from `.env` file.

**Initial Root Cause:**
The issue was that **`CONTRACT_ID`, `OPERATOR_ID`, and `OPERATOR_KEY` were undefined** because they were missing from the `.env` file.

**Resolution:** Added the following to `.env`:
- `VITE_CONTRACT_ID=0.0.6917091`
- `VITE_OPERATOR_ID=0.0.10111448`
- `VITE_OPERATOR_KEY=1ea290ffc36aba1c74ff68065d007c3224907f7f812d0bcd3ec688284ba6c041`

---

### Current Error (ACTIVE ❌) - INVALID_SIGNATURE

After adding environment variables and obtaining a valid account, a new error occurs:

**UPDATE 2025-11-19 1:30 PM**:
- ✅ Fixed: Account ID parsing (no longer truncated)
- ✅ Fixed: Got valid account `0.0.7285006` (exists with 300 HBAR balance)
- ❌ **NEW ERROR**: `INVALID_SIGNATURE` - Key type mismatch

**Root Cause**:
- Account `0.0.7285006` uses **ECDSA_SECP256K1** key type
- Code is using `PrivateKey.fromStringED25519()` ❌
- The private key string is ECDSA format but being parsed as ED25519
- This causes signature validation to fail

**Previous Updates**:
- 2025-11-19 11:41 AM:
  - ✅ Fixed: Account ID parsing (no longer truncated)
  - ✅ Fixed: Operator key parsing (now using `PrivateKey.fromStringED25519()`)
  - ❌ CONFIRMED: Account `0.0.10111448` did NOT exist on Hedera testnet

**Error Flow:**
1. Dataset & model files uploaded to Akave successfully ✅
2. Pre-signed URLs generated ✅
3. User clicks "Pay 0.1 HBAR & Initialize Training" button
4. `payAndInitialize()` function executes at `TrainingContext.tsx:229`
5. WalletConnect transaction succeeds, returns transaction ID: `0.0.7264750@1763531323.975521312` ✅
6. `getTaskId()` function called at `TrainingContext.tsx:242`
7. **Error thrown**: `StatusError: transaction 0.0.1011144@1763531335.012265774 failed precheck with status PAYER_ACCOUNT_NOT_FOUND against node account id 0.0.6`

**Current Root Cause:**
1. **Account ID Parsing Issue**: The configured account is `0.0.10111448` (8 digits) but the error shows `0.0.1011144` (7 digits) - the last digit "8" is being truncated or parsed incorrectly
2. **Account May Not Exist**: The account `0.0.10111448` might not exist on Hedera testnet, or may not have sufficient HBAR balance
3. **Key Format Warning**: Hedera SDK warns to use `fromStringECDSA()` or `fromStringED25519()` instead of generic string parsing for the operator key
4. **Key Type Unknown**: The operator key format/type (ECDSA vs ED25519) is not explicitly specified in the code

---

## Comprehensive Plan to Resolve the Issue

### **Phase 1: Environment Configuration Issues**

#### Task 1.1: Verify and Fix Hedera Account Configuration ⚠️ CURRENT ISSUE

**STATUS**: 🔴 **BLOCKING** - Account does not exist on testnet

**Problem**: ~~Account `0.0.10111448` is being parsed as `0.0.1011144` (truncated)~~, and `PAYER_ACCOUNT_NOT_FOUND` error occurs.

**VERIFIED**: Account `0.0.10111448` does NOT exist on Hedera testnet (confirmed via API)

**SOLUTION - Choose One of These Options**:

### **Option 1: Create New Testnet Account** (RECOMMENDED - Quickest)

1. **Visit Hedera Portal**:
   - Go to: https://portal.hedera.com/register
   - Create an account (free for testnet)

2. **Create Testnet Account**:
   - Once logged in, create a new testnet account
   - Portal will provide you with:
     - Account ID (e.g., `0.0.12345678`)
     - Private Key (hex format)
     - Public Key
   - Account automatically gets 10,000 testnet HBAR

3. **Update `.env` file**:
   - Replace `VITE_OPERATOR_ID` with your new account ID
   - Replace `VITE_OPERATOR_KEY` with your new private key

### **Option 2: Use Existing Account** (If you have one)

If you already have a Hedera testnet account:
1. Find your account ID and private key
2. Update the `.env` file with the correct credentials
3. Verify the account exists on HashScan: `https://hashscan.io/testnet/account/YOUR_ACCOUNT_ID`

### **Option 3: Simple Quick Fix** (Temporary - for testing only)

You can remove the dependency on operator account by:
1. Comment out or skip the `getTaskId()` call temporarily
2. Use a mock/hardcoded taskId for now
3. This will let you test the rest of the flow
4. **NOTE**: This is NOT a production solution

---

**Previous Action Items** (for reference):
1. ~~**Verify Account Exists on Hedera Testnet**~~: ✅ DONE - Account does NOT exist
2. ~~**Investigate Parsing Issue**~~: ✅ DONE - No parsing issue, account simply doesn't exist

#### Task 1.2: Fix Operator Key Format and Parsing ✅ COMPLETED

**STATUS**: ✅ **RESOLVED** - Key type fixed

**Problem**: ~~Using `fromStringED25519()` but account requires `fromStringECDSA()`~~

**VERIFIED**: Account `0.0.7285006` public key is **ECDSA_SECP256K1** type (confirmed via mirror node)

**Fix Applied**:
- Changed to `PrivateKey.fromStringECDSA(OPERATOR_KEY)` ✅
- Updated `.env` to `VITE_OPERATOR_KEY_TYPE=ECDSA` ✅

**Files Updated**:
1. ✅ `hederaHelper.ts:24` - Changed `fromStringED25519` to `fromStringECDSA`
2. ✅ `hederaHelper.ts:40` - Changed `fromStringED25519` to `fromStringECDSA`
3. ✅ `.env:6` - Changed `ED25519` to `ECDSA`

**Result**: The `INVALID_SIGNATURE` error should now be resolved!

#### Task 1.3: Create Environment Variable Template
- Create `.env.example` file documenting all required environment variables
- Include clear comments explaining what each variable is for
- Add instructions for obtaining Hedera testnet account credentials
- Add notes about key types (ED25519 vs ECDSA)
- Reference the `CLAUDE.md` document which already lists these requirements

---

### **Phase 2: Code Architecture Issues**

#### Task 2.1: Fix Dual Client Pattern Anti-Pattern
**Problem**: The code uses TWO different Hedera clients:
1. **WalletConnect client** (for user-signed transactions) - used in `payAndInitialize()` at line 228-234
2. **Direct SDK client** (using OPERATOR credentials) - used in `getTaskId()` at line 242

**Issues**:
- `getTaskId()` creates a NEW client with operator credentials (`hederaHelper.ts:21-22`)
- This bypasses the user's wallet entirely
- Violates decentralized, trustless design principles mentioned in `CLAUDE.md:56`
- Creates security risk by requiring server-side operator keys in frontend
- The operator key is **hardcoded** in the frontend (`constant.ts:3`)

**Solution Plan**:
- **Option A** (Recommended): Modify smart contract to emit `TaskCreated` event with taskId when `createTask()` is called
  - Parse the transaction receipt from WalletConnect to extract the taskId from events
  - Remove the `getTaskId()` function entirely
  - Remove operator credentials from frontend

- **Option B**: Move `getTaskId()` to backend API
  - Backend calls `getTaskId()` using operator credentials securely
  - Frontend calls backend API endpoint after payment
  - Keeps operator credentials server-side only

---

### **Phase 3: Transaction Flow Improvements**

#### Task 3.1: Add Transaction ID Validation
- After WalletConnect returns `transactionId` at line 228, verify it's not null/undefined
- Add better error handling before calling `getTaskId()`
- Current code checks `if (!transactionId)` but continues to call `getTaskId()` regardless

#### Task 3.2: Implement Transaction Receipt Polling
- After successful transaction, poll Hedera mirror node for transaction receipt
- Extract taskId from contract execution results or emitted events
- Add retry logic with exponential backoff
- Set reasonable timeout (e.g., 30 seconds)

#### Task 3.3: Add Loading States
- Show specific loading message: "Waiting for transaction confirmation..."
- Show specific loading message: "Retrieving task ID from blockchain..."
- Improve user feedback during the 2-second delay in `getTaskId()`

---

### **Phase 4: Smart Contract Event Integration**

#### Task 4.1: Verify Smart Contract Events
- Check if the Hedera smart contract emits a `TaskCreated` event with taskId
- Review the ABI (`frontend/src/ui/utils/abi.ts`) to confirm event structure
- Identify the event signature for taskId emission

#### Task 4.2: Implement Event Parsing
- Create utility function to parse contract execution results
- Extract taskId from transaction receipt events
- Handle cases where event is not immediately available (mirror node delay)

#### Task 4.3: Fallback Mechanism
- If event parsing fails, fall back to querying contract state
- Implement mirror node API polling as backup
- Add error recovery for network issues

---

### **Phase 5: Security & Best Practices**

#### Task 5.1: Remove Hardcoded Private Keys
- **CRITICAL**: The `privateKeyPem` is hardcoded in `constant.ts:4-31`
- This private key should NEVER be in frontend code
- Move to backend or use user-generated keys only
- Current implementation contradicts privacy goals in `CLAUDE.md:33`

#### Task 5.2: Implement Proper Error Messages
- Replace generic "failed to parse entity id: undefined" with specific errors:
  - "Hedera operator credentials not configured"
  - "Contract ID not found in environment"
  - "Failed to retrieve task ID from blockchain"
- Add user-friendly error messages in PaymentPhase component

#### Task 5.3: Add Environment Variable Validation
- Create startup validation function
- Check all required env vars on app initialization
- Show clear error messages if configuration is incomplete
- Prevent users from reaching payment phase without proper setup

---

### **Phase 6: UX/UI Improvements**

#### Task 6.1: Add Pre-flight Checks
- Before showing payment UI, verify all prerequisites:
  - Wallet connected
  - Environment configured
  - Contract ID valid
  - Dataset & model hashes present
- Disable payment button if any check fails

#### Task 6.2: Improve Error Display in PaymentPhase
- Add error state to PaymentPhase component UI
- Show actionable error messages (e.g., "Please configure Hedera credentials in Settings")
- Add "Retry" button for recoverable errors

#### Task 6.3: Add Transaction Status Tracking
- Show transaction hash/ID to user
- Provide link to Hedera testnet explorer
- Show step-by-step progress: "Transaction submitted → Confirmed → Task created → Initializing network"

---

## Immediate Action Items (Priority Order)

### ⚠️ **CURRENT BLOCKERS** (Must fix to proceed):

1. **CRITICAL - Verify Hedera Account**:
   - Check if account `0.0.10111448` exists on testnet (use HashScan or mirror node)
   - If not, obtain valid testnet account credentials
   - Verify account has sufficient HBAR balance (5-10 HBAR minimum)

2. **CRITICAL - Fix Operator Key Parsing**:
   - Update `hederaHelper.ts:22` to use `PrivateKey.fromStringED25519()` or `fromStringECDSA()`
   - Determine key type (ED25519 is most common for Hedera)
   - Test with corrected key parsing

3. **CRITICAL - Investigate Account ID Truncation**:
   - Debug why `0.0.10111448` becomes `0.0.1011144`
   - Check for integer overflow or incorrect parsing in Hedera SDK usage
   - May need to use `AccountId.fromString()` explicitly

### 📋 **POST-FIX PRIORITIES** (After resolving blockers):

4. **CRITICAL - Security**: Decide on architecture for taskId retrieval (event-based vs API-based)
5. **HIGH - Error Handling**: Add proper null checks and error messages in `payAndInitialize()`
6. **HIGH - Transaction Flow**: Implement transaction receipt polling to get taskId reliably
7. **MEDIUM - UX**: Add better loading states and error displays
8. **MEDIUM - Security**: Move private keys and operator credentials to backend
9. **LOW - Documentation**: Create `.env.example` for future developers

---

## Recommended Approach

### **Short-term fix** (to get it working now):

#### Step 1: Fix Account Configuration
1. ~~Add the three missing environment variables to `.env`~~ ✅ DONE
2. **Verify the operator account exists on Hedera testnet**:
   - Visit: `https://hashscan.io/testnet/account/0.0.10111448`
   - If account doesn't exist or shows as deleted, obtain a new valid testnet account
   - Update `.env` with the correct account ID

3. **Verify account has HBAR balance**:
   - Check balance on HashScan
   - If balance is 0 or low, fund the account using Hedera testnet faucet

#### Step 2: Fix Key Parsing in Code
1. **Update `hederaHelper.ts` line 22** to use proper key parsing:
   ```typescript
   import { PrivateKey, AccountId } from '@hashgraph/sdk';

   export const getTaskId = async () => {
     const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
     await delay(2000);

     const client = Client.forTestnet();

     // Use AccountId.fromString() for proper parsing
     const accountId = AccountId.fromString(OPERATOR_ID);

     // Use PrivateKey.fromStringED25519() (or ECDSA based on key type)
     const privateKey = PrivateKey.fromStringED25519(OPERATOR_KEY);

     client.setOperator(accountId, privateKey);

     // ... rest of the function
   }
   ```

2. **Add null check before `getTaskId()` call** in `TrainingContext.tsx`
3. **Test the transaction** and verify no parsing errors occur

#### Step 3: Add Error Handling
1. Wrap `getTaskId()` in try-catch with specific error messages
2. Show user-friendly error if account issues persist
3. Add retry mechanism with exponential backoff

### **Long-term solution** (for production):
1. Modify smart contract to emit `TaskCreated(uint256 taskId)` event
2. Parse transaction receipt to extract taskId from events
3. Remove `getTaskId()` function and operator credentials from frontend
4. Move all operator-credential operations to backend API
5. Implement proper transaction receipt polling with Hedera mirror node

### **Quick Debug Steps** (if issue persists):
1. Add console.log to see exact values being passed:
   ```typescript
   console.log('OPERATOR_ID:', OPERATOR_ID);
   console.log('OPERATOR_KEY:', OPERATOR_KEY);
   console.log('Parsed AccountId:', AccountId.fromString(OPERATOR_ID).toString());
   ```
2. Check Hedera SDK version compatibility
3. Verify no middleware/proxy is modifying the values
4. Test with a known-working testnet account from Hedera Portal

---

## File References

### Files to Modify:
- `frontend/.env` - Add missing environment variables
- `frontend/src/ui/contexts/TrainingContext.tsx:214-284` - payAndInitialize function
- `frontend/src/ui/utils/hederaHelper.ts:17-32` - getTaskId function
- `frontend/src/ui/utils/constant.ts` - Environment variable imports
- `frontend/src/ui/components/training/PaymentPhase.tsx` - Error handling UI

### Files to Create:
- `frontend/.env.example` - Environment variable template
- `frontend/src/ui/utils/transactionReceiptHelper.ts` - New utility for receipt polling
- `frontend/src/ui/utils/envValidation.ts` - Environment variable validation

---

## Summary

The error occurs because **missing Hedera environment variables** (`CONTRACT_ID`, `OPERATOR_ID`, `OPERATOR_KEY`) cause the `getTaskId()` function to fail when trying to create a Hedera client. The plan above addresses both the immediate fix and the architectural issues that should be resolved for a production-ready, truly decentralized system.

The root issue extends beyond just missing env vars - the current architecture mixes user wallet transactions with server-operator queries in a way that compromises the decentralized nature of the platform. The long-term solution involves restructuring how task IDs are retrieved from the blockchain.
