import { ethers, waffle } from "hardhat";
import { Overrides, BigNumberish, utils, BigNumber, Signer, constants } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BeanBagV2,
  BeanBagV2__factory,
  LATTEV2,
  LatteVault,
  LatteVault__factory,
  MasterBarista,
  MockWBNB,
  SimpleToken,
  SimpleToken__factory,
} from "../../typechain";
import { advanceBlock, advanceBlockTo, duration, increase, latestBlockNumber } from "../helpers/time";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ModifiableContract } from "@eth-optimism/smock";
import { AddressZero, MaxUint256, Zero } from "@ethersproject/constants";
import { Address } from "ethereumjs-util";
import { latteVaultUnitTestFixture } from "../helpers/fixtures/LatteVault";

chai.use(solidity);
const { expect } = chai;

describe("LatteVault", () => {
  let LATTE_START_BLOCK: number;
  let LATTE_PER_BLOCK: BigNumber;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let farmer: Signer;
  let dev: Signer;

  // Lambdas
  let signatureFn: (signer: Signer, msg?: string) => Promise<string>;

  // Contracts
  let latteToken: LATTEV2;
  let masterBarista: ModifiableContract;
  let stakingTokens: SimpleToken[];
  let beanBag: ModifiableContract;
  let wbnb: MockWBNB;
  let latteVault: LatteVault;

  // Bindings
  let latteVaultAsAlice: LatteVault;
  let latteVaultAsOther: LatteVault;
  let latteVaultAsReinvestor: LatteVault;
  let beanBagAsAlice: BeanBagV2;
  let signatureAsDeployer: string;
  let signatureAsAlice: string;

  beforeEach(async () => {
    ({ masterBarista, stakingTokens, latteToken, beanBag, signatureFn, wbnb, latteVault } = await waffle.loadFixture(
      latteVaultUnitTestFixture
    ));
    [deployer, alice, farmer, dev] = await ethers.getSigners();

    latteVaultAsAlice = LatteVault__factory.connect(latteVault.address, alice) as LatteVault;
    latteVaultAsOther = LatteVault__factory.connect(latteVault.address, dev) as LatteVault;
    latteVaultAsReinvestor = LatteVault__factory.connect(latteVault.address, farmer) as LatteVault;
    beanBagAsAlice = BeanBagV2__factory.connect(beanBag.address, alice) as BeanBagV2;

    signatureAsDeployer = await signatureFn(deployer);
    signatureAsAlice = await signatureFn(alice);
  });

  describe("#harvest()", () => {
    context("when harvest 0 reward", () => {
      it("should emit a Harvest with 0 reward", async () => {
        await expect(latteVaultAsReinvestor.harvest())
          .to.emit(latteVault, "Harvest")
          .withArgs(await farmer.getAddress(), 0)
          .to.emit(latteVault, "TransferPerformanceFee")
          .withArgs(await farmer.getAddress(), 0);
      });
    });

    context("when harvest with reward", () => {
      it("should successfully harvest", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        const snapshotBlock = await latestBlockNumber();

        // MOCK master barista storages
        await masterBarista.smodify.put({
          poolInfo: {
            [latteToken.address]: {
              lastRewardBlock: snapshotBlock,
              accLattePerShare: parseUnits("10", 12).toString(),
            },
          },
          userInfo: {
            [latteToken.address]: {
              [latteVault.address]: {
                amount: parseEther("10").toString(),
                fundedBy: latteVault.address,
              },
            },
          },
        });
        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther("100"));
        await latteToken.transfer(ownerAddress, parseEther("50"));

        await SimpleToken__factory.connect(latteToken.address, alice).approve(latteVault.address, parseEther("50"));
        await expect(
          latteVaultAsReinvestor.harvest(),
          "the reward should be 10(LATTE per share) * 10 (amount) = 100 - 2.25 from performance fee"
        )
          .to.emit(latteVault, "Harvest")
          .withArgs(await farmer.getAddress(), parseEther("97.75"))
          .to.emit(latteVault, "TransferPerformanceFee")
          .withArgs(await farmer.getAddress(), parseEther("2.25"));
        expect(
          (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address)).amount,
          "latte vault is expected to have 100 LATTE from reinvest"
        ).to.eq(parseEther("107.75"));
      });
    });
  });

  describe("#deposit()", () => {
    context("when there is no reward to harvest", () => {
      it("should be able to stake", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        const snapshotBlock = await latestBlockNumber();

        // MOCK master barista storages
        await masterBarista.smodify.put({
          poolInfo: {
            [latteToken.address]: {
              lastRewardBlock: snapshotBlock,
              accLattePerShare: parseUnits("10", 12).toString(),
            },
          },
        });

        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther("100"));
        // Mint some staking token to owner
        await latteToken.transfer(ownerAddress, parseEther("100"));
        await SimpleToken__factory.connect(latteToken.address, alice).approve(latteVault.address, parseEther("100"));

        await latteVaultAsAlice.deposit(parseEther("100"));
        expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther("0"));
        expect(
          (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address)).amount,
          "latteVault should be an owner of this 100 LATTE"
        ).to.eq(parseEther("100"));
        expect(await latteVault.available(), "latte vault balance should be 0 LATTE").to.eq(parseEther("0"));
        expect(await beanBag.balanceOf(ownerAddress), "bean bag should be sent to the user with 100 BEAN").to.eq(
          parseEther("100")
        );
        expect(await latteVault.totalShares(), "total shares should be 100 LATTE").to.eq(parseEther("100"));
      });

      context("when there are multiple depositors", () => {
        it("should distribute the share correctly", () => {
          it("should be able to stake", async () => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress();
            const snapshotBlock = await latestBlockNumber();

            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [latteToken.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits("10", 12).toString(),
                },
              },
            });

            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther("100"));
            // Mint some staking token to owner
            await latteToken.transfer(ownerAddress, parseEther("100"));
            await SimpleToken__factory.connect(latteToken.address, alice).approve(
              latteVault.address,
              parseEther("100")
            );

            await latteVaultAsAlice.deposit(parseEther("100"));
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther("0"));
            expect(
              (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address))
                .amount,
              "latteVault should be an owner of this 100 LATTE"
            ).to.eq(parseEther("100"));
            expect(await latteVault.available(), "latte vault balance should be 0 LATTE").to.eq(parseEther("0"));
            expect(await beanBag.balanceOf(ownerAddress), "bean bag should be sent to the user with 100 BEAN").to.eq(
              parseEther("100")
            );
            expect(await latteVault.totalShares(), "total shares should be 100 LATTE").to.eq(parseEther("100"));

            await latteVaultAsOther.deposit(parseEther("100"));
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther("0"));
            expect(
              (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address))
                .amount,
              "latteVault should be an owner of this 200 LATTE"
            ).to.eq(parseEther("200"));
            expect(await latteVault.available(), "latte vault balance should be 0 LATTE").to.eq(parseEther("0"));
            expect(
              await beanBag.balanceOf(await dev.getAddress()),
              "bean bag should be sent to the user with 100 BEAN"
            ).to.eq(parseEther("100"));
            expect(await latteVault.totalShares(), "total shares should be 200 LATTE").to.eq(parseEther("200"));
          });
        });
      });
    });

    context("when there is a reward to harvest", () => {
      it("should stake a token with harvest a reward", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        const snapshotBlock = await latestBlockNumber();

        // MOCK master barista storages
        await masterBarista.smodify.put({
          poolInfo: {
            [latteToken.address]: {
              lastRewardBlock: snapshotBlock,
              accLattePerShare: parseUnits("10", 12).toString(),
            },
          },
          userInfo: {
            [latteToken.address]: {
              [latteVault.address]: {
                amount: parseEther("10").toString(),
                fundedBy: latteVault.address,
              },
            },
          },
        });
        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther("100"));
        await latteToken.transfer(ownerAddress, parseEther("50"));

        await SimpleToken__factory.connect(latteToken.address, alice).approve(latteVault.address, parseEther("50"));
        await latteVaultAsAlice.deposit(parseEther("50"));
        expect(await latteVaultAsAlice.totalShares(), "total shares should be 50 LATTE").to.eq(parseEther("50"));
        expect(await beanBag.balanceOf(ownerAddress), "bean bag of the owner should be 50 BEAN").to.eq(
          parseEther("50")
        );
        expect((await latteVault.userInfo(ownerAddress)).shares, "user shares should be 50 LATTE").to.eq(
          parseEther("50")
        );
        expect(
          await latteVault.getPricePerFullShare(),
          "price per full share should be (60 (from stake) + 100 * (1 - 0.0225) (from harvest)) / 50 (shares) = 3.155"
        ).to.eq(parseEther("3.155"));
        expect(await latteToken.balanceOf(latteVault.address), "latte of address should be 0").to.eq(parseEther("0"));
        expect(
          (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address)).amount,
          "latte vault is expected to have 157.75 LATTE stake amount from (60 (from stake) + 100 * (1 - 0.0225) (from harvest))"
        ).to.eq(parseEther("157.75"));
      });

      context("when there are multiple depositors", () => {
        it("should distribute the share correctly", () => {
          it("should be able to stake", async () => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress();
            const snapshotBlock = await latestBlockNumber();

            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [latteToken.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits("10", 12).toString(),
                },
              },
              userInfo: {
                [latteToken.address]: {
                  [latteVault.address]: {
                    amount: parseEther("10").toString(),
                    fundedBy: latteVault.address,
                  },
                },
              },
            });
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther("100"));
            await latteToken.transfer(ownerAddress, parseEther("50"));
            await latteToken.transfer(await dev.getAddress(), parseEther("100"));

            await SimpleToken__factory.connect(latteToken.address, alice).approve(latteVault.address, parseEther("50"));
            // Alice deposit for 50 LATTE
            await latteVaultAsAlice.deposit(parseEther("50"));
            expect(await latteVaultAsAlice.totalShares(), "total shares should be 50 LATTE").to.eq(parseEther("50"));
            expect(await beanBag.balanceOf(ownerAddress), "bean bag of the owner should be 50 BEAN").to.eq(
              parseEther("50")
            );
            expect((await latteVault.userInfo(ownerAddress)).shares, "user shares should be 50 LATTE").to.eq(
              parseEther("50")
            );
            expect(
              await latteVault.getPricePerFullShare(),
              "price per full share should be (60 (from stake) + 100 * (1 - 0.0225) (from harvest)) / 50 (shares) = 3.155"
            ).to.eq(parseEther("3.155"));
            expect(await latteToken.balanceOf(latteVault.address), "latte of address should be 0").to.eq(
              parseEther("0")
            );
            expect(
              (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address))
                .amount,
              "latte vault is expected to have 157.75 LATTE stake amount from (60 (from stake) + 100 * (1 - 0.0225) (from harvest))"
            ).to.eq(parseEther("157.75"));

            // other users deposit for 100 LATTE
            await latteVaultAsOther.deposit(parseEther("100"));
            expect(await latteVaultAsAlice.totalShares(), "total shares should be 50 + 31.6957210777").to.eq(
              parseEther("81.6957210777")
            );
            expect(
              await beanBag.balanceOf(await dev.getAddress()),
              "bean bag of the other user should be 100 BEAN"
            ).to.eq(parseEther("100"));
            expect((await latteVaultAsAlice.userInfo(ownerAddress)).shares).to.eq("50");
            expect(
              (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address))
                .amount,
              "user shares should be 257.75 LATTE"
            ).to.eq(parseEther("257.75"));
            expect(
              (await latteVaultAsOther.userInfo(await dev.getAddress())).shares,
              "other shares should be 100 * 50 / 157.75 = 31.6957210777"
            ).to.eq("31.6957210777");
          });
        });
      });
    });
  });

  describe("#withdraw()", () => {
    context("when the last deposit is within a withdraw fee period", () => {
      it("should be able to withdraw with some portion lost from withdrawal fee", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        const snapshotBlock = await latestBlockNumber();

        // MOCK master barista storages
        await masterBarista.smodify.put({
          totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
          poolInfo: {
            [latteToken.address]: {
              lastRewardBlock: snapshotBlock.sub(7).toString(), // want to have a gap between last reward block and unstake block
            },
          },
          userInfo: {
            [latteToken.address]: {
              [latteVault.address]: {
                amount: parseEther("10").toString(),
                fundedBy: latteVault.address,
              },
            },
          },
        });

        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther("100"));
        await latteToken.transfer(masterBarista.address, parseEther("10"));
        await beanBag.smodify.put({
          _balances: {
            [latteVault.address]: parseEther("100").toString(),
          },
          _totalSupply: parseEther("100").toString(),
        });
        // Mint some staking token to owner
        await latteToken.transfer(ownerAddress, parseEther("100"));
        await SimpleToken__factory.connect(latteToken.address, alice).approve(latteVault.address, parseEther("100"));
        await latteVaultAsAlice.deposit(parseEther("100"));
        expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther("0"));
        expect(
          (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address)).amount,
          "latteVault should be an owner of this 100 LATTE + 10 (previous amount)"
        ).to.eq(parseEther("110"));
        expect(await latteVault.available(), "latte vault balance should be 0 LATTE").to.eq(parseEther("0"));
        expect(await beanBag.balanceOf(ownerAddress), "bean bag should be sent to the user with 100 BEAN").to.eq(
          parseEther("100")
        );
        expect(await latteVault.totalShares(), "total shares should be 100 LATTE").to.eq(parseEther("100"));
        const userShares = (await latteVaultAsAlice.userInfo(ownerAddress)).shares;
        await beanBagAsAlice.approve(latteVault.address, constants.MaxUint256);
        await expect(
          latteVaultAsAlice.withdraw(userShares),
          "expect to revert with tiny shares if all shares has been withdrawn"
        ).to.revertedWith("LatteVault::deposit::no tiny shares");
        await expect(
          latteVaultAsAlice.withdraw(userShares.sub(parseEther("0.2"))),
          "expect to emit withdraw with 99.8 shares and (99.8 * 110 / 100) = 109.78 * 99.9% = 109.67022"
        )
          .to.emit(latteVault, "Withdraw")
          .withArgs(ownerAddress, parseEther("109.67022"), parseEther("99.8"));
        expect(await beanBag.balanceOf(ownerAddress), "bean bag should be sent to the user with 100 BEAN").to.eq(
          parseEther("0.2")
        );
      });
    });

    context("when the last deposit is not within a withdraw fee period", () => {
      it("should be able to withdraw with some portion lost from withdrawal fee", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        const snapshotBlock = await latestBlockNumber();

        // MOCK master barista storages
        await masterBarista.smodify.put({
          totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
          poolInfo: {
            [latteToken.address]: {
              lastRewardBlock: snapshotBlock.sub(7).toString(), // want to have a gap between last reward block and unstake block
            },
          },
          userInfo: {
            [latteToken.address]: {
              [latteVault.address]: {
                amount: parseEther("10").toString(),
                fundedBy: latteVault.address,
              },
            },
          },
        });

        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther("100"));
        await latteToken.transfer(masterBarista.address, parseEther("10"));
        await beanBag.smodify.put({
          _balances: {
            [latteVault.address]: parseEther("100").toString(),
          },
          _totalSupply: parseEther("100").toString(),
        });
        // Mint some staking token to owner
        await latteToken.transfer(ownerAddress, parseEther("100"));
        await SimpleToken__factory.connect(latteToken.address, alice).approve(latteVault.address, parseEther("100"));
        await latteVaultAsAlice.deposit(parseEther("100"));
        expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther("0"));
        expect(
          (await (masterBarista as unknown as MasterBarista).userInfo(latteToken.address, latteVault.address)).amount,
          "latteVault should be an owner of this 100 LATTE + 10 (previous amount)"
        ).to.eq(parseEther("110"));
        expect(await latteVault.available(), "latte vault balance should be 0 LATTE").to.eq(parseEther("0"));
        expect(await beanBag.balanceOf(ownerAddress), "bean bag should be sent to the user with 100 BEAN").to.eq(
          parseEther("100")
        );
        expect(await latteVault.totalShares(), "total shares should be 100 LATTE").to.eq(parseEther("100"));
        const userShares = (await latteVaultAsAlice.userInfo(ownerAddress)).shares;
        await beanBagAsAlice.approve(latteVault.address, constants.MaxUint256);

        await increase(duration.hours(BigNumber.from(72)));
        await expect(
          latteVaultAsAlice.withdraw(userShares),
          "expect to revert with tiny shares if all shares has been withdrawn"
        ).to.revertedWith("LatteVault::deposit::no tiny shares");
        await expect(
          latteVaultAsAlice.withdraw(userShares.sub(parseEther("0.2"))),
          "expect to emit withdraw with 99.8 shares and (99.8 * 110 / 100) = 109.78"
        )
          .to.emit(latteVault, "Withdraw")
          .withArgs(ownerAddress, parseEther("109.78"), parseEther("99.8"));
        expect(await beanBag.balanceOf(ownerAddress), "bean bag should be sent to the user with 100 BEAN").to.eq(
          parseEther("0.2")
        );
      });
    });
  });
});
