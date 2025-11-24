import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect({ network: "testnet" });
  console.log("Connection object keys:", Object.keys(connection));
  console.log("Connection:", connection);
  console.log("hre.ethers exists:", !!hre.ethers);
  console.log("hre keys:", Object.keys(hre));
}

main().catch(console.error);
