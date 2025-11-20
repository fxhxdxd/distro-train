#!/bin/bash

# Start Bootstrap Node for distro-train Federated Learning Platform
# This script starts the bootstrap node which serves as the P2P network entry point

set -e

echo "================================"
echo "Starting Bootstrap Node"
echo "================================"

# Check if we're in the p2p directory
if [ ! -f "runner.py" ]; then
    echo "Error: runner.py not found. Please run this script from the p2p/ directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Some configuration may be missing."
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
echo "Starting bootstrap node..."
echo "  - P2P Port: 8000"
echo "  - API Port: 9000"
echo "  - Role: bootstrap"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Use expect to automatically input "bootstrap" as the role
expect << 'EOF'
set timeout -1
spawn python3 runner.py

expect "Configure the role of the node*"
send "bootstrap\r"

expect "Enter the OPERATOR_KEY*"
send "\r"

expect "Enter the OPERATOR_ID*"
send "\r"

interact
EOF
