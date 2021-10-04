import { ethers, waffle } from "hardhat";
import { Overrides, Signer, BigNumberish, utils, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BeanBag,
  BeanBagV2,
  BeanBag__factory,
  LATTE,
  LATTEV2,
  LATTE__factory,
  MasterBarista,
  MasterBarista__factory,
  MockStakeTokenCallerContract,
  SimpleToken,
  SimpleToken__factory,
} from "../../typechain";
import { assertAlmostEqual } from "../helpers/assert";
import { advanceBlock, advanceBlockTo, latestBlockNumber } from "../helpers/time";
import { masterBaristaUnitTestFixture } from "../helpers/fixtures/MasterBarista";
import exp from "constants";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { parseEther } from "ethers/lib/utils";

chai.use(solidity);
const { expect } = chai;

describe("MasterBarista", () => {
  // Contract as Signer
  let masterBaristaAsAlice: MasterBarista;

  let mockStakeTokenCaller: MockStakeTokenCallerContract;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let dev: Signer;

  // from fixtures
  let latteToken: LATTE;
  let beanBag: BeanBag;
  let latteV2: LATTEV2;
  let beanV2: BeanBagV2;
  let masterBarista: MasterBarista;
  let stakingTokens: SimpleToken[];

  beforeEach(async () => {
    ({ latteToken, beanBag, masterBarista, stakingTokens, mockStakeTokenCaller, latteV2, beanV2 } =
      await waffle.loadFixture(masterBaristaUnitTestFixture));
    [deployer, alice, bob, dev] = await ethers.getSigners();

    masterBaristaAsAlice = MasterBarista__factory.connect(masterBarista.address, alice);
  });

  describe("#setpool()", () => {
    context("when adding a new pool", () => {
      it("should add new pool and update pool having a bps alloc point", async () => {
        /// poolAlloc -> alloc point for each of new pools
        const poolAlloc = 1000;
        /// totalAllco point started with 1000 due to LATTE->LATTE start with 1000 alloc point
        for (let i = 0; i < stakingTokens.length; i++) {
          await masterBarista.addPool(stakingTokens[i].address, poolAlloc);

          /// Everytime that the new pool is added, the following conditions must be satisfied:
          /// - Expect to have i + 2 pools => +1 come from new pool added and +1 come from LATTE->LATTE pool
          /// - Expect that LATTE->LATTE pool to have 40% of total alloc point
          /// - Expect to have correct "poolAlloc" and "lastRewardBlock"
          const totalAlloc = await masterBarista.totalAllocPoint();
          const [latteAllocPoint, , , , allocBps] = await masterBarista.poolInfo(latteToken.address);
          const [stokenAllocPoint, stokenLastRewardBlock, , ,] = await masterBarista.poolInfo(stakingTokens[i].address);

          expect(await masterBarista.poolLength()).to.eq(i + 2);
          assertAlmostEqual(latteAllocPoint.mul(10000).div(totalAlloc).toString(), allocBps.toString());
          expect(stokenAllocPoint).to.be.eq(poolAlloc);
          expect(stokenLastRewardBlock).to.be.eq(stokenLastRewardBlock);
        }
        expect(await masterBarista.activeBean()).to.eq(beanBag.address);
        expect(await masterBarista.activeLatte()).to.eq(latteToken.address);
      });
    });

    context("when the stakeToken is already added to the pool", () => {
      it("should revert", async () => {
        /// poolAlloc -> alloc point for each of new pools
        const poolAlloc = 1000;
        for (let i = 0; i < stakingTokens.length; i++) {
          await masterBarista.addPool(stakingTokens[i].address, poolAlloc);
        }
        expect(await masterBarista.poolLength()).to.eq(stakingTokens.length + 1);

        await expect(masterBarista.addPool(stakingTokens[0].address, poolAlloc)).to.be.revertedWith(
          "MasterBarista::addPool::_stakeToken duplicated"
        );
      });
    });

    context("when the admin try to add address(0)", () => {
      it("should revert", async () => {
        await expect(masterBarista.addPool(ethers.constants.AddressZero, 1000)).to.be.revertedWith(
          "MasterBarista::addPool::_stakeToken must not be address(0) or address(1)"
        );
      });
    });

    context("when the admin try to add address(1)", () => {
      it("should revert", async () => {
        await expect(masterBarista.addPool("0x0000000000000000000000000000000000000001", 1000)).to.be.revertedWith(
          "MasterBarista::addPool::_stakeToken must not be address(0) or address(1)"
        );
      });
    });

    context("when the admin try to add duplicated token", () => {
      it("should revert", async () => {
        await expect(masterBarista.addPool(latteToken.address, 1000)).to.be.revertedWith(
          "MasterBarista::addPool::_stakeToken duplicated"
        );
      });
    });

    context("when admin try to set address(0)", () => {
      it("should revert", async () => {
        await expect(masterBarista.setPool(ethers.constants.AddressZero, 1000)).to.be.revertedWith(
          "MasterBarista::setPool::_stakeToken must not be address(0) or address(1)"
        );
      });
    });

    context("when admin try to add address(1)", () => {
      it("should revert", async () => {
        await expect(masterBarista.setPool("0x0000000000000000000000000000000000000001", 1000)).to.be.revertedWith(
          "MasterBarista::setPool::_stakeToken must not be address(0) or address(1)"
        );
      });
    });
  });

  describe("#setPoolAllocBps()", () => {
    context("when stake token is address(0)", () => {
      it("should revert", async () => {
        await expect(masterBarista.setPoolAllocBps(ethers.constants.AddressZero, 1000)).to.be.revertedWith(
          "MasterBarista::setPoolAllocBps::_stakeToken must not be address(0) or address(1)"
        );
      });
    });

    context("when stake token is address(1)", () => {
      it("should revert", async () => {
        await expect(
          masterBarista.setPoolAllocBps("0x0000000000000000000000000000000000000001", 1000)
        ).to.be.revertedWith("MasterBarista::setPoolAllocBps::_stakeToken must not be address(0) or address(1)");
      });
    });

    context("when the pool hasn't been set", () => {
      it("should revert", async () => {
        await expect(masterBarista.setPoolAllocBps(stakingTokens[0].address, 1000)).to.be.revertedWith(
          "MasterBarista::setPoolAllocBps::pool hasn't been set"
        );
      });
    });

    context("when accumulated accum alloc bps is more than 10000", () => {
      it("should revert", async () => {
        masterBarista.addPool(stakingTokens[0].address, 1000);
        const totalBps = (await masterBarista.poolInfo(latteToken.address)).allocBps.add(6001);
        expect(totalBps).to.eq(10001);
        // latte pool takes 40% since the initialization
        await expect(masterBarista.setPoolAllocBps(stakingTokens[0].address, 6001)).to.be.revertedWith(
          "MasterBarista::setPoolallocBps::accumAllocBps must < 10000"
        );
      });
    });

    context("when accumulated accum alloc bps equals 10000", () => {
      it("should revert", async () => {
        masterBarista.addPool(stakingTokens[0].address, 1000);
        expect((await masterBarista.poolInfo(latteToken.address)).allocBps.add(BigNumber.from(6000))).to.eq(
          BigNumber.from(10000)
        );
        // latte pool takes 40% since the initialization
        await expect(masterBarista.setPoolAllocBps(stakingTokens[0].address, 6000)).to.be.revertedWith(
          "MasterBarista::setPoolallocBps::accumAllocBps must < 10000"
        );
      });
    });

    context("when all parameters are valid", () => {
      context("with existing pool alloc bps cover all 10000 bps", () => {
        it("should successfully update total alloc points regardless of any previous bps of the pool", async () => {
          masterBarista.addPool(stakingTokens[0].address, 1000);
          masterBarista.addPool(stakingTokens[1].address, 1000);
          // latte pool takes 40% since the initialization
          masterBarista.setPoolAllocBps(stakingTokens[1].address, 5999);
          masterBarista.setPoolAllocBps(stakingTokens[1].address, 5000);
          let lattePool = await masterBarista.poolInfo(latteToken.address);
          let stakeToken0Pool = await masterBarista.poolInfo(stakingTokens[0].address);
          let stakeToken1Pool = await masterBarista.poolInfo(stakingTokens[1].address);
          let totalAllocPoint = await masterBarista.totalAllocPoint();

          expect(lattePool.allocBps).to.eq(4000);
          expect(lattePool.allocPoint).to.eq(4000);
          expect(stakeToken0Pool.allocBps).to.eq(0);
          expect(stakeToken0Pool.allocPoint).to.eq(1000);
          expect(stakeToken1Pool.allocBps).to.eq(5000);
          expect(stakeToken1Pool.allocPoint).to.eq(5000);
          expect(totalAllocPoint).to.eq(10000);

          // reset to 0
          masterBarista.setPoolAllocBps(stakingTokens[1].address, 0);
          lattePool = await masterBarista.poolInfo(latteToken.address);
          stakeToken0Pool = await masterBarista.poolInfo(stakingTokens[0].address);
          stakeToken1Pool = await masterBarista.poolInfo(stakingTokens[1].address);
          totalAllocPoint = await masterBarista.totalAllocPoint();

          expect(lattePool.allocBps).to.eq(4000);
          expect(lattePool.allocPoint).to.eq(666);
          expect(stakeToken0Pool.allocBps).to.eq(0);
          expect(stakeToken0Pool.allocPoint).to.eq(1000);
          expect(stakeToken1Pool.allocBps).to.eq(0);
          expect(stakeToken1Pool.allocPoint).to.eq(0);
          expect(totalAllocPoint).to.eq(1666);

          masterBarista.setPoolAllocBps(stakingTokens[1].address, 3000);
          lattePool = await masterBarista.poolInfo(latteToken.address);
          stakeToken0Pool = await masterBarista.poolInfo(stakingTokens[0].address);
          stakeToken1Pool = await masterBarista.poolInfo(stakingTokens[1].address);
          totalAllocPoint = await masterBarista.totalAllocPoint();

          expect(lattePool.allocBps).to.eq(4000);
          expect(lattePool.allocPoint).to.eq(1333);
          expect(stakeToken0Pool.allocBps).to.eq(0);
          expect(stakeToken0Pool.allocPoint).to.eq(1000);
          expect(stakeToken1Pool.allocBps).to.eq(3000);
          expect(stakeToken1Pool.allocPoint).to.eq(1000);
          expect(totalAllocPoint).to.eq(3333);
        });
      });
      it("should successfully update total alloc points", async () => {
        masterBarista.addPool(stakingTokens[0].address, 1000);
        masterBarista.addPool(stakingTokens[1].address, 1000);
        // latte pool takes 40% since the initialization
        masterBarista.setPoolAllocBps(stakingTokens[1].address, 5000);
        let lattePool = await masterBarista.poolInfo(latteToken.address);
        let stakeToken0Pool = await masterBarista.poolInfo(stakingTokens[0].address);
        let stakeToken1Pool = await masterBarista.poolInfo(stakingTokens[1].address);
        let totalAllocPoint = await masterBarista.totalAllocPoint();

        expect(lattePool.allocBps).to.eq(4000);
        expect(lattePool.allocPoint).to.eq(4000);
        expect(stakeToken0Pool.allocBps).to.eq(0);
        expect(stakeToken0Pool.allocPoint).to.eq(1000);
        expect(stakeToken1Pool.allocBps).to.eq(5000);
        expect(stakeToken1Pool.allocPoint).to.eq(5000);
        expect(totalAllocPoint).to.eq(10000);

        // reset to 0
        masterBarista.setPoolAllocBps(stakingTokens[1].address, 0);
        lattePool = await masterBarista.poolInfo(latteToken.address);
        stakeToken0Pool = await masterBarista.poolInfo(stakingTokens[0].address);
        stakeToken1Pool = await masterBarista.poolInfo(stakingTokens[1].address);
        totalAllocPoint = await masterBarista.totalAllocPoint();

        expect(lattePool.allocBps).to.eq(4000);
        expect(lattePool.allocPoint).to.eq(666);
        expect(stakeToken0Pool.allocBps).to.eq(0);
        expect(stakeToken0Pool.allocPoint).to.eq(1000);
        expect(stakeToken1Pool.allocBps).to.eq(0);
        expect(stakeToken1Pool.allocPoint).to.eq(0);
        expect(totalAllocPoint).to.eq(1666);

        masterBarista.setPoolAllocBps(stakingTokens[1].address, 3000);
        lattePool = await masterBarista.poolInfo(latteToken.address);
        stakeToken0Pool = await masterBarista.poolInfo(stakingTokens[0].address);
        stakeToken1Pool = await masterBarista.poolInfo(stakingTokens[1].address);
        totalAllocPoint = await masterBarista.totalAllocPoint();

        expect(lattePool.allocBps).to.eq(4000);
        expect(lattePool.allocPoint).to.eq(1333);
        expect(stakeToken0Pool.allocBps).to.eq(0);
        expect(stakeToken0Pool.allocPoint).to.eq(1000);
        expect(stakeToken1Pool.allocBps).to.eq(3000);
        expect(stakeToken1Pool.allocPoint).to.eq(1000);
        expect(totalAllocPoint).to.eq(3333);
      });
    });
  });

  describe("#harvest()", () => {
    context("the caller is not a funder", () => {
      it("should revert", async () => {
        await stakingTokens[0].mint(mockStakeTokenCaller.address, parseEther("100"));
        await masterBarista.addPool(stakingTokens[0].address, 1000);
        await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
        await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, mockStakeTokenCaller.address);
        mockStakeTokenCaller.stake(stakingTokens[0].address, ethers.utils.parseEther("100"));
        await expect(
          masterBarista["harvest(address,address)"](await deployer.getAddress(), latteToken.address)
        ).to.be.revertedWith("MasterBarista::_harvest::only funder");
      });
    });

    context("when harvesting through a stake token caller contract", () => {
      it("should notify a _onBeforeLock", async () => {
        const currentBlock = await latestBlockNumber();
        await stakingTokens[0].mint(mockStakeTokenCaller.address, parseEther("100"));
        await masterBarista.addPool(stakingTokens[0].address, 1000);
        await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
        await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, mockStakeTokenCaller.address);
        mockStakeTokenCaller.stake(stakingTokens[0].address, ethers.utils.parseEther("100"));

        await advanceBlockTo(currentBlock.add(10).toNumber());

        await expect(mockStakeTokenCaller.harvest(stakingTokens[0].address)).to.emit(
          mockStakeTokenCaller,
          "OnBeforeLock"
        );
        expect(await masterBarista.activeBean()).to.eq(beanBag.address);
        expect(await masterBarista.activeLatte()).to.eq(latteToken.address);
      });
    });
  });

  describe("#setStakeTokenCallerAllowancePool()", () => {
    it("should set an allowance based on an argument", async () => {
      await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
      expect(await masterBarista.stakeTokenCallerAllowancePool(stakingTokens[0].address)).to.eq(true);
      await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, false);
      expect(await masterBarista.stakeTokenCallerAllowancePool(stakingTokens[0].address)).to.eq(false);
    });
  });

  describe("#addStakeTokenCallerContract", () => {
    context("when the pool does not allow adding a corresponding stake token caller", () => {
      it("should revert", async () => {
        const stakeCallerContract = await alice.getAddress();
        await expect(masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, stakeCallerContract)).to.be
          .reverted;
      });
    });

    context("when the pool allowed adding a corresponding stake token caller", () => {
      it("should successfully add a new pool", async () => {
        await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
        await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, await alice.getAddress());
        let callerCount = await masterBarista.stakeTokenCallerContracts(stakingTokens[0].address);
        expect(callerCount).to.eq(1);
        await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, await bob.getAddress());
        callerCount = await masterBarista.stakeTokenCallerContracts(stakingTokens[0].address);
        expect(callerCount).to.eq(2);
        await masterBarista.removeStakeTokenCallerContract(stakingTokens[0].address, await bob.getAddress());
        callerCount = await masterBarista.stakeTokenCallerContracts(stakingTokens[0].address);
        expect(callerCount).to.eq(1);
        await masterBarista.removeStakeTokenCallerContract(stakingTokens[0].address, await alice.getAddress());
        callerCount = await masterBarista.stakeTokenCallerContracts(stakingTokens[0].address);
        expect(callerCount).to.eq(0);
      });
    });
  });

  describe("#deposit()", () => {
    context("when the pool has been assigned as stakeTokenCallerPool through stakeTokenCallerAllowancePool", () => {
      context("when the caller is not a stake token caller contract", () => {
        it("should revert", async () => {
          // pretend that alice is a stake caller contract
          const stakeCallerContract = await alice.getAddress();
          await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
          await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, stakeCallerContract);
          await expect(
            masterBarista.deposit(await deployer.getAddress(), stakingTokens[0].address, ethers.utils.parseEther("100"))
          ).to.be.revertedWith("MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
        });
      });

      context("when the caller is a stake token caller contract", () => {
        it("should successfully deposit", async () => {
          const stakingToken0AsAlice = SimpleToken__factory.connect(stakingTokens[0].address, alice);
          // pretend that alice is a stake caller contract
          await stakingTokens[0].mint(await alice.getAddress(), parseEther("200"));
          await stakingToken0AsAlice.approve(masterBarista.address, parseEther("200"));

          const stakeCallerContract = await alice.getAddress();
          await masterBarista.addPool(stakingTokens[0].address, 1000);
          await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
          await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, stakeCallerContract);
          const tx = await masterBaristaAsAlice.deposit(
            await deployer.getAddress(),
            stakingTokens[0].address,
            ethers.utils.parseEther("100")
          );

          const userInfo = await masterBarista.userInfo(stakingTokens[0].address, await deployer.getAddress());
          const poolInfo = await masterBarista.poolInfo(stakingTokens[0].address);
          expect(userInfo.amount).to.eq(ethers.utils.parseEther("100"));
          expect(userInfo.fundedBy).to.eq(await alice.getAddress());
          expect(poolInfo.lastRewardBlock).to.eq(tx.blockNumber);
        });
      });

      context("when the caller has been revoked after the first deposit", () => {
        it("should revert", async () => {
          const stakingToken0AsAlice = SimpleToken__factory.connect(stakingTokens[0].address, alice);
          // pretend that alice is a stake caller contract
          await stakingTokens[0].mint(await alice.getAddress(), parseEther("200"));
          await stakingToken0AsAlice.approve(masterBarista.address, parseEther("200"));

          const stakeCallerContract = await alice.getAddress();
          await masterBarista.addPool(stakingTokens[0].address, 1000);
          await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
          await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, stakeCallerContract);
          await masterBaristaAsAlice.deposit(
            await deployer.getAddress(),
            stakingTokens[0].address,
            ethers.utils.parseEther("100")
          );

          // when revoke a stakeCallerContract, shouldn't be able to call a deposit
          await expect(masterBarista.removeStakeTokenCallerContract(stakingTokens[0].address, stakeCallerContract)).not
            .to.be.reverted;
          await expect(
            masterBaristaAsAlice.deposit(
              await deployer.getAddress(),
              stakingTokens[0].address,
              ethers.utils.parseEther("100")
            )
          ).to.be.revertedWith("MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
        });
      });
    });

    context("when the pool hasn't been assigned as stakeTokenCallerPool", () => {
      context("when the caller is not a _for", () => {
        it("should revert", async () => {
          await expect(
            masterBarista.deposit(await alice.getAddress(), stakingTokens[0].address, ethers.utils.parseEther("100"))
          ).to.be.revertedWith("MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
        });
      });

      context("when the caller is the same as _for", () => {
        it("should successfully deposit", async () => {
          await stakingTokens[0].mint(await deployer.getAddress(), parseEther("200"));
          await stakingTokens[0].approve(masterBarista.address, parseEther("200"));

          await masterBarista.addPool(stakingTokens[0].address, 1000);
          const tx = await masterBarista.deposit(
            await deployer.getAddress(),
            stakingTokens[0].address,
            ethers.utils.parseEther("100")
          );

          const userInfo = await masterBarista.userInfo(stakingTokens[0].address, await deployer.getAddress());
          const poolInfo = await masterBarista.poolInfo(stakingTokens[0].address);
          expect(userInfo.amount).to.eq(ethers.utils.parseEther("100"));
          expect(userInfo.fundedBy).to.eq(await deployer.getAddress());
          expect(poolInfo.lastRewardBlock).to.eq(tx.blockNumber);
          expect(await masterBarista.activeBean()).to.eq(beanBag.address);
          expect(await masterBarista.activeLatte()).to.eq(latteToken.address);
        });
      });
    });
    context("when the pool is not existed", () => {
      it("should revert", async () => {
        await expect(
          masterBarista.deposit(await deployer.getAddress(), stakingTokens[0].address, ethers.utils.parseEther("100"))
        ).to.be.revertedWith("MasterBarista::deposit::no pool");
      });
    });
    context("when the pool is latte", () => {
      it("should revert", async () => {
        await expect(
          masterBarista.deposit(await deployer.getAddress(), latteToken.address, ethers.utils.parseEther("100"))
        ).to.be.revertedWith("MasterBarista::deposit::use depositLatte instead");
      });
    });
  });

  describe("#depositLatte()", () => {
    context("when the pool has been assigned as stakeTokenCallerPool through stakeTokenCallerAllowancePool", () => {
      context("when the caller is not a stake token caller contract", () => {
        it("should revert", async () => {
          // pretend that alice is a stake caller contract
          const stakeCallerContract = await alice.getAddress();
          await masterBarista.setStakeTokenCallerAllowancePool(latteToken.address, true);
          await masterBarista.addStakeTokenCallerContract(latteToken.address, stakeCallerContract);
          await expect(
            masterBarista.depositLatte(await deployer.getAddress(), ethers.utils.parseEther("100"))
          ).to.be.revertedWith("MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
        });
      });

      context("when the caller is a stake token caller contract", () => {
        it("should successfully deposit", async () => {
          const stakingToken0AsAlice = SimpleToken__factory.connect(latteToken.address, alice);
          // pretend that alice is a stake caller contract
          await latteToken.transfer(await alice.getAddress(), parseEther("200"));
          await stakingToken0AsAlice.approve(masterBarista.address, parseEther("200"));

          const stakeCallerContract = await alice.getAddress();
          await masterBarista.setStakeTokenCallerAllowancePool(latteToken.address, true);
          await masterBarista.addStakeTokenCallerContract(latteToken.address, stakeCallerContract);
          const tx = await masterBaristaAsAlice.depositLatte(
            await deployer.getAddress(),
            ethers.utils.parseEther("100")
          );

          const userInfo = await masterBarista.userInfo(latteToken.address, await deployer.getAddress());
          const poolInfo = await masterBarista.poolInfo(latteToken.address);
          expect(userInfo.amount).to.eq(ethers.utils.parseEther("100"));
          expect(userInfo.fundedBy).to.eq(await alice.getAddress());
          expect(poolInfo.lastRewardBlock).to.eq(tx.blockNumber);
          expect(await masterBarista.activeBean()).to.eq(beanBag.address);
          expect(await masterBarista.activeLatte()).to.eq(latteToken.address);
        });
      });

      context("when the caller has been revoked after the first deposit", () => {
        it("should revert", async () => {
          const latteTokenAsAlice = LATTE__factory.connect(latteToken.address, alice);
          // pretend that alice is a stake caller contract
          await latteToken.transfer(await alice.getAddress(), parseEther("200"));
          await latteTokenAsAlice.approve(masterBarista.address, parseEther("200"));

          const stakeCallerContract = await alice.getAddress();
          await masterBarista.setStakeTokenCallerAllowancePool(latteToken.address, true);
          await masterBarista.addStakeTokenCallerContract(latteToken.address, stakeCallerContract);
          await masterBaristaAsAlice.depositLatte(await deployer.getAddress(), ethers.utils.parseEther("100"));

          // when revoke a stakeCallerContract, shouldn't be able to call a deposit
          await masterBarista.removeStakeTokenCallerContract(latteToken.address, stakeCallerContract);
          await expect(
            masterBaristaAsAlice.depositLatte(await deployer.getAddress(), ethers.utils.parseEther("100"))
          ).to.be.revertedWith("MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
        });
      });
    });

    context("when the pool hasn't been assigned as stakeTokenCallerPool", () => {
      context("when the caller is not a _for", () => {
        it("should revert", async () => {
          await expect(
            masterBarista.depositLatte(await alice.getAddress(), ethers.utils.parseEther("100"))
          ).to.be.revertedWith("MasterBarista::onlyPermittedTokenFunder: caller is not permitted");
        });
      });

      context("when the caller is the same as _for", () => {
        it("should successfully deposit", async () => {
          await latteToken.approve(masterBarista.address, parseEther("200"));

          const tx = await masterBarista.depositLatte(await deployer.getAddress(), ethers.utils.parseEther("100"));

          const userInfo = await masterBarista.userInfo(latteToken.address, await deployer.getAddress());
          const poolInfo = await masterBarista.poolInfo(latteToken.address);
          expect(userInfo.amount).to.eq(ethers.utils.parseEther("100"));
          expect(userInfo.fundedBy).to.eq(await deployer.getAddress());
          expect(poolInfo.lastRewardBlock).to.eq(tx.blockNumber);
          expect(await masterBarista.activeBean()).to.eq(beanBag.address);
          expect(await masterBarista.activeLatte()).to.eq(latteToken.address);
        });
      });
    });
  });

  describe("#emergencyWithdraw", () => {
    it("should return a stake token to _for rather than msg sender", async () => {
      const stakingToken0AsAlice = SimpleToken__factory.connect(stakingTokens[0].address, alice);
      // pretend that alice is a stake caller contract
      await stakingTokens[0].mint(await alice.getAddress(), parseEther("200"));
      await stakingToken0AsAlice.approve(masterBarista.address, parseEther("200"));

      const stakeCallerContract = await alice.getAddress();
      await masterBarista.addPool(stakingTokens[0].address, 1000);
      await masterBarista.setStakeTokenCallerAllowancePool(stakingTokens[0].address, true);
      await masterBarista.addStakeTokenCallerContract(stakingTokens[0].address, stakeCallerContract);
      await masterBaristaAsAlice.deposit(
        await deployer.getAddress(),
        stakingTokens[0].address,
        ethers.utils.parseEther("100")
      );
      await masterBaristaAsAlice.emergencyWithdraw(await deployer.getAddress(), stakingTokens[0].address);
      expect(await stakingTokens[0].balanceOf(await deployer.getAddress())).to.eq(ethers.utils.parseEther("100"));
      expect(await stakingTokens[0].balanceOf(await alice.getAddress())).to.eq(ethers.utils.parseEther("100"));
      expect(await masterBarista.activeBean()).to.eq(beanBag.address);
      expect(await masterBarista.activeLatte()).to.eq(latteToken.address);
    });
  });
});
