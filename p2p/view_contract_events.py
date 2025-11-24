#!/usr/bin/env python3
"""
Contract Events Viewer
Reads and displays contract events from Hedera Mirror Node.
"""

import os
import sys
import json
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*100}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(100)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*100}{Colors.ENDC}\n")


def print_section(text):
    """Print a section header"""
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.OKBLUE}{'-'*90}{Colors.ENDC}")


def print_success(text):
    """Print success message"""
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")


def print_info(key, value):
    """Print key-value info"""
    print(f"{Colors.OKCYAN}{key}:{Colors.ENDC} {value}")


def print_warning(text):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")


def print_error(text):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")


class EventsViewer:
    def __init__(self, contract_id):
        """Initialize the events viewer"""
        self.contract_id = contract_id
        self.mirror_node_url = "https://testnet.mirrornode.hedera.com"

        # Event signatures (Keccak-256 hash of event signature)
        # You can calculate these using web3.py or ethers.js
        self.event_signatures = {
            # TaskCreated(uint256 indexed taskId, address indexed depositor, string modelUrl, string datasetUrl, uint256 numChunks, uint256 totalReward)
            "TaskCreated": "0x",  # Will be calculated
            # WeightsSubmitted(uint256 indexed taskId, address indexed trainer, string weightsHash, uint256 rewardAmount, uint256 remainingChunks)
            "WeightsSubmitted": "0x",
            # TaskCompleted(uint256 indexed taskId)
            "TaskCompleted": "0x",
            # Withdrawn(address indexed who, uint256 amount)
            "Withdrawn": "0x",
        }

        print_success("Events viewer initialized")
        print_info("Contract ID", self.contract_id)
        print_info("Mirror Node", self.mirror_node_url)

    def convert_contract_id_to_evm(self, contract_id):
        """Convert Hedera contract ID (0.0.X) to EVM address"""
        # Parse the contract ID
        parts = contract_id.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid contract ID format: {contract_id}")

        shard = int(parts[0])
        realm = int(parts[1])
        num = int(parts[2])

        # For Hedera, EVM address is typically just the num part as a hex address
        # Pad to 20 bytes (40 hex chars)
        evm_address = f"0x{num:040x}"
        return evm_address

    def fetch_contract_results(self, limit=100):
        """Fetch contract results from mirror node"""
        try:
            url = f"{self.mirror_node_url}/api/v1/contracts/{self.contract_id}/results"
            params = {"limit": limit, "order": "desc"}

            response = requests.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            return data.get("results", [])

        except Exception as e:
            print_error(f"Failed to fetch contract results: {e}")
            return []

    def fetch_contract_logs(self, limit=100):
        """Fetch contract logs (events) from mirror node"""
        try:
            url = f"{self.mirror_node_url}/api/v1/contracts/{self.contract_id}/results/logs"
            params = {"limit": limit, "order": "desc"}

            response = requests.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            return data.get("logs", [])

        except Exception as e:
            print_error(f"Failed to fetch contract logs: {e}")
            return []

    def decode_hex_string(self, hex_str):
        """Decode a hex string to UTF-8"""
        try:
            if hex_str.startswith("0x"):
                hex_str = hex_str[2:]

            # Remove padding (00 bytes)
            hex_str = hex_str.rstrip("0")
            if len(hex_str) % 2 != 0:
                hex_str += "0"

            bytes_data = bytes.fromhex(hex_str)
            return bytes_data.decode('utf-8', errors='ignore').strip('\x00')
        except Exception:
            return hex_str

    def parse_log_data(self, log):
        """Parse log data to extract event information"""
        try:
            data = log.get("data", "0x")
            topics = log.get("topics", [])

            # Topics[0] is the event signature hash
            event_sig = topics[0] if topics else None

            # Parse based on event type
            # This is a simplified parser - you may need to adjust based on actual event structure
            parsed = {
                "event_signature": event_sig,
                "topics": topics,
                "data": data,
            }

            return parsed

        except Exception as e:
            print_error(f"Failed to parse log data: {e}")
            return None

    def display_contract_logs(self):
        """Display all contract logs"""
        print_header("CONTRACT EVENTS (LOGS)")

        logs = self.fetch_contract_logs(limit=100)

        if not logs:
            print_warning("No logs found for this contract")
            return

        print_success(f"Found {len(logs)} log entries")

        for idx, log in enumerate(logs, 1):
            print_section(f"Event #{idx}")

            # Basic info
            print_info("Timestamp", log.get("timestamp", "N/A"))
            print_info("Block Number", log.get("block_number", "N/A"))
            print_info("Transaction Hash", log.get("transaction_hash", "N/A"))
            print_info("Log Index", log.get("index", "N/A"))

            # Parse topics (indexed parameters)
            topics = log.get("topics", [])
            if topics:
                print_info("Event Signature", topics[0])

                if len(topics) > 1:
                    print(f"\n{Colors.OKCYAN}Indexed Parameters:{Colors.ENDC}")
                    for i, topic in enumerate(topics[1:], 1):
                        # Try to interpret as uint256
                        try:
                            value = int(topic, 16)
                            print(f"  Topic {i}: {topic} (decimal: {value})")
                        except:
                            print(f"  Topic {i}: {topic}")

            # Parse data (non-indexed parameters)
            data = log.get("data", "0x")
            if data and data != "0x":
                print_info("Data (hex)", data[:100] + "..." if len(data) > 100 else data)

                # Try to decode as string
                decoded = self.decode_hex_string(data)
                if decoded and decoded != data:
                    print_info("Data (decoded)", decoded[:200] + "..." if len(decoded) > 200 else decoded)

            print()

    def display_contract_results(self):
        """Display contract execution results"""
        print_header("CONTRACT EXECUTION RESULTS")

        results = self.fetch_contract_results(limit=50)

        if not results:
            print_warning("No execution results found for this contract")
            return

        print_success(f"Found {len(results)} execution results")

        for idx, result in enumerate(results, 1):
            print_section(f"Transaction #{idx}")

            # Basic info
            timestamp = result.get("timestamp", "N/A")
            if timestamp != "N/A":
                # Convert timestamp to readable format
                try:
                    ts_seconds = float(timestamp)
                    dt = datetime.fromtimestamp(ts_seconds)
                    timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    pass

            print_info("Timestamp", timestamp)
            print_info("From", result.get("from", "N/A"))
            print_info("To", result.get("to", "N/A"))
            print_info("Gas Used", result.get("gas_used", "N/A"))
            print_info("Transaction Hash", result.get("hash", "N/A"))

            # Function called
            function_params = result.get("function_parameters", "")
            if function_params:
                print_info("Function Parameters", function_params[:100] + "..." if len(function_params) > 100 else function_params)

            # Result
            call_result = result.get("call_result", "")
            if call_result:
                print_info("Call Result", call_result[:100] + "..." if len(call_result) > 100 else call_result)

            # Error message if any
            error_message = result.get("error_message")
            if error_message:
                print_error(f"Error: {error_message}")

            print()

    def fetch_specific_transaction(self, transaction_id):
        """Fetch a specific transaction by ID"""
        try:
            url = f"{self.mirror_node_url}/api/v1/transactions/{transaction_id}"
            response = requests.get(url)
            response.raise_for_status()

            data = response.json()
            return data.get("transactions", [])

        except Exception as e:
            print_error(f"Failed to fetch transaction: {e}")
            return []

    def export_logs_to_json(self, filename="contract_logs.json"):
        """Export all logs to a JSON file"""
        try:
            logs = self.fetch_contract_logs(limit=1000)
            results = self.fetch_contract_results(limit=1000)

            export_data = {
                "contract_id": self.contract_id,
                "export_time": datetime.now().isoformat(),
                "logs": logs,
                "results": results,
            }

            with open(filename, 'w') as f:
                json.dump(export_data, f, indent=2)

            print_success(f"Exported {len(logs)} logs and {len(results)} results to {filename}")

        except Exception as e:
            print_error(f"Failed to export logs: {e}")


def main():
    """Main entry point"""
    # Load environment variables
    env_path = Path(__file__).parent / ".env"
    load_dotenv(env_path)

    contract_id = os.getenv("CONTRACT_ID")

    if len(sys.argv) > 1:
        if sys.argv[1] in ["-h", "--help"]:
            print("Usage: python view_contract_events.py [options]")
            print("\nOptions:")
            print("  No arguments     - Display all events and logs")
            print("  --logs           - Display only logs/events")
            print("  --results        - Display only execution results")
            print("  --export [file]  - Export to JSON file (default: contract_logs.json)")
            print("  --contract <id>  - Use specific contract ID")
            print("  -h, --help       - Show this help message")
            return

        # Parse arguments
        if "--contract" in sys.argv:
            idx = sys.argv.index("--contract")
            if idx + 1 < len(sys.argv):
                contract_id = sys.argv[idx + 1]

    if not contract_id:
        print_error("CONTRACT_ID not found in .env file")
        return

    viewer = EventsViewer(contract_id)

    if "--export" in sys.argv:
        idx = sys.argv.index("--export")
        filename = sys.argv[idx + 1] if idx + 1 < len(sys.argv) and not sys.argv[idx + 1].startswith("--") else "contract_logs.json"
        viewer.export_logs_to_json(filename)

    elif "--logs" in sys.argv:
        viewer.display_contract_logs()

    elif "--results" in sys.argv:
        viewer.display_contract_results()

    else:
        # Display everything
        viewer.display_contract_results()
        viewer.display_contract_logs()

        print_header("EVENTS VIEWER COMPLETE")
        print_success("All contract events and logs retrieved successfully!")


if __name__ == "__main__":
    main()
