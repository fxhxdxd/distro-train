import hre from "hardhat";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";

async function main() {
  console.log("Starting deployment to Hedera testnet...\n");

  // Connect to the testnet network
  const connection = await hre.network.connect({ network: "testnet" });

  // Import ethers from the ethers package loaded by the toolbox
  const { ethers } = await import("ethers");

  // Create a provider from the network configuration
  const provider = new ethers.JsonRpcProvider(
    process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api"
  );

  // Create a wallet from the private key
  const wallet = new ethers.Wallet(
    process.env.HEDERA_PRIVATE_KEY!,
    provider
  );

  console.log("Deploying contract with the account:", wallet.address);

  // Get deployer balance
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "HBAR\n");
  } catch (error) {
    console.log("Could not fetch balance (continuing anyway)\n");
  }

  // Read the contract ABI and bytecode
  const contractPath = "../artifacts/contracts/fed-learn.sol/FederatedTrainingReward.json";
  const contractJson = await import(contractPath, { with: { type: "json" } });
  const contractABI = contractJson.default.abi;
  const contractBytecode = contractJson.default.bytecode;

  // Create contract factory
  console.log("Creating contract factory...");
  const FederatedTrainingReward = new ethers.ContractFactory(
    contractABI,
    contractBytecode,
    wallet
  );

  console.log("Deploying FederatedTrainingReward contract...");
  const contract = await FederatedTrainingReward.deploy();

  console.log("Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment successful!");
  console.log("=".repeat(60));
  console.log("Contract deployed at (EVM format):", contractAddress);
  console.log("Deployer address:", wallet.address);
  console.log("=".repeat(60));

  console.log("\n📝 Next Steps:");
  console.log("1. Convert the EVM address to Hedera format:");
  console.log(`   python convert_address.py ${contractAddress}`);
  console.log("\n2. Update your p2p/.env file with the Hedera Contract ID");
  console.log("\n3. Whitelist your operator account:");
  console.log("   cd ../p2p");
  console.log("   python whitelist_manager.py add 0.0.7285006");

  console.log("\n✅ You are now the contract owner!");

  // Close connection
  await connection.close();
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
