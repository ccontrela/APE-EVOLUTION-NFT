import * as dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";

dotenv.config();

const network = hre.network.name;

// Settings //////////////////////////////////////////////////////////////

const settingsNetwork = "mainnet";
const contractOwnerAddress = "0x6ab71C2025442B694C8585aCe2fc06D877469D30";
const contractSignerAddress = "0x4EfB67498393531bD60Dcc5b0c7056B59CfA3Ec4";
const OGAAAContractAddress = "0x77640cf3f89a4f1b5ca3a1e5c87f3f5b12ebf87e";
const merkleRoot =
  "0x4787651d1ac503fddfb79c692de716a9ab5ed79c54a3d9178797bb6b781d084e";
const royaltyReceiver = "0x27C95b555170a43e43EE4230A77740cE87aA2c83";
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
  const [deployer] = await ethers.getSigners();
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
    signerAddress: contractSignerAddress,
  });

  await keypress();

  console.log("Deployment Wallet");
  const initialBalance = await deployer.getBalance();
  console.log("Address:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(initialBalance), "Ether");
  console.log("\n");

  writeContractData({ deployerAddress: deployer.address });

  await keypress();

  console.log("Royalty Receiver Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const rrContractFactory = await ethers.getContractFactory(
    "AngryApeArmyRoyaltyReceiver"
  );
  const rrContract = await rrContractFactory.deploy({ maxPriorityFeePerGas });
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

  console.log("Angry Ape Army Evolution Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const ContractFactory = await ethers.getContractFactory(
    "AngryApeArmyEvolutionCollection"
  );
  const contract = await ContractFactory.deploy(
    contractSignerAddress,
    OGAAAContractAddress,
    rrContract.address,
    { maxPriorityFeePerGas }
  );
  await contract.deployed();
  console.log("Angry Ape Army Evolution Contract Address:", contract.address);

  writeContractData({ contractAddress: contract.address });

  const deployedBalance = await deployer.getBalance();
  console.log(
    "Transaction Cost:",
    ethers.utils.formatEther(initialBalance.sub(deployedBalance)),
    "Ether"
  );
  console.log("\n");

  console.log("Contract verify on etherscan");
  try {
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: [
        contractSignerAddress,
        OGAAAContractAddress,
        rrContract.address,
      ],
    });

    console.log("Verification successful");
  } catch (e) {
    console.log("Manual verification required");
  }
  console.log("");

  await keypress();

  console.log("Set Merkle Root");

  await keypress("Press any key to continue and crtl-c to cancel");
  await contract.setMerkleRoot(merkleRoot, { maxPriorityFeePerGas });

  await keypress();

  console.log("Transfer Ownership to: " + contractOwnerAddress);

  await keypress("Press any key to continue and crtl-c to cancel");
  await rrContract.transferOwnership(contractOwnerAddress, {
    maxPriorityFeePerGas,
  });
  await contract.transferOwnership(contractOwnerAddress, {
    maxPriorityFeePerGas,
  });

  const miscBalance = await deployer.getBalance();
  console.log(
    "Transaction Cost:",
    ethers.utils.formatEther(deployedBalance.sub(miscBalance)),
    "Ether"
  );
  console.log("\n");

  writeContractData({
    deploymentCost: ethers.utils.formatEther(
      initialBalance.sub(deployedBalance)
    ),
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
