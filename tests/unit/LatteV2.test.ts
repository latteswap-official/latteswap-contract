import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import { LATTE, LATTEV2, LATTEV2__factory, LATTE__factory } from "../../typechain";
import { solidity } from "ethereum-waffle";
import { Signer } from "ethers";
import { IClaims, latteV2UnitTestFixture } from "../helpers/fixtures/LatteV2";
import { parseEther } from "@ethersproject/units";
import { ModifiableContract } from "@eth-optimism/smock";
import { advanceBlockTo } from "../helpers/time";

chai.use(solidity);
const { expect } = chai;

describe("LATTEV2", () => {
  // Latte V2 instances
  let latteV2: LATTEV2;
  let latteV2AsAlice: LATTEV2;

  let latteV1: ModifiableContract;
  let latteV1AsAlice: LATTE;

  let claims: IClaims;
  let merkleRoot: string;
  let tokenTotal: string;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;

  beforeEach(async () => {
    [deployer, alice, bob, eve] = await ethers.getSigners();
    ({ latteV2, claims, merkleRoot, tokenTotal, latteV1 } = await waffle.loadFixture(latteV2UnitTestFixture));
    expect(tokenTotal).to.eq(ethers.utils.parseEther("750").toHexString(), "tokenTotal should be equal to 750"); // 750
    latteV2AsAlice = LATTEV2__factory.connect(latteV2.address, alice);
    latteV1AsAlice = LATTE__factory.connect(latteV1.address, alice);
  });

  describe("#claimLock", () => {
    context("when the block number exceed or equal start release block", () => {
      it("should revert", async () => {
        const blockNumber = await ethers.provider.getBlockNumber();
        await advanceBlockTo(blockNumber + 100);
        const account = await alice.getAddress();
        const claim = claims[account];
        await expect(latteV2AsAlice.claimLock(claim.index, account, claim.amount, claim.proof)).to.revertedWith(
          "LATTEV2::beforeStartReleaseBlock:: operation can only be done before start release"
        );
      });
    });
    context("when the user claim a reward", async () => {
      context("with valid proof", async () => {
        it("should claim their Lattev1 and mint & lock lattev2", async () => {
          const account = await alice.getAddress();
          const claim = claims[account];
          await latteV2AsAlice.claimLock(claim.index, account, claim.amount, claim.proof);
          expect(await latteV2AsAlice.lockOf(account)).to.eq(claim.amount, "lock of amount should be equal");
        });
      });
      context("with invalid proof", async () => {
        it("should revert", async () => {
          const account = await alice.getAddress();
          const claim = claims[account];
          await expect(
            latteV2AsAlice.claimLock(claim.index, account, parseEther("100"), claim.proof)
          ).to.be.revertedWith("LATTEV2::claimLock:: invalid proof");
        });
      });
    });

    context("when the user already claimed their locked reward", async () => {
      it("should reverted", async () => {
        const account = await alice.getAddress();
        const claim = claims[account];
        await latteV2AsAlice.claimLock(claim.index, account, claim.amount, claim.proof);
        expect(await latteV2AsAlice.lockOf(account)).to.eq(claim.amount, "lock of amount should be equal");
        await expect(latteV2AsAlice.claimLock(claim.index, account, claim.amount, claim.proof)).to.be.revertedWith(
          "LATTEV2::claimLock:: already claim lock"
        );
      });
    });
  });

  describe("#redeem()", () => {
    context("when the block number exceed or equal start release block", () => {
      it("should revert", async () => {
        const blockNumber = await ethers.provider.getBlockNumber();
        await advanceBlockTo(blockNumber + 100);
        const aliceAddr = await alice.getAddress();
        await latteV1.mint(aliceAddr, ethers.utils.parseEther("168"));
        const aliceBal = await latteV1.balanceOf(aliceAddr);
        await latteV1AsAlice.approve(latteV2.address, aliceBal);
        await expect(latteV2AsAlice.redeem(aliceBal)).to.revertedWith(
          "LATTEV2::beforeStartReleaseBlock:: operation can only be done before start release"
        );
      });
    });
    context("with full amount", () => {
      it("should redeem from LATTEV1 to V2 by minting a new one and burning the former one", async () => {
        const aliceAddr = await alice.getAddress();
        await latteV1.mint(aliceAddr, ethers.utils.parseEther("168"));
        const aliceBal = await latteV1.balanceOf(aliceAddr);
        await latteV1AsAlice.approve(latteV2.address, aliceBal);
        await expect(latteV2AsAlice.redeem(aliceBal)).to.emit(latteV2, "Redeem").withArgs(aliceAddr, aliceBal);
        expect(await latteV2AsAlice.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("168"));
      });
    });
    context("with some amount", () => {
      it("should redeem from LATTEV1 to V2 by minting a new one and burning the former one", async () => {
        const aliceAddr = await alice.getAddress();
        await latteV1.mint(aliceAddr, ethers.utils.parseEther("168"));
        const redeemAmount = ethers.utils.parseEther("68");
        await latteV1AsAlice.approve(latteV2.address, redeemAmount);
        await expect(latteV2AsAlice.redeem(redeemAmount)).to.emit(latteV2, "Redeem").withArgs(aliceAddr, redeemAmount);
        expect(await latteV2AsAlice.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("68"));
        expect(await latteV1.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("100"));
      });
    });
  });
});
