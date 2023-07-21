import * as dotenv from "dotenv";

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AngryApeArmyRoyaltyReceiver,
  AngryApeArmyRoyaltyReceiver__factory,
  StandardERC20,
  StandardERC20__factory,
} from "../typechain";

import { MockContract, smock } from "@defi-wonderland/smock";

dotenv.config();

let contract: AngryApeArmyRoyaltyReceiver;
let contractFactory: AngryApeArmyRoyaltyReceiver__factory;
let standardERC20: MockContract<StandardERC20>;
let owner: SignerWithAddress;
let signer: SignerWithAddress;
let approved: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;
let user4: SignerWithAddress;

describe("AngryApeArmyRoyaltyReceiver", function () {
  before(async () => {
    [owner, signer, approved, user1, user2, user3, user4] =
      await ethers.getSigners();

    // Set up contract
    contractFactory = await ethers.getContractFactory(
      "AngryApeArmyRoyaltyReceiver",
      owner
    );

    const StandardERC20Factory = await smock.mock<StandardERC20__factory>(
      "StandardERC20"
    );
    standardERC20 = await StandardERC20Factory.deploy();
    standardERC20.connect(approved).mint(ethers.utils.parseEther("100"));
  });

  beforeEach(async () => {
    contract = await contractFactory.deploy();
    await contract.deployed();
  });

  describe("When receiving ether", async () => {
    it("should allow contract to receive ether", async () => {
      const value = ethers.utils.parseEther("1");

      await expect(
        owner.sendTransaction({
          to: contract.address,
          value,
        })
      ).to.not.be.reverted;
    });
  });

  describe("When setting withdrawal addresses", async () => {
    it("should return the correct default withdrawal address when no withdrawal address has been set for AAA", async () => {
      expect(await contract.angryApeArmy()).to.eql(
        "0x6ab71C2025442B694C8585aCe2fc06D877469D30"
      );
    });

    it("should return the correct default withdrawal address when no withdrawal address has been set for netvrk", async () => {
      expect(await contract.netvrk()).to.eql(
        "0x901FC05c4a4bC027a8979089D716b6793052Cc16"
      );
    });

    it("should set the withdrawal address for AAA", async () => {
      await expect(contract.setAngryApeArmyAddress(user1.address)).to.not.be
        .reverted;
    });

    it("should set the withdrawal address for netvrk", async () => {
      await expect(contract.setNetvrkAddress(user2.address)).to.not.be.reverted;
    });

    it("should fail to set the AAA withdrawal address because user is not owner", async () => {
      await expect(
        contract.connect(user1).setAngryApeArmyAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail to set the netvrk withdrawal address because user is not owner", async () => {
      await expect(
        contract.connect(user1).setNetvrkAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("When withdrawing Ether Funds", async () => {
    it("should fail to withdraw when balance is zero", async () => {
      await expect(contract.withdrawEth()).to.be.revertedWith("ZeroBalance");
    });

    it("should only allow the owner to withdrawEth()", async () => {
      //user1 should be reverted when calling withdrawEth()
      await expect(contract.connect(user1).withdrawEth()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should withdraw contract balance to the default withdrawal addresses.", async () => {
      const value = ethers.utils.parseEther("3.14159265358979323");

      await expect(
        owner.sendTransaction({
          to: contract.address,
          value,
        })
      ).to.not.be.reverted;

      await expect(contract.withdrawEth()).to.be.not.be.reverted;
    });

    it("should withdraw contract balance to the correct withdrawal addresses.", async () => {
      const aaaInitialBalance = await user1.getBalance();
      const netvrkInitialBalance = await user2.getBalance();

      const value = ethers.utils.parseEther("3.14159265358979323");

      await expect(
        owner.sendTransaction({
          to: contract.address,
          value,
        })
      ).to.not.be.reverted;

      await expect(contract.setAngryApeArmyAddress(user1.address)).to.not.be
        .reverted;

      await expect(contract.setNetvrkAddress(user2.address)).to.not.be.reverted;

      await expect(contract.withdrawEth()).to.be.not.be.reverted;

      expect(await user1.getBalance()).to.equal(
        aaaInitialBalance.add(value.mul(7000).div(10000)) // 70.00%
      );
      expect(await user2.getBalance()).to.equal(
        netvrkInitialBalance.add(value.mul(3000).div(10000)) // 30.00%
      );
    });
  });

  describe("When withdrawing ERC20 Funds", async () => {
    it("should fail to withdraw when balance is zero", async () => {
      await expect(
        contract.withdrawErc20(standardERC20.address)
      ).to.be.revertedWith("ZeroBalance");
    });

    it("should only allow the owner to withdrawErc20(standardERC20.address)", async () => {
      //user1 should be reverted when calling withdrawErc20(standardERC20.address)
      await expect(
        contract.connect(user1).withdrawErc20(standardERC20.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should withdraw contract balance to the default withdrawal addresses.", async () => {
      const value = ethers.utils.parseEther("3.14159265358979323");

      await expect(
        standardERC20.connect(approved).transfer(contract.address, value)
      ).to.not.be.reverted;

      await expect(contract.withdrawErc20(standardERC20.address)).to.be.not.be
        .reverted;
    });

    it("should withdraw contract balance to the correct withdrawal addresses.", async () => {
      const aaaInitialBalance = await standardERC20.balanceOf(user1.address);
      const netvrkInitialBalance = await standardERC20.balanceOf(user2.address);

      const value = ethers.utils.parseEther("3.14159265358979323");

      await expect(
        standardERC20.connect(approved).transfer(contract.address, value)
      ).to.not.be.reverted;

      await expect(contract.setAngryApeArmyAddress(user1.address)).to.not.be
        .reverted;

      await expect(contract.setNetvrkAddress(user2.address)).to.not.be.reverted;

      await expect(contract.withdrawErc20(standardERC20.address)).to.be.not.be
        .reverted;

      expect(await standardERC20.balanceOf(user1.address)).to.equal(
        aaaInitialBalance.add(value.mul(7000).div(10000)) // 70.00%
      );
      expect(await standardERC20.balanceOf(user2.address)).to.equal(
        netvrkInitialBalance.add(value.mul(3000).div(10000)) // 30.00%
      );
    });
  });
});
