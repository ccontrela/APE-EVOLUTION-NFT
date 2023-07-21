import fs from "fs";
import { ethers } from "ethers";
const csv = fs.readFileSync("whitelist/whitelist.csv");

// const addresses = csv
//   .toString()
//   .split("\r\n")
//   .filter((address) => address.startsWith("0x"))
//   .map((address) => address.trim());

// const errors = csv
//   .toString()
//   .split("\r\n")
//   .filter((address) => !address.startsWith("0x"));

const array = csv.toString().split("\r\n");

let noChecksum = 0;
let addresses: string[] = [];
let errors: string[] = [];

for (var i = 0; i < array.length; i++) {
  const item = array[i].trim(); // Remove whitespace
  
  if (!ethers.utils.isAddress(item)) { // Check for valid address
    errors.push(`notAddress: ${item}`);
    continue;
  }

  const checksumAddress = ethers.utils.getAddress(item);

  if (addresses.includes(checksumAddress)) { // Remove duplicates
    errors.push(`dup: ${item}`); 
    continue;
  } 

  if (checksumAddress !== item) noChecksum++; // Count how many were not checksummed

  addresses.push(checksumAddress);
}

console.log({errors});
console.log({noChecksum});

fs.writeFileSync("whitelist/whitelist.json", JSON.stringify(addresses));
