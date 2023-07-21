import * as dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";

dotenv.config();

// Settings //////////////////////////////////////////////////////////////

const settingsNetwork = "rinkeby";
const contractOwnerAddress = "0xcCfE4D7C203491a0eF8283E00f8f5D05bf49C41F";
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
  console.log("****************************");
  console.log("* Contract Deployment *");
  console.log("****************************");
  console.log("\n");

  console.log("Settings");
  console.log("Network:", network, settingsNetwork == network);
  console.log(
    "Contract Owner Address:",
    contractOwnerAddress,
    ethers.utils.isAddress(contractOwnerAddress)
  );
  console.log("\n");

  await keypress();

  console.log("Deployment Wallet");
  const [deployer] = await ethers.getSigners();
  const initialBalance = await deployer.getBalance();
  console.log("Address:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(initialBalance), "Ether");
  console.log("\n");

  await keypress();

  console.log("AAA Mock Contract");
  process.stdout.write("Deploying..." + "\r");
  const aaaMockContractFactory = await ethers.getContractFactory(
    "StandardERC721"
  );
  const aaaMockContract = await aaaMockContractFactory.deploy({ gasPrice });
  await aaaMockContract.deployed();
  console.log("aaaMockContract Address:", aaaMockContract.address);
  console.log("");

  await keypress();

  console.log("Contract");
  process.stdout.write("Deploying..." + "\r");
  const contractFactory = await ethers.getContractFactory("HAZDEMBZ2");
  const contract = await contractFactory.deploy(
    "0x4efb67498393531bd60dcc5b0c7056b59cfa3ec4",
    aaaMockContract.address,
    { gasPrice }
  );
  await contract.deployed();
  console.log("Contract Address:", contract.address);
  console.log("");

  // console.log("Contract verify on etherscan");
  // try {
  //   await hre.run("verify:verify", {
  //     address: contract.address,
  //   });

  //   console.log("Verification successful");
  // } catch (e) {
  //   console.log("Manual verification required");
  // }
  // console.log("");

  const deployedBalance = await deployer.getBalance();
  console.log(
    "Transaction Cost:",
    ethers.utils.formatEther(initialBalance.sub(deployedBalance)),
    "Ether"
  );
  console.log("\n");

  await keypress();

  console.log("Transfer Ownership to: " + contractOwnerAddress);

  await keypress();

  await contract.transferOwnership(contractOwnerAddress, { gasPrice });

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
    contractOwnerAddress,
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
