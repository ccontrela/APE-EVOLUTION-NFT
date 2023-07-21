import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";

dotenv.config();

// Settings //////////////////////////////////////////////////////////////

const settingsNetwork = "localhost";
// const contractOwnerAddress = "0xcCfE4D7C203491a0eF8283E00f8f5D05bf49C41F";
const gasPrice = ethers.utils.parseUnits("1.000000013", "gwei");

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

const network = hre.network.name;

async function main() {
  const [owner, deployer, signer] = await ethers.getSigners();

  console.log("****************************");
  console.log("* Contract Deployment *");
  console.log("****************************");
  console.log("\n");

  console.log("Settings");
  console.log("Network:", network, settingsNetwork == network);
  console.log(
    "Contract Owner Address:",
    owner.address,
    ethers.utils.isAddress(owner.address)
  );
  console.log("\n");

  await keypress();

  console.log("Deployment Wallet");
  const initialBalance = await deployer.getBalance();
  console.log("Address:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(initialBalance), "Ether");
  console.log("\n");

  await keypress();

  console.log("AAA Mock Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const aaaMockContractFactory = await ethers.getContractFactory(
    "StandardERC721"
  );
  const aaaMockContract = await aaaMockContractFactory.deploy({ gasPrice });
  await aaaMockContract.deployed();
  console.log("aaaMockContract Address:", aaaMockContract.address);
  console.log("");

  await keypress();

  console.log("Royalty Receiver Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const rrContractFactory = await ethers.getContractFactory(
    "AngryApeArmyRoyaltyReceiver"
  );
  const rrContract = await rrContractFactory.deploy({ gasPrice });
  await rrContract.deployed();
  console.log("Royalty Receiver Contract Address:", rrContract.address);
  console.log("");

  await keypress();

  console.log("Angry Ape Army Evolution Contract");
  await keypress("Deploy? Press any key to continue and crtl-c to cancel");
  process.stdout.write("Deploying..." + "\r");
  const ContractFactory = await ethers.getContractFactory(
    "AngryApeArmyEvolutionCollection"
  );
  const contract = await ContractFactory.deploy(
    signer.address,
    aaaMockContract.address,
    rrContract.address,
    { gasPrice }
  );
  await contract.deployed();
  console.log("Angry Ape Army Evolution Contract Address:", contract.address);

  const deployedBalance = await deployer.getBalance();
  console.log(
    "Transaction Cost:",
    ethers.utils.formatEther(initialBalance.sub(deployedBalance)),
    "Ether"
  );
  console.log("\n");

  // console.log("Contract verify on etherscan");
  // try {
  //   await hre.run("verify:verify", {
  //     address: Contract.address,
  //   });

  //   console.log("Verification successful");
  // } catch (e) {
  //   console.log("Manual verification required");
  // }
  // console.log("");

  await keypress();

  console.log("Transfer Ownership to: " + owner.address);

  await keypress("Press any key to continue and crtl-c to cancel");
  await contract.transferOwnership(owner.address, { gasPrice });
  await rrContract.transferOwnership(owner.address, { gasPrice });

  const miscBalance = await deployer.getBalance();
  console.log(
    "Transaction Cost:",
    ethers.utils.formatEther(deployedBalance.sub(miscBalance)),
    "Ether"
  );
  console.log("\n");

  console.log("Writing data to disk...");

  const date = new Date().toJSON().slice(0, 10);
  const dir = "deployment";
  const ContractDeploymentDetails = `${dir}/${network}-deployment-${date}.json`;
  const CostDetails = `${dir}/${network}-cost-${date}.json`;

  let CostData = JSON.stringify({
    date,
    network,
    ContractDeploymentCost: ethers.utils.formatEther(
      initialBalance.sub(deployedBalance)
    ),
    otherTransactionsCost: ethers.utils.formatEther(
      deployedBalance.sub(miscBalance)
    ),
    totalCost: ethers.utils.formatEther(initialBalance.sub(miscBalance)),
  });

  let ContractData = JSON.stringify({
    date,
    network,
    contractOwnerAddress: owner.address,
    signerAddress: signer.address,
    aaaMockContractAddress: aaaMockContract.address,
    royaltyReceiverAddress: rrContract.address,
    contractAddress: contract.address,
    deploymentCost: ethers.utils.formatEther(
      initialBalance.sub(deployedBalance)
    ),
  });

  console.log("\n");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFileSync(ContractDeploymentDetails, ContractData);
  console.log(
    `Contract deployment settings saved to ${ContractDeploymentDetails}`
  );
  fs.writeFileSync(CostDetails, CostData);
  console.log(`Contract cost data saved to ${CostDetails}`);
  console.log("\n");

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

// Hardhat Network Accounts
// Account #0: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 (10000 ETH)
// Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

// Account #1: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 (10000 ETH)
// Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

// Account #2: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc (10000 ETH)
// Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

// Account #3: 0x90f79bf6eb2c4f870365e785982e1f101e93b906 (10000 ETH)
// Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6

// Account #4: 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 (10000 ETH)
// Private Key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
