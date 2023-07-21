import * as dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";
import { LedgerSigner } from "@anders-t/ethers-ledger";

dotenv.config();

const network = hre.network.name;

// Settings //////////////////////////////////////////////////////////////

const settingsNetwork = "mainnet";
const contractOwnerAddress = "0x6ab71C2025442B694C8585aCe2fc06D877469D30";

const maxPriorityFeePerGas = ethers.utils.parseUnits("1", "gwei");

const date = new Date().toJSON().slice(0, 10);
const dir = "deployment";
const contractDeploymentDetails = `${dir}/${network}-deployment-${date}.json`;

//////////////////////////////////////////////////////////////////////////
const keypress = async (text: string = "Press any key to continue...") => {
  process.stdout.write(text);
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once("data", (data) => {
      const byteArray = [...data];
      if (byteArray.length > 0 && byteArray[0] === 3) {
        console.log("\n^C");
        process.exit(1);
      }
      process.stdin.setRawMode(false);
      process.stdout.write("\r" + " ".repeat(text.length) + "\r");
      resolve(() => {});
    })
  );
};

async function main() {
  // const [fake] = await ethers.getSigners();
  const deployer = new LedgerSigner(hre.ethers.provider);
  // const tx = await fake.sendTransaction({
  //   to: await deployer.getAddress(),
  //   value: ethers.utils.parseEther("100"),
  // });
  // await tx.wait();

  console.log("***************************");
  console.log("*   Contract Deployment   *");
  console.log("***************************");
  console.log("\n");

  console.log("Settings");
  console.log("Network:", network, settingsNetwork == network);
  console.log(
    "Contract Owner Address:",
    contractOwnerAddress,
    ethers.utils.isAddress(contractOwnerAddress)
  );
  console.log("\n");

  writeContractData({
    date,
    network,
    contractOwnerAddress: contractOwnerAddress,
  });

  await keypress();

  console.log("Deployment Wallet");
  const initialBalance = await deployer.getBalance();
  console.log("Address:", await deployer.getAddress());
  console.log("ChainId:", await deployer.getChainId());
  console.log("Balance:", ethers.utils.formatEther(initialBalance), "Ether");
  console.log("\n");

  writeContractData({ deployerAddress: await deployer.getAddress() });

  await keypress();

  console.log("Royalty Receiver Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const rrContractFactory = await ethers.getContractFactory(
    "AngryApeArmyRoyaltyReceiver"
  );
  const rrContract = await rrContractFactory
    .connect(deployer)
    .deploy({ maxPriorityFeePerGas });
  await rrContract.deployed();
  console.log("Royalty Receiver Contract Address:", rrContract.address);
  console.log("");

  writeContractData({ royaltyReceiverAddress: rrContract.address });

  await keypress();

  console.log("Contract verify on etherscan");
  try {
    await hre.run("verify:verify", {
      address: rrContract.address,
    });

    console.log("Verification successful");
  } catch (e) {
    console.log("Manual verification required");
  }
  console.log("");

  await keypress();

  console.log("Royalty Receiver Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const tContractFactory = await ethers.getContractFactory(
    "AngryApeArmyTreasury"
  );
  const tContract = await tContractFactory
    .connect(deployer)
    .deploy({ maxPriorityFeePerGas });
  await tContract.deployed();
  console.log("Treasury Contract Address:", tContract.address);
  console.log("");

  writeContractData({ treasuryAddress: tContract.address });

  await keypress();

  console.log("Contract verify on etherscan");
  try {
    await hre.run("verify:verify", {
      address: tContract.address,
    });

    console.log("Verification successful");
  } catch (e) {
    console.log("Manual verification required");
  }
  console.log("");

  await keypress();

  console.log("Transfer Ownership to: " + contractOwnerAddress);

  await keypress("Press any key to continue and crtl-c to cancel");
  await rrContract.connect(deployer).transferOwnership(contractOwnerAddress, {
    maxPriorityFeePerGas,
  });
  await tContract.connect(deployer).transferOwnership(contractOwnerAddress, {
    maxPriorityFeePerGas,
  });

  const miscBalance = await deployer.getBalance();
  console.log(
    "Transaction Cost:",
    ethers.utils.formatEther(initialBalance.sub(miscBalance)),
    "Ether"
  );
  console.log("\n");

  writeContractData({
    deploymentCost: ethers.utils.formatEther(initialBalance.sub(miscBalance)),
  });

  console.log("Completed Successfully");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function writeContractData(value: any) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  let fileContent = Buffer.from("{}");
  try {
    fileContent = fs.readFileSync(contractDeploymentDetails);
  } catch {}

  let deploymentDetails = JSON.parse(fileContent.toString());
  deploymentDetails = { ...deploymentDetails, ...value };
  fs.writeFileSync(
    contractDeploymentDetails,
    JSON.stringify(deploymentDetails)
  );
  console.log("Contract deployment updated");
}
