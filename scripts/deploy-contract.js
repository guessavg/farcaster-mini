// Deploy script for Hardhat
// To use: npx hardhat run scripts/deploy-contract.ts --network <networkName>

import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Guess23Game contract...");

  // Get the ContractFactory for our contract
  const Guess23Game = await ethers.getContractFactory("Guess23Game");

  // Deploy the contract
  const guess23Game = await Guess23Game.deploy();

  // Wait for deployment to finish
  await guess23Game.deployed();

  console.log("Guess23Game deployed to:", guess23Game.address);
  
  // Wait for 5 confirmations for etherscan verification
  console.log("Waiting for 5 confirmations...");
  await guess23Game.deployTransaction.wait(5);
  
  // Verify the contract on etherscan
  console.log("Verifying contract on etherscan...");
  try {
    await hre.run("verify:verify", {
      address: guess23Game.address,
      constructorArguments: [],
    });
    console.log("Contract verified on etherscan");
  } catch (error) {
    console.log("Error verifying contract:", error);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
