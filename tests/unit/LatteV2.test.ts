import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import { LATTE, LATTEV2, LATTEV2__factory, LATTE__factory } from "../../typechain";
import { solidity } from "ethereum-waffle";
import { BigNumber, Signer } from "ethers";
import { IClaims, IMerkleDistribution, latteV2UnitTestFixture } from "../helpers/fixtures/LatteV2";
import { parseEther } from "@ethersproject/units";
import { ModifiableContract } from "@eth-optimism/smock";
import { advanceBlockTo } from "../helpers/time";
import merkleDistribution from "../helpers/fixtures/mock_merkle_distribution.json";

type IClaimEntry = [
  string,
  {
    index: number;
    amount: string;
    proof: Array<string>;
  }
];

type IClaimEntries = Array<IClaimEntry>;

interface IClaimParams {
  indexes: Array<number>;
  accounts: Array<string>;
  amounts: Array<string>;
  merkleProofs: Array<Array<string>>;
}

chai.use(solidity);
const { expect } = chai;

describe("LATTEV2", () => {
  // Latte V2 instances
  let latteV2: LATTEV2;
  let latteV2WithMultipleClaims: LATTEV2;
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
    ({ latteV2, claims, merkleRoot, tokenTotal, latteV1, latteV2WithMultipleClaims } = await waffle.loadFixture(
      latteV2UnitTestFixture
    ));
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
        await expect(latteV2AsAlice.claimLock([claim.index], [account], [claim.amount], [claim.proof])).to.revertedWith(
          "LATTEV2::beforeStartReleaseBlock:: operation can only be done before start release"
        );
      });
    });
    context("when the user claim a reward", async () => {
      context("with single data", () => {
        it("should claim their Lattev1 and mint & lock lattev2", async () => {
          const account = await alice.getAddress();
          const claim = claims[account];
          await latteV2AsAlice.claimLock([claim.index], [account], [claim.amount], [claim.proof]);
          expect(await latteV2AsAlice.lockOf(account)).to.eq(claim.amount, "lock of amount should be equal");
        });
      });

      context("with massive data", () => {
        it("should claim their Lattev1 and mint & lock lattev2", async () => {
          const _latteV2 = latteV2WithMultipleClaims;

          const params: IClaimParams = Object.entries(
            (merkleDistribution as unknown as IMerkleDistribution).claims
          ).reduce(
            (accum, entry) => {
              accum.accounts.push(entry[0]);
              accum.indexes.push(entry[1].index);
              accum.amounts.push(entry[1].amount);
              accum.merkleProofs.push(entry[1].proof);
              return accum;
            },
            {
              indexes: [],
              accounts: [],
              amounts: [],
              merkleProofs: [],
            } as IClaimParams
          );
          expect(params.amounts.length).to.eq(params.accounts.length, "amount and accounts length should be equal");

          for (let i = 0; i < params.accounts.length; i++) {
            expect(BigNumber.from(params.amounts[i])).to.eq(
              BigNumber.from((merkleDistribution as unknown as IMerkleDistribution).claims[params.accounts[i]].amount),
              `amount of account ${params.accounts[i]} should be equal`
            );
          }
          const limit = 200;
          const pageCount = Math.ceil(params.accounts.length / limit);
          let nonce = await deployer.getTransactionCount();

          for (let i = 0; i < pageCount; i++) {
            const start = limit * i;
            const end = limit * (i + 1);
            const accounts = params.accounts.slice(start, end); // start to (end - 1)
            const amounts = params.amounts.slice(start, end); // start to (end - 1)
            const indexes = params.indexes.slice(start, end); // start to (end - 1)
            const merkleProofs = params.merkleProofs.slice(start, end); // start to (end - 1)
            const estimatedGas = await _latteV2.estimateGas.claimLock(indexes, accounts, amounts, merkleProofs);
            await _latteV2.claimLock(indexes, accounts, amounts, merkleProofs, {
              gasLimit: estimatedGas.add(100000),
              nonce: nonce,
            });
            nonce++;
          }

          const userLockedReconciliationPromises = Object.entries(
            (merkleDistribution as unknown as IMerkleDistribution).claims
          ).map(async ([account, claim]) => {
            const locked = await _latteV2.lockOf(account);
            expect(locked).to.eq(BigNumber.from(claim.amount), "lock should be equal");
            return {
              account,
              expect: BigNumber.from(claim.amount).toString(),
              actual: locked.toString(),
            };
          });

          await Promise.all(userLockedReconciliationPromises);
        });
      });

      context("with invalid proof", async () => {
        it("should revert", async () => {
          const account = await alice.getAddress();
          const claim = claims[account];
          await expect(
            latteV2AsAlice.claimLock([claim.index], [account], [parseEther("100")], [claim.proof])
          ).to.be.revertedWith("LATTEV2::claimLock:: invalid proof");
        });
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
        await expect(latteV2AsAlice.redeem(aliceBal)).to.emit(latteV2, "LogRedeem").withArgs(aliceAddr, aliceBal);
        expect(await latteV2AsAlice.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("168"));
        expect(await (latteV1 as unknown as LATTE).balanceOf("0x000000000000000000000000000000000000dEaD")).to.eq(
          ethers.utils.parseEther("168")
        );
        expect(await (latteV1 as unknown as LATTE).balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("0"));
      });
    });
    context("with some amount", () => {
      it("should redeem from LATTEV1 to V2 by minting a new one and burning the former one", async () => {
        const aliceAddr = await alice.getAddress();
        await latteV1.mint(aliceAddr, ethers.utils.parseEther("168"));
        const redeemAmount = ethers.utils.parseEther("68");
        await latteV1AsAlice.approve(latteV2.address, redeemAmount);
        await expect(latteV2AsAlice.redeem(redeemAmount))
          .to.emit(latteV2, "LogRedeem")
          .withArgs(aliceAddr, redeemAmount);
        expect(await latteV2AsAlice.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("68"));
        expect(await latteV1.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("100"));
        expect(await (latteV1 as unknown as LATTE).balanceOf("0x000000000000000000000000000000000000dEaD")).to.eq(
          ethers.utils.parseEther("68")
        );
      });
    });
  });
});
