#!/bin/bash

# Start CLIENT Node for distro-train Federated Learning Platform
# This script starts the client node which connects the frontend to the P2P network

set -e

echo "================================"
echo "Starting CLIENT Node"
echo "================================"

# Check if we're in the p2p directory
if [ ! -f "runner.py" ]; then
    echo "Error: runner.py not found. Please run this script from the p2p/ directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please create .env with BOOTSTRAP_ADDR and Hedera credentials."
    exit 1
fi

# Check if bootstrap node is running
echo "Checking if bootstrap node is running..."
if ! curl -s http://0.0.0.0:9000/status > /dev/null 2>&1; then
    echo "Warning: Bootstrap node (port 9000) is not responding."
    echo "Please start the bootstrap node first using: ./start_bootstrap.sh"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Bootstrap node is running"
fi

# Activate virtual environment if it exists
if [ -d "../.venv" ]; then
    echo "Activating virtual environment..."
    source ../.venv/bin/activate
elif [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
else
    echo "Warning: Virtual environment not found. Using system Python."
fi

# Check Python and dependencies
echo "Checking Python installation..."
python3 --version

echo ""
echo "Starting CLIENT node..."
echo "  - P2P Port: Dynamic (auto-assigned)"
echo "  - API Port: 9001"
echo "  - Role: client"
echo "  - Connects to: Bootstrap node"
echo ""
echo "This node will accept training commands from the frontend."
echo "Press Ctrl+C to stop"
echo ""

# Use expect to automatically input "client" as the role
expect << 'EOF'
set timeout -1
spawn python3 runner.py

expect "Configure the role of the node*"
send "client\r"

expect "Enter the OPERATOR_KEY*"
send "\r"

expect "Enter the OPERATOR_ID*"
send "\r"

interact
EOF
