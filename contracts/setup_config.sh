#!/bin/bash

# Hedera Contract Deployment Configuration Setup
# This script helps you configure Hardhat for Hedera deployment

echo "=========================================="
echo "Hedera Contract Deployment Setup"
echo "=========================================="
echo ""

# Set RPC URL
echo "Setting Hedera RPC URL..."
npx hardhat config set HEDERA_RPC_URL https://testnet.hashio.io/api

if [ $? -eq 0 ]; then
    echo "✅ RPC URL configured"
else
    echo "❌ Failed to set RPC URL"
    exit 1
fi

echo ""
echo "=========================================="
echo "Now you need to set your ECDSA private key"
echo "=========================================="
echo ""
echo "Your current key in p2p/.env is ED25519 format."
echo "For EVM deployment, you need an ECDSA key."
echo ""
echo "Choose an option:"
echo ""
echo "1. Generate a NEW ECDSA key (safest, but needs funding)"
echo "   - Run: python3 get_ecdsa_key.py"
echo "   - Fund the new account at: https://portal.hedera.com/faucet"
echo "   - Then run: npx hardhat config set HEDERA_PRIVATE_KEY"
echo ""
echo "2. Use your existing account (if it has ECDSA support)"
echo "   - Check on Hedera Portal if your account has ECDSA key"
echo "   - If yes, export the ECDSA private key"
echo "   - Then run: npx hardhat config set HEDERA_PRIVATE_KEY"
echo ""
echo "3. Use the same key for testing (may not work)"
echo "   - Run: npx hardhat config set HEDERA_PRIVATE_KEY"
echo "   - Paste: 3030020100300706052b8104000a04220420d28b439549177a178ea0251e9070497c077ac9a2926caa77d0a71859a3879150"
echo ""
echo "=========================================="
echo "After setting the key, run:"
echo "  npx hardhat run scripts/deploy.ts --network testnet"
echo "=========================================="
