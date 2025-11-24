import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const config: HardhatUserConfig = {
  plugins: [],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28"
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  },
  networks: {
    testnet: {
      type: "http",
      url: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : []
    }
  }
};

export default config;
