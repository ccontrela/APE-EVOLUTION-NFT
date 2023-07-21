import * as dotenv from "dotenv";

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AngryApeArmyTreasury,
  AngryApeArmyTreasury__factory,
  StandardERC20,
  StandardERC20__factory,
} from "../typechain";

import { MockContract, smock } from "@defi-wonderland/smock";

dotenv.config();

let contract: AngryApeArmyTreasury;
let contractFactory: AngryApeArmyTreasury__factory;
let standardERC20: MockContract<StandardERC20>;
let owner: SignerWithAddress;
let signer: SignerWithAddress;
let approved: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;
let user4: SignerWithAddress;
let user5: SignerWithAddress;

describe("AngryApeArmyTreasury", function () {
  before(async () => {
    [owner, signer, approved, user1, user2, user3, user4, user5] =
      await ethers.getSigners();

    // Set up contract
    contractFactory = await ethers.getContractFactory(
      "AngryApeArmyTreasury",
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
    it("should return the correct default withdrawal address when no withdrawal address has been set for Angry Ape Army", async () => {
      expect(await contract.teamMemberA()).to.eql(
        "0x6ab71C2025442B694C8585aCe2fc06D877469D30"
      );
    });

    it("should return the correct default withdrawal address when no withdrawal address has been set for Netvrk", async () => {
      expect(await contract.teamMemberB()).to.eql(
        "0x901FC05c4a4bC027a8979089D716b6793052Cc16"
      );
    });

    it("should return the correct default withdrawal address for team member C", async () => {
      expect(await contract.teamMemberC()).to.eql(
        "0x45f14c6F6649D1D4Cb3dD501811Ab7263285eaa3"
      );
    });

    it("should return the correct default withdrawal address for team member D", async () => {
      expect(await contract.teamMemberD()).to.eql(
        "0x672A7EC8fC186f6C9aa32d98C896821182907b08"
      );
    });

    it("should return the correct default withdrawal address for team member E", async () => {
      expect(await contract.teamMemberE()).to.eql(
        "0x5FA988805E792B6cA0466B2dbb52693b2DEfF33F"
      );
    });

    it("should set the withdrawal address for AAA", async () => {
      await expect(contract.setTeamMemberA(user1.address)).to.not.be.reverted;
    });

    it("should fail to set the AAA withdrawal address because user is not owner", async () => {
      await expect(
        contract.connect(user1).setTeamMemberA(user1.address)
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
      const teamMemberAInitialBalance = await user1.getBalance();
      const teamMemberBInitialBalance = await user2.getBalance();
      const teamMemberCInitialBalance = await user3.getBalance();
      const teamMemberDInitialBalance = await user4.getBalance();
      const teamMemberEInitialBalance = await user5.getBalance();

      const value = ethers.utils.parseEther("3.14159265358979323");

      await expect(
        owner.sendTransaction({
          to: contract.address,
          value,
        })
      ).to.not.be.reverted;

      await expect(contract.setTeamMemberA(user1.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberB(user2.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberC(user3.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberD(user4.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberE(user5.address)).to.not.be.reverted;

      await expect(contract.withdrawEth()).to.be.not.be.reverted;

      expect(await user1.getBalance()).to.equal(
        teamMemberAInitialBalance.add(value.mul(7000).div(10000)) // 70.00%
      );
      expect(await user2.getBalance()).to.equal(
        teamMemberBInitialBalance.add(value.mul(2000).div(10000)) // 20.00%
      );
      expect(await user3.getBalance()).to.equal(
        teamMemberCInitialBalance.add(value.mul(330).div(10000)) // 33.00%
      );
      expect(await user4.getBalance()).to.equal(
        teamMemberDInitialBalance.add(value.mul(330).div(10000)) // 33.00%
      );
      expect(await user5.getBalance()).to.be.closeTo(
        teamMemberEInitialBalance.add(value.mul(340).div(10000)), // 34.00%
        10
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
      const teamMemberAInitialBalance = await standardERC20.balanceOf(
        user1.address
      );
      const teamMemberBInitialBalance = await standardERC20.balanceOf(
        user2.address
      );
      const teamMemberCInitialBalance = await standardERC20.balanceOf(
        user3.address
      );
      const teamMemberDInitialBalance = await standardERC20.balanceOf(
        user4.address
      );
      const teamMemberEInitialBalance = await standardERC20.balanceOf(
        user5.address
      );

      const value = ethers.utils.parseEther("3.14159265358979323");

      await expect(
        standardERC20.connect(approved).transfer(contract.address, value)
      ).to.not.be.reverted;

      await expect(contract.setTeamMemberA(user1.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberB(user2.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberC(user3.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberD(user4.address)).to.not.be.reverted;

      await expect(contract.setTeamMemberE(user5.address)).to.not.be.reverted;

      await expect(contract.withdrawErc20(standardERC20.address)).to.be.not.be
        .reverted;

      expect(await standardERC20.balanceOf(user1.address)).to.equal(
        teamMemberAInitialBalance.add(value.mul(7000).div(10000)) // 70.00%
      );
      expect(await standardERC20.balanceOf(user2.address)).to.equal(
        teamMemberBInitialBalance.add(value.mul(2000).div(10000)) // 20.00%
      );
      expect(await standardERC20.balanceOf(user3.address)).to.equal(
        teamMemberCInitialBalance.add(value.mul(330).div(10000)) // 3.30%
      );
      expect(await standardERC20.balanceOf(user4.address)).to.equal(
        teamMemberDInitialBalance.add(value.mul(330).div(10000)) // 3.30%
      );
      expect(await standardERC20.balanceOf(user5.address)).to.be.closeTo(
        teamMemberEInitialBalance.add(value.mul(340).div(10000)), // 3.40%
        10
      );
    });
  });
});
