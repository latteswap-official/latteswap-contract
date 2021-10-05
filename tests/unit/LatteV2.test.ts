import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import { LATTE, LATTEV2, LATTEV2__factory, LATTE__factory } from "../../typechain";
import { solidity } from "ethereum-waffle";
import { Signer } from "ethers";
import { IClaims, latteV2UnitTestFixture } from "../helpers/fixtures/LatteV2";
import { parseEther } from "@ethersproject/units";
import { ModifiableContract } from "@eth-optimism/smock";
import { advanceBlockTo } from "../helpers/time";
import userMockedLockedBalances from "../helpers/fixtures/mock_user_locked_balances.json";

interface ISetLockParams {
  accounts: Array<string>;
  amounts: Array<string>;
}

chai.use(solidity);
const { expect } = chai;

describe("LATTEV2", () => {
  // Latte V2 instances
  let latteV2: LATTEV2;
  let latteV2AsAlice: LATTEV2;

  let latteV1: ModifiableContract;
  let latteV1AsAlice: LATTE;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;

  beforeEach(async () => {
    [deployer, alice, bob, eve] = await ethers.getSigners();
    ({ latteV2, latteV1 } = await waffle.loadFixture(latteV2UnitTestFixture));
    latteV2AsAlice = LATTEV2__factory.connect(latteV2.address, alice);
    latteV1AsAlice = LATTE__factory.connect(latteV1.address, alice);
  });

  describe("#batchSetLockedAmounts", () => {
    context("when the caller is not an owner", () => {
      it("should revert", async () => {
        const account = await alice.getAddress();
        await expect(latteV2AsAlice.batchSetLockedAmounts([account], [parseEther("100")])).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });
    context("when the user claim a reward", async () => {
      context("with single data", () => {
        it("should claim their Lattev1 and mint & lock lattev2", async () => {
          const account = await alice.getAddress();
          await latteV2.batchSetLockedAmounts([account], [parseEther("100")]);
          expect(await latteV2AsAlice.lockOf(account)).to.eq(parseEther("100"), "lock of amount should be equal");
        });
      });
      context("with massive data", () => {
        it("should claim their Lattev1 and mint & lock lattev2", async () => {
          const params = Object.entries(userMockedLockedBalances).reduce(
            (accum, [account, amount]) => {
              accum.accounts.push(account);
              accum.amounts.push(amount);
              return accum;
            },
            {
              accounts: [],
              amounts: [],
            } as ISetLockParams
          );
          expect(params.amounts.length).to.eq(params.accounts.length, "amount and accounts length should be equal");

          for (let i = 0; i < params.accounts.length; i++) {
            expect(params.amounts[i]).to.eq(
              (userMockedLockedBalances as unknown as Record<string, string>)[params.accounts[i]],
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
            const estimatedGas = await latteV2.estimateGas.batchSetLockedAmounts(accounts, amounts);
            await latteV2.batchSetLockedAmounts(accounts, amounts, {
              gasLimit: estimatedGas.add(100000),
              nonce: nonce,
            });
            nonce++;
          }

          const userLockedReconciliationPromises = Object.entries(userMockedLockedBalances).map(
            async ([account, amount]) => {
              const locked = await latteV2.lockOf(account);
              expect(locked.toString()).to.eq(amount, "lock should be equal");
              return {
                account,
                expect: amount,
                actual: locked.toString(),
              };
            }
          );

          await Promise.all(userLockedReconciliationPromises);
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
        await expect(latteV2AsAlice.redeem(aliceBal)).to.emit(latteV2, "Redeem").withArgs(aliceAddr, aliceBal);
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
        await expect(latteV2AsAlice.redeem(redeemAmount)).to.emit(latteV2, "Redeem").withArgs(aliceAddr, redeemAmount);
        expect(await latteV2AsAlice.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("68"));
        expect(await latteV1.balanceOf(aliceAddr)).to.eq(ethers.utils.parseEther("100"));
        expect(await (latteV1 as unknown as LATTE).balanceOf("0x000000000000000000000000000000000000dEaD")).to.eq(
          ethers.utils.parseEther("68")
        );
      });
    });
  });
});
