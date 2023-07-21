import fs from "fs";
import { ethers } from "ethers";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";
import whitelist from "./whitelist.json";

const leaves = whitelist.map((address: string) =>
  ethers.utils.solidityKeccak256(["address"], [address])
);

const leafLookup = Object.fromEntries(
  whitelist.map((address: string) => [
    address,
    ethers.utils.solidityKeccak256(["address"], [address]),
  ])
);

const merkleTree = new MerkleTree(leaves, keccak256, {
  sortPairs: true,
});

const merkleRoot = merkleTree.getHexRoot();

fs.writeFileSync(
  "whitelist/merkleTreeData.json",
  JSON.stringify({
    merkleRoot,
    leafLookup,
  })
);
