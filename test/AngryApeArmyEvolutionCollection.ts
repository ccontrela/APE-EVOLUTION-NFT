import * as dotenv from "dotenv";

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { randomBytes } from "crypto";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
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
let approved: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;
let user4: SignerWithAddress;

let whitelist: string[];

let merkleTree: MerkleTree;
let leavesLookup: Record<string, string>;

function signMintRequest(address: string, quantity: number, nonce: string) {
  let hash = ethers.utils.solidityKeccak256(
    ["address", "uint256", "string"],
    [address, quantity, nonce]
  );

  return signer.signMessage(ethers.utils.arrayify(hash));
}

describe("AngryApeArmyEvolutionCollection", function () {
  before(async () => {
    [owner, signer, approved, user1, user2, user3, user4] =
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

    whitelist = [
      owner.address,
      signer.address,
      approved.address,
      user1.address,
      user2.address,
      user3.address,
      user4.address,
    ];

    leavesLookup = Object.fromEntries(
      whitelist.map((address: string) => [
        address,
        ethers.utils.solidityKeccak256(["address"], [address]),
      ])
    );

    merkleTree = new MerkleTree(Object.values(leavesLookup), keccak256, {
      sortPairs: true,
    });
  });

  beforeEach(async () => {
    contract = await contractFactory.deploy(
      signer.address,
      aaaContract.address,
      royaltyReceiverContract.address
    );
    await contract.deployed();
  });

  describe("When checking for supported interfaces", async () => {
    it("should support supporting interfaces", async () => {
      const ERC165InterfaceId = "0x01ffc9a7"; // type(IERC165).interfaceId

      expect(await contract.supportsInterface(ERC165InterfaceId)).to.equal(
        true
      );
    });

    it("should support ERC721 Interface", async () => {
      const ERC721InterfaceId = "0x80ac58cd"; // type(IERC1155).interfaceId

      expect(await contract.supportsInterface(ERC721InterfaceId)).to.equal(
        true
      );
    });

    it("should support ERC721 Metadata Interface", async () => {
      const ERC721MetadataInterfaceId = "0x5b5e139f"; // type(IERC721Metadata).interfaceId

      expect(
        await contract.supportsInterface(ERC721MetadataInterfaceId)
      ).to.equal(true);
    });

    it("should support ERC721 Enumerable Interface", async () => {
      const ERC721EnumerableInterfaceId = "0x780e9d63"; // type(IERC721Enumerable).interfaceId

      expect(
        await contract.supportsInterface(ERC721EnumerableInterfaceId)
      ).to.equal(true);
    });

    it("should support ContractURI Interface", async () => {
      const ContractURIInterfaceId = "0xe8a3d485"; // type(IContractURI).interfaceId

      expect(await contract.supportsInterface(ContractURIInterfaceId)).to.equal(
        true
      );
    });

    it("should support ERC2981 Interface", async () => {
      const ERC2981InterfaceId = "0x2a55205a"; // type(IERC2981).interfaceId

      expect(await contract.supportsInterface(ERC2981InterfaceId)).to.equal(
        true
      );
    });
  });

  describe("When getting public variables", async () => {
    it("should get price equal to 0.4 eth", async () => {
      expect((await contract.SALE_PRICE()).toString()).to.equal(
        ethers.utils.parseEther("0.4").toString()
      );
    });

    it("should get total supply quantity equal to 10,000", async () => {
      expect((await contract.MAX_SUPPLY()).toString()).to.equal("10000");
    });

    it("should get mint limit equal to 10", async () => {
      expect((await contract.MAX_BATCH_MINT()).toString()).to.equal("20");
    });
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

  describe("When withdrawing funds", async () => {
    it("should return the correct default withdrawal address when no withdrawal address has been set for AAA", async () => {
      expect(await contract.aaaWithdrawal()).to.eql(
        "0x6ab71C2025442B694C8585aCe2fc06D877469D30"
      );
    });

    it("should return the correct default withdrawal address when no withdrawal address has been set for netvrk", async () => {
      expect(await contract.netvrkWithdrawal()).to.eql(
        "0x901FC05c4a4bC027a8979089D716b6793052Cc16"
      );
    });

    it("should set the withdrawal address for AAA", async () => {
      await expect(contract.setAaaWithdrawal(user1.address)).to.not.be.reverted;
    });

    it("should set the withdrawal address for netvrk", async () => {
      await expect(contract.setNetvrkWithdrawal(user2.address)).to.not.be
        .reverted;
    });

    it("should fail to set the AAA withdrawal address because user is not owner", async () => {
      await expect(
        contract.connect(user1).setAaaWithdrawal(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail to set the netvrk withdrawal address because user is not owner", async () => {
      await expect(
        contract.connect(user1).setNetvrkWithdrawal(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail to withdraw when balance is zero", async () => {
      await expect(contract.withdrawAll()).to.be.revertedWith(
        "Balance is zero"
      );
    });

    it("should only allow the owner to withdrawAll()", async () => {
      //user1 should be reverted when calling withdrawAll()
      await expect(contract.connect(user1).withdrawAll()).to.be.revertedWith(
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

      await expect(contract.withdrawAll()).to.be.not.be.reverted;
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

      await expect(contract.setAaaWithdrawal(user1.address)).to.not.be.reverted;

      await expect(contract.setNetvrkWithdrawal(user2.address)).to.not.be
        .reverted;

      await expect(contract.withdrawAll()).to.be.not.be.reverted;

      expect(await user1.getBalance()).to.equal(
        aaaInitialBalance.add(value.mul(7000).div(10000)) // 70.00%
      );
      expect(await user2.getBalance()).to.equal(
        netvrkInitialBalance.add(value.mul(3000).div(10000)) // 30.00%
      );
    });
  });

  describe("When changing sale state", async () => {
    it("should return the default state as NOT_STARTED", async () => {
      expect(await contract.saleState()).to.eql("NOT_STARTED");
    });

    it("should start sale states in order", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
    });

    it("should fail to start sale states out of order", async () => {
      await expect(contract.startPreSale()).to.be.revertedWith(
        "Free mint state required"
      );

      await expect(contract.startSale()).to.be.revertedWith(
        "Pre-sale state required"
      );
    });

    it("should end sale only after public sale", async () => {
      await expect(contract.endSale()).to.be.revertedWith(
        "Sale state required"
      );

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.endSale()).to.be.revertedWith(
        "Sale state required"
      );

      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.endSale()).to.be.revertedWith(
        "Sale state required"
      );

      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.endSale()).to.emit(contract, "SaleEnds");
    });

    it("end sale no longer allows change of sale state", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.endSale()).to.emit(contract, "SaleEnds");

      await expect(contract.startFreeMint()).to.be.revertedWith(
        "Free mint has already started"
      );
      await expect(contract.startPreSale()).to.be.revertedWith(
        "Pre-sale has already started"
      );
      await expect(contract.startSale()).to.be.revertedWith(
        "Sale has already started"
      );
      await expect(contract.endSale()).to.be.revertedWith("Sale has ended");
    });

    it("should set correct values for each sale state", async () => {
      expect(await contract.saleState()).to.be.eql("NOT_STARTED");

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      expect(await contract.saleState()).to.be.eql("FREE_MINT");

      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      expect(await contract.saleState()).to.be.eql("PRE_SALE");

      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      expect(await contract.saleState()).to.be.eql("SALE");

      await expect(contract.endSale()).to.emit(contract, "SaleEnds");
      expect(await contract.saleState()).to.be.eql("ENDED");
    });

    it("pauses a sale state", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.pause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("FREE_MINT_PAUSED");

      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.pause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("PRE_SALE_PAUSED");

      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.pause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("SALE_PAUSED");
    });

    it("unpauses a paused sale state", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.pause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("FREE_MINT_PAUSED");
      await expect(contract.unpause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("FREE_MINT");

      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.pause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("PRE_SALE_PAUSED");
      await expect(contract.unpause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("PRE_SALE");

      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.pause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("SALE_PAUSED");
      await expect(contract.unpause()).to.not.be.reverted;
      expect(await contract.saleState()).to.be.eql("SALE");
    });

    it("can not pause a paused sale state", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.pause()).to.not.be.reverted;
      await expect(contract.pause()).to.be.revertedWith("Sale is paused");

      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.pause()).to.not.be.reverted;
      await expect(contract.pause()).to.be.revertedWith("Sale is paused");

      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.pause()).to.not.be.reverted;
      await expect(contract.pause()).to.be.revertedWith("Sale is paused");
    });

    it("can not unpause an active sale state", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.unpause()).to.be.revertedWith("Sale is not paused");

      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.unpause()).to.be.revertedWith("Sale is not paused");

      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.unpause()).to.be.revertedWith("Sale is not paused");
    });

    it("can not change pause state when no sale active", async () => {
      await expect(contract.pause()).to.be.revertedWith("No active sale");
      await expect(contract.unpause()).to.be.revertedWith("No active sale");

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      await expect(contract.endSale()).to.emit(contract, "SaleEnds");

      await expect(contract.pause()).to.be.revertedWith("No active sale");
      await expect(contract.unpause()).to.be.revertedWith("No active sale");
    });
  });

  describe("When changing signer address", async () => {
    it("should fail to set signer address because because user is not owner", async () => {
      //user1 should be reverted when calling withdrawAll()
      await expect(
        contract.connect(user1).setSignerAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should set the signer address", async () => {
      await expect(contract.setSignerAddress(user1.address)).to.not.be.reverted;
    });

    it("should set the signer address and fail as actual signer is not the same", async () => {
      await expect(contract.setSignerAddress(user1.address)).to.not.be.reverted;

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let quantity = 5;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.revertedWith("Signature does not correspond");
    });

    it("should set signer address and free mint successfully", async () => {
      await expect(contract.setSignerAddress(user3.address)).to.not.be.reverted;

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );

      const freeMint = [1, 2, 6, 8, 10, 16, 18, 25, 30, 31, 32];
      const preSale = [1, 3, 6, 9, 10, 16, 20];
      const quantity = freeMint.length + preSale.length;
      let nonce = randomBytes(10).toString("hex");

      let hash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "string"],
        [user1.address, quantity, nonce]
      );

      let apiSignature = await network.provider.send("eth_sign", [
        user3.address,
        hash,
      ]);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract
          .connect(user1)
          .freeMint(freeMint, preSale, nonce, apiSignature, {
            value: price.mul(preSale.length),
          })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(18);

      for (var i = 0; i < quantity; i++) {
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }
    });

    it("should set signer address and pre mint successfully", async () => {
      await expect(contract.setSignerAddress(user3.address)).to.not.be.reverted;

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");

      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let hash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "string"],
        [user1.address, quantity, nonce]
      );

      let apiSignature = await network.provider.send("eth_sign", [
        user3.address,
        hash,
      ]);

      const leaf = leavesLookup[user1.address];
      const proof = merkleTree.getHexProof(leaf);
      const root = merkleTree.getHexRoot();

      await expect(contract.setMerkleRoot(root)).to.not.be.reverted;

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).preSaleMint(proof, nonce, apiSignature, {
          value: price,
        })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(1);

      expect(await contract.ownerOf(0)).to.be.eq(user1.address);
    });

    it("should set signer address and mint successfully", async () => {
      await expect(contract.setSignerAddress(user3.address)).to.not.be.reverted;

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let quantity = 5;
      let nonce = randomBytes(10).toString("hex");

      let hash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "string"],
        [user1.address, quantity, nonce]
      );

      let apiSignature = await network.provider.send("eth_sign", [
        user3.address,
        hash,
      ]);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");
    });
  });

  describe("When free minting", async () => {
    it("should allow free minting with a valid signature", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );

      const freeMint = [1, 2, 6, 8, 10, 16, 18, 25, 30, 31, 32];
      const preSale = [1, 3, 6, 9, 10, 16, 20];
      const quantity = freeMint.length + preSale.length;

      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract
          .connect(user1)
          .freeMint(freeMint, preSale, nonce, apiSignature, {
            value: price.mul(preSale.length),
          })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(18);

      for (var i = 0; i < quantity; i++) {
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }
    });

    it("should revert with a token already used message", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );

      const freeMint = [1, 2, 6, 8, 10, 16, 18, 25, 30, 31, 32];
      const preSale = [1, 3, 6, 9, 10, 16, 20];
      const quantity = freeMint.length + preSale.length;

      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract
          .connect(user1)
          .freeMint(freeMint, preSale, nonce, apiSignature, {
            value: price.mul(preSale.length),
          })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(18);

      for (var i = 0; i < quantity; i++) {
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }

      nonce = randomBytes(10).toString("hex");

      apiSignature = await signMintRequest(user1.address, quantity, nonce);

      await expect(
        contract
          .connect(user1)
          .freeMint(freeMint, preSale, nonce, apiSignature, {
            value: price.mul(preSale.length),
          })
      ).to.be.revertedWith("Token already used");
    });

    it("should revert with a token not owned message", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );

      const freeMint = [
        1, 2, 6, 8, 10, 16, 18, 25, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49,
      ];
      const preSale = [1, 3, 6, 9, 10, 16, 20, 101, 102];
      const quantity = freeMint.length + preSale.length;

      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract
          .connect(user1)
          .freeMint(freeMint, preSale, nonce, apiSignature, {
            value: price.mul(preSale.length),
          })
      ).to.to.be.revertedWith("Token not owned");
    });
  });

  describe("When pre sale minting", async () => {
    it("should allow pre sale minting with a valid signature and merkle proof", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");

      const leaf = leavesLookup[user1.address];
      const proof = merkleTree.getHexProof(leaf);
      const root = merkleTree.getHexRoot();

      await expect(contract.setMerkleRoot(root)).to.not.be.reverted;

      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, 1, nonce);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).preSaleMint(proof, nonce, apiSignature, {
          value: price,
        })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(1);

      expect(await contract.ownerOf(0)).to.be.eq(user1.address);
    });

    it("should fail to mint a second time pre sale minting with a valid signature and merkle proof", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");

      const leaf = leavesLookup[user1.address];
      const proof = merkleTree.getHexProof(leaf);
      const root = merkleTree.getHexRoot();

      await expect(contract.setMerkleRoot(root)).to.not.be.reverted;

      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, 1, nonce);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).preSaleMint(proof, nonce, apiSignature, {
          value: price,
        })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(1);

      expect(await contract.ownerOf(0)).to.be.eq(user1.address);

      nonce = randomBytes(10).toString("hex");

      apiSignature = await signMintRequest(user1.address, 1, nonce);

      // Mint
      await expect(
        contract.connect(user1).preSaleMint(proof, nonce, apiSignature, {
          value: price,
        })
      ).to.be.revertedWith("Whitelist used");
    });
  });

  describe("When minting", async () => {
    it("should allow minting with a valid signature", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(1);

      expect(await contract.ownerOf(0)).to.be.eq(user1.address);
    });

    it("should fail to mint with a valid signature because public sale is not active", async () => {
      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.be.revertedWith("Sale not active");
    });

    it("should not allow reuse of the same nonce", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      quantity = 2;

      apiSignature = await signMintRequest(user1.address, quantity, nonce);

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.be.revertedWith("Nonce already used");
    });

    it("should not allow reuse of the same request", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.be.revertedWith("Nonce already used");
    });

    it("should not allow minting when sent value is below price value", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      // When purchasing one token
      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity).sub(ethers.utils.parseEther("0.002")),
        })
      ).to.be.revertedWith("Insufficient eth to process the order");

      // When purchasing more than one token
      quantity = 5;
      nonce = randomBytes(10).toString("hex");

      apiSignature = await signMintRequest(user2.address, quantity, nonce);

      // Mint
      await expect(
        contract.connect(user2).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity).sub(price),
        })
      ).to.be.revertedWith("Insufficient eth to process the order");
    });

    it("should not allow minting when sale is not active", async () => {
      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity).sub(price),
        })
      ).to.be.revertedWith("Sale not active");
    });

    it("should not allow minting when presale is active", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");

      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity).sub(price),
        })
      ).to.be.revertedWith("Sale not active");
    });

    it("should not allow minting more than the MAX_BATCH_MINT per transaction", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let quantity = (await contract.MAX_BATCH_MINT()) + 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.be.revertedWith(
        "Cannot mint more than MAX_BATCH_MINT per transaction"
      );
    });

    it("should not allow minting more than the MAX_BATCH_MINT per wallet", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");
      let totalAmount = await contract.MAX_BATCH_MINT();

      let quantity = totalAmount / 2 + 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint 10
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      nonce = randomBytes(10).toString("hex");

      apiSignature = await signMintRequest(user1.address, quantity, nonce);

      // Mint another 10 and fail
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.be.revertedWith(
        "Any one wallet cannot hold more than MAX_BATCH_MINT"
      );

      quantity = totalAmount - quantity;
      nonce = randomBytes(10).toString("hex");

      apiSignature = await signMintRequest(user1.address, quantity, nonce);

      // Mint 5 to hit the total limit of 15
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(
        totalAmount
      );
    });
  });

  describe("When setting baseURI", async () => {
    it("should set the baseURI", async () => {
      await expect(
        contract.setBaseURI(
          "ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu/"
        )
      ).to.emit(contract, "SetBaseURI");
    });

    it("should fail to set the baseURI", async () => {
      await expect(
        contract
          .connect(user1)
          .setBaseURI("ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu/")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail to set the baseURI because trailing slash is not set", async () => {
      await expect(
        contract.setBaseURI(
          "ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu"
        )
      ).to.be.revertedWith("Must set trailing slash");
    });

    it("should fail to retrieve tokenURI", async () => {
      await expect(contract.connect(user2).tokenURI(1)).to.be.revertedWith(
        "URI query for nonexistent token"
      );
    });

    it("should retrieve correct default tokenURI", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let tokenId = 0;
      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      expect(await contract.connect(user2).tokenURI(tokenId)).to.equal(
        `https://aaa-evolution-api-h5pd2zuvza-uc.a.run.app/token/${tokenId}.json`
      );
    });

    it("should retrieve correct updated tokenURI", async () => {
      await expect(
        contract.setBaseURI(
          "ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu/"
        )
      ).to.emit(contract, "SetBaseURI");

      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );
      await expect(contract.startPreSale()).to.emit(contract, "PreSaleBegins");
      await expect(contract.startSale()).to.emit(contract, "SaleBegins");

      let tokenId = 0;
      let quantity = 1;
      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.SALE_PRICE();

      // Mint
      await expect(
        contract.connect(user1).mint(quantity, nonce, apiSignature, {
          value: price.mul(quantity),
        })
      ).to.emit(contract, "Transfer");

      expect(await contract.connect(user2).tokenURI(tokenId)).to.equal(
        `ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu/token/${tokenId}.json`
      );
    });

    it("should retrieve correct default contractURI", async () => {
      expect(await contract.connect(user2).contractURI()).to.equal(
        `https://aaa-evolution-api-h5pd2zuvza-uc.a.run.app/contract.json`
      );
    });

    it("should retrieve correctly updated contractURI", async () => {
      await expect(
        contract.setBaseURI(
          "ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu/"
        )
      ).to.emit(contract, "SetBaseURI");

      expect(await contract.connect(user2).contractURI()).to.equal(
        `ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu/contract.json`
      );
    });
  });

  describe("When minting reserved", async () => {
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
    });

    it("should mint reserved from owner to user1 400", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      const totalReserved = await contract.reserved();
      const requiredTransactions = totalReserved / quantity;


      for(var i = 0; i < requiredTransactions; i++){
        await expect(contract.reservedMint(user1.address, quantity)).to.emit(
          contract,
          "Transfer"
        );
      }

      expect((await contract.balanceOf(user1.address)).toNumber()).to.be.eq(
        totalReserved
      );

      for (var i = 0; i < totalReserved; i++) {
        expect(await contract.ownerOf(i)).to.be.eq(user1.address);
      }

      expect(await contract.reserved()).to.be.eq(0);

      await expect(contract.reservedMint(user1.address, 1)).to.be.revertedWith("Not enough reserved supply");
    });

    it("should fail mint from owner with quantity tx too high", async () => {
      const quantity = (await contract.MAX_BATCH_MINT()) + 1;
      await expect(
        contract.reservedMint(user1.address, quantity)
      ).to.be.revertedWith(
        "Cannot mint more than MAX_BATCH_MINT per transaction"
      );
    });

    it("should fail to mint from user1", async () => {
      const quantity = await contract.MAX_BATCH_MINT();
      await expect(
        contract.connect(user1).reservedMint(user1.address, quantity)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("When getting AAA mint status", async () => {
    it("should return freeMintUsed and preSaleUsed true", async () => {
      await expect(contract.startFreeMint()).to.emit(
        contract,
        "FreeMintBegins"
      );

      const freeMint = [0, 1, 2, 6, 8, 10, 16, 18, 25, 30, 31, 32];
      const preSale = [0, 1, 3, 6, 9, 10, 16, 20];
      const quantity = freeMint.length + preSale.length;

      let nonce = randomBytes(10).toString("hex");

      let apiSignature = await signMintRequest(user1.address, quantity, nonce);

      let price = await contract.PRE_SALE_PRICE();

      // Mint
      await expect(
        contract
          .connect(user1)
          .freeMint(freeMint, preSale, nonce, apiSignature, {
            value: price.mul(preSale.length),
          })
      ).to.emit(contract, "Transfer");

      let [freeMintUsed, preSaleUsed] = await contract.usedTokenId(0);
      expect([freeMintUsed, preSaleUsed]).to.eql([true, true]);

      [freeMintUsed, preSaleUsed] = await contract.usedTokenId(2);
      expect([freeMintUsed, preSaleUsed]).to.eql([true, false]);

      [freeMintUsed, preSaleUsed] = await contract.usedTokenId(3);
      expect([freeMintUsed, preSaleUsed]).to.eql([false, true]);

      [freeMintUsed, preSaleUsed] = await contract.usedTokenId(5);
      expect([freeMintUsed, preSaleUsed]).to.eql([false, false]);
    });
  });
});
