import * as dotenv from "dotenv";

import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  AngryApeArmyEvolutionCollection,
  AngryApeArmyEvolutionCollection__factory,
  AngryApeArmyRoyaltyReceiver,
  AngryApeArmyRoyaltyReceiver__factory,
  StandardERC721,
  StandardERC721__factory,
} from "../typechain";

dotenv.config();

let contract: AngryApeArmyEvolutionCollection;
let contractFactory: AngryApeArmyEvolutionCollection__factory;
let aaaContract: StandardERC721;
let aaaContractFactory: StandardERC721__factory;
let royaltyReceiverContract: AngryApeArmyRoyaltyReceiver;
let royaltyReceiverContractFactory: AngryApeArmyRoyaltyReceiver__factory;
let owner: SignerWithAddress;
let signer: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;

describe("Burn Functionality", function () {
  before(async () => {
    [owner, signer, user1, user2] =
      await ethers.getSigners();

    // Set up contract
    contractFactory = await ethers.getContractFactory(
      "AngryApeArmyEvolutionCollection",
      owner
    );

    aaaContractFactory = await ethers.getContractFactory(
      "StandardERC721",
      owner
    );

    royaltyReceiverContractFactory = await ethers.getContractFactory(
      "AngryApeArmyRoyaltyReceiver",
      owner
    );

    aaaContract = await aaaContractFactory.deploy();
    await aaaContract.deployed();

    await aaaContract.safeMintTo(user1.address, 100);
    await aaaContract.safeMintTo(user2.address, 100);

    royaltyReceiverContract = await royaltyReceiverContractFactory.deploy();
    await royaltyReceiverContract.deployed();
  });

  this.beforeEach(async () => {
    contract = await contractFactory.deploy(
      signer.address,
      aaaContract.address,
      royaltyReceiverContract.address
    );
    await contract.deployed();
  });

  describe("When burning", async () => {
    it("should mint from owner to user1", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      const totalReserved = await contract.reserved();
      await expect(contract.reservedMint(user1.address, quantity)).to.emit(
        contract,
        "Transfer"
      );

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(
        quantity
      );

      for (var i = 0; i < quantity; i++) {
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }

      expect(await contract.reserved()).to.be.eq(totalReserved - quantity);

      await expect(
        contract.connect(user1).burn(Math.floor(quantity / 2))
      ).to.emit(contract, "Transfer");

      await expect(
        contract.ownerOf(Math.floor(quantity / 2))
      ).to.be.revertedWith(
        "ERC721ABurnable: owner query for nonexistent token"
      );

      for (var i = 0; i < quantity; i++) {
        if (i == Math.floor(quantity / 2)) continue;
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }
    });

    it("should fail to burn by non token holder", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      const totalReserved = await contract.reserved();
      await expect(contract.reservedMint(user1.address, quantity)).to.emit(
        contract,
        "Transfer"
      );

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(
        quantity
      );

      for (var i = 0; i < quantity; i++) {
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }

      expect(await contract.reserved()).to.be.eq(totalReserved - quantity);

      await expect(
        contract.connect(owner).burn(Math.floor(quantity / 2))
      ).to.be.revertedWith(
        "ERC721ABurnable: transfer caller is not owner nor approved"
      );

      expect(await contract.balanceOf(user1.address)).to.be.eq(quantity);
    });

    it("emits a burn event", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      await expect(contract.reservedMint(user1.address, quantity)).to.emit(
        contract,
        "Transfer"
      );
      await expect(
        contract.connect(user1).burn(Math.floor(quantity / 2))
      ).to.emit(contract, "Transfer");
    });

    it("adjusts the balance of the owner", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      await contract.reservedMint(user1.address, quantity);
      await contract.connect(user1).burn(Math.floor(quantity / 2));

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(
        quantity - 1
      );

      await expect(
        contract.ownerOf(Math.floor(quantity / 2))
      ).to.be.revertedWith(
        "ERC721ABurnable: owner query for nonexistent token"
      );
    });

    it("reduces the total supply", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      await contract.reservedMint(user1.address, quantity);
      await contract.connect(user1).burn(Math.floor(quantity / 2));

      expect((await contract.totalSupply()).toNumber()).to.be.eq(
        quantity - 1
      );
    });
  });
});
