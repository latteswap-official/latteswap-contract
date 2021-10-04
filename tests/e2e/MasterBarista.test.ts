import { ethers, upgrades, waffle } from "hardhat";
import { Overrides, Signer, BigNumberish, utils, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BeanBag,
  LATTE,
  LATTE__factory,
  MasterBaristaV1,
  MasterBaristaV1__factory,
  MasterBarista,
  MasterBarista__factory,
  SimpleToken,
  SimpleToken__factory,
} from "../../typechain";
import { assertAlmostEqual } from "../helpers/assert";
import { advanceBlock, advanceBlockTo, latestBlockNumber } from "../helpers/time";
import { masterBaristaE2ETestFixture } from "../helpers/fixtures/MasterBarista";
import { wrapErr } from "../../utils";
import { isLeft } from "fp-ts/lib/Either";
import { BeanBagV2, LATTEV2 } from "../../typechain";

chai.use(solidity);
const { expect } = chai;

describe("MasterBarista e2e", () => {
  let LATTE_START_BLOCK: number;
  let LATTE_PER_BLOCK: BigNumber;
  let LATTE_BONUS_LOCK_UP_BPS: number;

  // Contract as Signer
  let latteAsAlice: LATTE;
  let latteAsBob: LATTE;
  let latteAsDev: LATTE;

  let stoken0AsDeployer: SimpleToken;
  let stoken0AsAlice: SimpleToken;
  let stoken0AsBob: SimpleToken;
  let stoken0AsDev: SimpleToken;

  let stoken1AsDeployer: SimpleToken;
  let stoken1AsAlice: SimpleToken;
  let stoken1AsBob: SimpleToken;
  let stoken1AsDev: SimpleToken;

  let masterBaristaV1AsDeployer: MasterBaristaV1;
  let masterBaristaV1AsAlice: MasterBaristaV1;
  let masterBaristaV1AsBob: MasterBaristaV1;
  let masterBaristaV1AsDev: MasterBaristaV1;

  let masterBaristaAsDeployer: MasterBarista;
  let masterBaristaAsAlice: MasterBarista;
  let masterBaristaAsBob: MasterBarista;
  let masterBaristaAsDev: MasterBarista;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let dev: Signer;

  let latteToken: LATTE;
  let latteV2: LATTEV2;
  let beanBag: BeanBag;
  let beanV2: BeanBagV2;
  let masterBaristaV1: MasterBaristaV1;
  let stakingTokens: SimpleToken[];

  beforeEach(async () => {
    ({
      latteToken,
      beanBag,
      masterBarista: masterBaristaV1,
      stakingTokens,
      LATTE_START_BLOCK,
      LATTE_PER_BLOCK,
      LATTE_BONUS_LOCK_UP_BPS,
      latteV2,
      beanV2,
    } = await waffle.loadFixture(masterBaristaE2ETestFixture));
    [deployer, alice, bob, dev] = await ethers.getSigners();

    latteAsAlice = LATTE__factory.connect(latteToken.address, alice);
    latteAsBob = LATTE__factory.connect(latteToken.address, bob);
    latteAsDev = LATTE__factory.connect(latteToken.address, dev);

    stoken0AsDeployer = SimpleToken__factory.connect(stakingTokens[0].address, deployer);
    stoken0AsAlice = SimpleToken__factory.connect(stakingTokens[0].address, alice);
    stoken0AsBob = SimpleToken__factory.connect(stakingTokens[0].address, bob);
    stoken0AsDev = SimpleToken__factory.connect(stakingTokens[0].address, dev);

    stoken1AsDeployer = SimpleToken__factory.connect(stakingTokens[1].address, deployer);
    stoken1AsAlice = SimpleToken__factory.connect(stakingTokens[1].address, alice);
    stoken1AsBob = SimpleToken__factory.connect(stakingTokens[1].address, bob);
    stoken1AsDev = SimpleToken__factory.connect(stakingTokens[1].address, dev);

    masterBaristaV1AsDeployer = MasterBaristaV1__factory.connect(masterBaristaV1.address, deployer);
    masterBaristaV1AsAlice = MasterBaristaV1__factory.connect(masterBaristaV1.address, alice);
    masterBaristaV1AsBob = MasterBaristaV1__factory.connect(masterBaristaV1.address, bob);
    masterBaristaV1AsDev = MasterBaristaV1__factory.connect(masterBaristaV1.address, dev);

    masterBaristaAsDeployer = MasterBarista__factory.connect(masterBaristaV1.address, deployer);
    masterBaristaAsAlice = MasterBarista__factory.connect(masterBaristaV1.address, alice);
    masterBaristaAsBob = MasterBarista__factory.connect(masterBaristaV1.address, bob);
    masterBaristaAsDev = MasterBarista__factory.connect(masterBaristaV1.address, dev);
  });

  context("happy", () => {
    it("should distribute rewards according to the alloc point", async () => {
      // 1. Mint STOKEN0 and transfer LATTE from Deployer to Alice for staking
      await stoken0AsDeployer.mint(await alice.getAddress(), ethers.utils.parseEther("100"));
      await latteToken.transfer(await alice.getAddress(), ethers.utils.parseEther("100"));

      // 2. Add STOKEN0 to the MasterBarista pool
      await masterBaristaV1.addPool(stakingTokens[0].address, 2000);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(masterBaristaV1.address, ethers.utils.parseEther("100"));
      await masterBaristaV1AsAlice.deposit(
        await alice.getAddress(),
        stakingTokens[0].address,
        ethers.utils.parseEther("100")
      );

      // 4. Deposit LATTE to the LATTE pool
      await latteAsAlice.approve(masterBaristaV1.address, ethers.utils.parseEther("100"));
      await masterBaristaV1AsAlice.depositLatte(await alice.getAddress(), ethers.utils.parseEther("100"));

      // 5. Move 1 Block so there is some pending
      await masterBaristaV1.massUpdatePools();

      // The following conditions must be satisfied:
      // - Current emission is 10 LATTE/Block
      // - Alice should earned ~18 LATTE from staking STOKEN0 as it passed 3 blocks
      // since she staked, STOKEN0 get 60% of LATTE. Hence, LATTE_PER_BLOCK*0.6*3 LATTE
      // - Alice should earned ~8 LATTE from staking LATTE as it passed 1 block
      // since she staked, LATTE get 40% of LATTE. Hence, LATTE_PER_BLOCK*0.4*1 LATTE
      const latteEarnedFromStoken0 = await masterBaristaV1.pendingLatte(
        stakingTokens[0].address,
        await alice.getAddress()
      );
      assertAlmostEqual(LATTE_PER_BLOCK.mul(6000).div(10000).mul(3).toString(), latteEarnedFromStoken0.toString());
      const latteEarnedFromLatte = await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress());
      assertAlmostEqual(LATTE_PER_BLOCK.mul(4000).div(10000).mul(1).toString(), latteEarnedFromLatte.toString());

      // 6. Harvest all yield
      await masterBaristaV1AsAlice["harvest(address,address)"](await alice.getAddress(), stakingTokens[0].address);
      await masterBaristaV1AsAlice["harvest(address,address)"](await alice.getAddress(), latteToken.address);

      // The following conditions must be statisfied:
      // - Alice should earned ~6 more LATTE from staking STOKEN0 and harvest it 1 block
      // after pendingLatte is called. Hence, LATTE_PER_BLOCK*0.6*4 LATTE
      // - Alice should earned ~8 more LATTE from staking LATTE and harvest it 2 block
      // after pendingLatte is called. Hence, LATTE_PER_BLOCK*0.4*3 LATTE
      assertAlmostEqual(
        LATTE_PER_BLOCK.mul(6000).div(10000).mul(4).add(LATTE_PER_BLOCK.mul(4000).div(10000).mul(3)).toString(),
        (await latteToken.balanceOf(await alice.getAddress())).toString()
      );
    });
  });

  context("scenario", async () => {
    beforeEach(async () => {
      // 0. Initialized vars
      let aliceLatteBefore: BigNumberish;
      let bobLatteBefore: BigNumberish;

      // 1. Distribute LATTE to Alice and Bob for staking
      await latteToken.transfer(await alice.getAddress(), ethers.utils.parseEther("400"));
      await latteToken.transfer(await bob.getAddress(), ethers.utils.parseEther("100"));

      // 2. Deposit LATTE to the LATTE pool
      await latteAsAlice.approve(masterBaristaV1.address, ethers.utils.parseEther("100"));
      await masterBaristaV1AsAlice.depositLatte(await alice.getAddress(), ethers.utils.parseEther("100"));

      // 3. Trigger random update pool to make 1 more block mine
      await masterBaristaV1.massUpdatePools();

      // 4. Check pendingAlpaca for Alice, the following conditions must be satisfied:
      // - 1 block has passed, so Alice should earned LATTE_PER_BLOCK * 1 LATTE
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK
      );

      // 5. Trigger random update pool to make 1 more block mine
      await masterBaristaV1AsAlice.massUpdatePools();

      // 6. Check pendingAlpaca for Alice, the following conditions must be satisfied:
      // - 2 blocks have mined since Alice staked, so Alice should earned LATTE_PER_BLOCK * 2 LATTE
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
      );

      // 7. Alice harvest her yields, the following conditions must be satisfied:
      // - Alice should get LATTE_PER_BLOCK * 3 LATTE when she harvest.
      // - Dev should earn 15% of LATTE_PER_BLOCK * 3.
      aliceLatteBefore = await latteToken.balanceOf(await alice.getAddress());
      await masterBaristaV1AsAlice["harvest(address,address)"](await alice.getAddress(), latteToken.address);
      expect(await latteToken.balanceOf(await alice.getAddress())).to.be.eq(
        aliceLatteBefore.add(LATTE_PER_BLOCK.mul(3))
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(3).mul(1500).div(10000));

      // 8. Bob come in and join the party, these are expected results:
      // - 2 blocks are mined from where Alice harvested, hence Alice should has LATTE_PER_BLOCK * 2 pending LATTE.
      // - 2 blocks are mined from where a user first deposit, hence Dev should earn 15% of LATTE_PER_BLOCK * (3+2).
      await latteAsBob.approve(masterBaristaV1.address, ethers.utils.parseEther("100"));
      await masterBaristaV1AsBob.depositLatte(await bob.getAddress(), ethers.utils.parseEther("100"));
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(5).mul(1500).div(10000));

      // 9. Trigger random update pool to make 1 more block mine
      await masterBaristaV1.massUpdatePools();

      // 10. Expect that the following conditions must be satisfied:
      // - LATTE_PER_BLOCK must share amoung Bob and Alice (50-50), due to Alice and Bob staked equally
      // - Alice should has [LATTE_PER_BLOCK * 2] from previous state + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Bob should has LATTE_PER_BLOCK * 0.5 LATTE
      // - Dev get 15% of LATTE_PER_BLOCK * (5+1) LATTE
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(5000).div(10000)
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(6).mul(1500).div(10000));

      // 11. Trigger random update pool to make 1 more block mine
      await masterBaristaV1.massUpdatePools();

      // 12. Expect that the following conditions must be satisfied:
      // - LATTE_PER_BLOCK must share amoung Bob and Alice (50-50), due to Alice and Bob staked equally
      // - Alice should has [LATTE_PER_BLOCK * 2] + [LATTE_PER_BLOCK * 0.5] from previous state
      // + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Bob should has [LATTE_PER_BLOCK * 0.5] from previous state + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Dev get 15% of LATTE_PER_BLOCK * (6+1) LATTE
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).add(LATTE_PER_BLOCK.mul(5000).div(10000)).add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(5000).div(10000).add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(7).mul(1500).div(10000));

      // 13. Bob harvest his yield, expect that the following conditions must be satisfied:
      // - LATTE_PER_BLOCK must share amoung Bob and Alice (50-50), due to Alice and Bob staked equally
      // - Alice should has [LATTE_PER_BLOCK * 2] + [LATTE_PER_BLOCK * 2 * 0.5] from previous state
      // + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Bob should has [LATTE_PER_BLOCK * 2 * 0.5] from previous state + [LATTE_PER_BLOCK * 0.5]
      // in his account after he harvested
      // - Bob should has 0 pending pending LATTE after harvested
      // - Dev get 15% of LATTE_PER_BLOCK * (7+1) LATTE
      await masterBaristaV1AsBob["harvest(address,address)"](await bob.getAddress(), latteToken.address);
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
          .add(LATTE_PER_BLOCK.mul(2).mul(5000).div(10000))
          .add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq("0");
      expect(await latteToken.balanceOf(await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).mul(5000).div(10000).add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(8).mul(1500).div(10000));

      // 14. Alice wants more LATTE so she deposit 300 LATTE more.
      // Alice moves 2 blocks:
      // - 1 block for approving LATTE
      // - 1 block for depositing to MasterBarista
      // Hence, the following conditions must be satisfied:
      // - Alice should has
      //    (PREVIOUS_LATTE - 300) +
      //    [LATTE_PER_BLOCK * 2] + [LATTE_PER_BLOCK * 3 * 0.5] from previous blocks
      //    [LATTE_PER_BLOCK * 2 * 0.5] LATTE from this block in her account
      // - Alice's pending LATTE must be 0 as she harvested
      // - Bob should has [LATTE_PER_BLOCK * 2 * 0.5] pending LATTE
      // - Bob's LATTE balance must be the same
      // - Dev get 15% of LATTE_PER_BLOCK * (8+2) LATTE
      aliceLatteBefore = await latteToken.balanceOf(await alice.getAddress());
      bobLatteBefore = await latteToken.balanceOf(await bob.getAddress());
      await latteAsAlice.approve(masterBaristaV1.address, ethers.utils.parseEther("300"));
      await masterBaristaV1AsAlice.depositLatte(await alice.getAddress(), ethers.utils.parseEther("300"));
      expect(await latteToken.balanceOf(await alice.getAddress())).to.be.eq(
        aliceLatteBefore
          .sub(ethers.utils.parseEther("300"))
          .add(LATTE_PER_BLOCK.mul(2))
          .add(LATTE_PER_BLOCK.mul(3).mul(5000).div(10000).add(LATTE_PER_BLOCK.mul(2).mul(5000).div(10000)))
      );
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq("0");
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).mul(5000).div(10000)
      );
      expect(await latteToken.balanceOf(await bob.getAddress())).to.be.eq(bobLatteBefore);
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(10).mul(1500).div(10000));

      // 15. Trigger random update pool to make 1 more block mine
      await masterBaristaV1.massUpdatePools();

      // 16. Expect that the following conditions must be satisfied:
      // - 1 more block is mined, now Alice shold get 80% and Bob should get 20% of rewards
      // due to Alice staked 400 LATTE and Bob staked 100 LATTE,
      // so Alice has 400/(400+100) = 0.8 of the pool, and Bob has 100/(400+100) = 0.2 of the pool
      // - Alice should has LATTE_PER_BLOCK * 0.8 pending LATTE
      // - Alice should still has the same amount of LATTE in her account
      // - Bob should has [LATTE_PER_BLOCK * 2 * 0.5] from previous blocks + [LATTE_PER_BLOCK * 0.2] pending LATTE
      // - Bob should still has the same amount of LATTE in his account
      // - Dev get 15% of LATTE_PER_BLOCK * (10+1) LATTE
      aliceLatteBefore = await latteToken.balanceOf(await alice.getAddress());
      bobLatteBefore = await latteToken.balanceOf(await bob.getAddress());
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(8000).div(10000)
      );
      expect(await latteToken.balanceOf(await alice.getAddress())).to.be.eq(aliceLatteBefore);
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).mul(5000).div(10000).add(LATTE_PER_BLOCK.mul(2000).div(10000))
      );
      expect(await latteToken.balanceOf(await bob.getAddress())).to.be.eq(bobLatteBefore);
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(11).mul(1500).div(10000));

      // 17. Activate Bonus period, 1 block executed
      // bonus will start the calculation on the next block
      const currentBlock = await latestBlockNumber();
      await masterBaristaV1.setBonus(10, currentBlock.add(5), 7000);

      // 18. Make block mined 7 times to make it pass bonusEndBlock
      await advanceBlockTo(currentBlock.add(7).toNumber());

      // 19. Trigger this to mint token for dev, 1 more block mined
      await masterBaristaV1.massUpdatePools();

      // 20. Expect pending balances to be:
      // - Each block during bonus period Alice will get LATTE_PER_BLOCK * 10 * 0.8 in pending
      // Bob will get LATTE_PER_BLOCK * 10 * 0.2 in pending.
      // - Total blocks mined = 8 blocks counted from setBonus executed
      // However, bonus will start to calculate on the setBonus's block + 1
      // Assuming setBonus's block = n, bonusEndBlock = n + 5, bonus start to kick-in n + 1
      // Hence, total bonus blocks = (n + 5) - (n + 1) = 4 blocks are in bonus period
      // So 4 blocks are out of bonus period.
      // - Alice should has
      //   From previous state:         [LATTE_PER_BLOCK * 0.8] +
      //   From bonus period:           [LATTE_PER_BLOCK * 10 * 4 * 0.8] +
      //   From 3 blocks after bonus:   [LATTE_PER_BLOCK * 4 * 0.8] pending LATTE
      // = 8 + 320 + 32 = 360
      // - Bob should has
      //   From previous state:         [LATTE_PER_BLOCK * 2 * 0.5] + [LATTE_PER_BLOCK * 0.2] +
      //   From bonus period:           [LATTE_PER_BLOCK * 10 * 4 * 0.2] +
      //   From 3 blocks after bonus:   [LATTE_PER_BLOCK * 4 * 0.2] pending LATTE
      // - Dev should has
      //   From previous state:         [LATTE_PER_BLOCK * 11 * 0.15] +
      //   From bonus period:           [LATTE_PER_BLOCK * 10 * 4 * 0.15 * 0.3] +
      //   From 3 blocks after bonus:   [LATTE_PER_BLOCK * 4 * 0.15] in the account
      // - Dev should has [LATTE_PER_BLOCK * 10 * 4 * 0.15 * 0.7] locked LATTE
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(8000)
          .div(10000)
          .add(LATTE_PER_BLOCK.mul(10).mul(4).mul(8000).div(10000))
          .add(LATTE_PER_BLOCK.mul(4).mul(8000).div(10000))
      );
      expect(await masterBaristaV1.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
          .mul(5000)
          .div(10000)
          .add(
            LATTE_PER_BLOCK.mul(2000)
              .div(10000)
              .add(LATTE_PER_BLOCK.mul(10).mul(4).mul(2000).div(10000))
              .add(LATTE_PER_BLOCK.mul(4).mul(2000).div(10000))
          )
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(11)
          .mul(1500)
          .div(10000)
          .add(LATTE_PER_BLOCK.mul(10).mul(4).mul(1500).div(10000).mul(3000).div(10000))
          .add(LATTE_PER_BLOCK.mul(4).mul(1500).div(10000))
      );
      expect(await latteToken.lockOf(await dev.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(10).mul(4).mul(1500).div(10000).mul(7000).div(10000)
      );
    });
    context("scenario #1 alice harvest & alice withdraw after migrate", async () => {
      it("should successfully migrate with correct parameter changes", async () => {
        // Since new features come out, master barista needs to be updated

        // 21. deployer call upgrade from V1 to V2Migrate (based on convention the latest version will use the name MasterBarista)
        const MasterBarista = (await ethers.getContractFactory("MasterBarista", deployer)) as MasterBarista__factory;
        const masterBarista = (await upgrades.upgradeProxy(masterBaristaV1.address, MasterBarista)) as MasterBarista;
        await masterBarista.deployed();

        // should call active latte without error
        const wrapped = await wrapErr(masterBarista.activeLatte());
        expect(isLeft(wrapped), "should not be isLeft which infer that some errors occurred").to.be.false;

        // 22. trigger massUpdatePools
        await masterBarista.massUpdatePools();
        expect(await masterBarista.activeBean()).to.eq(beanBag.address, "active bean should be a v1");
        expect(await masterBarista.activeLatte()).to.eq(latteToken.address, "active latte should be a v1");
        // 23. deployer set latte/block to be 0
        await masterBarista.setLattePerBlock(0);
        expect(await masterBarista.lattePerBlock()).to.eq(0, "latte per block should be 0");
        // 24. deployer calls migrate
        const latteOwnedByBean = await latteToken.balanceOf(beanBag.address);
        await expect(masterBarista.migrate(latteV2.address, beanV2.address), "should emit a correct migrate amount")
          .to.emit(masterBarista, "Migrate")
          .withArgs(latteOwnedByBean);
        expect(await masterBarista.activeBean()).to.eq(beanV2.address, "active bean should be a v2");
        expect(await masterBarista.activeLatte()).to.eq(latteV2.address, "active latte should be a v2");
        expect(await latteV2.balanceOf(beanV2.address)).to.eq(
          latteOwnedByBean,
          "latte owned by bean should be redeemed to v2"
        );
        expect(await latteToken.balanceOf(beanBag.address)).to.eq(0, "latteV1 should be 0");
        // 25. set latte per block back
        await masterBarista.setLattePerBlock(LATTE_PER_BLOCK);
        expect(await masterBarista.lattePerBlock()).to.eq(
          LATTE_PER_BLOCK,
          `latte per block should be the same as ${LATTE_PER_BLOCK}`
        );
        // 26. alice wants to harvest
        // - Alice should has
        //   From previous state:         [LATTE_PER_BLOCK * 0.8] + [LATTE_PER_BLOCK * 10 * 4 * 0.8] + [LATTE_PER_BLOCK * 4 * 0.8] pending LATTE
        //   From pending rewards         [LATTE_PER_BLOCK * 3 * 0.8]
        // = 360 + 24 = 384
        const alicePendingReward = LATTE_PER_BLOCK.mul(8000)
          .div(10000)
          .add(LATTE_PER_BLOCK.mul(10).mul(4).mul(8000).div(10000))
          .add(LATTE_PER_BLOCK.mul(4).mul(8000).div(10000))
          .add(LATTE_PER_BLOCK.mul(3).mul(8000).div(10000));
        expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
          alicePendingReward,
          "pending latte should be as calculated"
        );
        await expect(
          masterBaristaAsAlice["harvest(address,address)"](await alice.getAddress(), latteToken.address),
          "should emit harvest with a correct amount"
        )
          .to.emit(masterBarista, "Harvest")
          .withArgs(
            await alice.getAddress(),
            await alice.getAddress(),
            latteToken.address,
            LATTE_PER_BLOCK.mul(8000)
              .div(10000)
              .add(LATTE_PER_BLOCK.mul(10).mul(4).mul(8000).div(10000))
              .add(LATTE_PER_BLOCK.mul(4).mul(8000).div(10000))
              .add(LATTE_PER_BLOCK.mul(4).mul(8000).div(10000))
          );
        const aliceLatteV1Balance = await latteToken.balanceOf(await alice.getAddress());
        //   From previous state:         [LATTE_PER_BLOCK * 0.8] +
        //        From bonus period:      [LATTE_PER_BLOCK * 10 * 4 * 0.8] +
        //        From after bonus:       [LATTE_PER_BLOCK * 4 * 0.8]
        //   From pending rewards         [LATTE_PER_BLOCK * 4 * 0.8]
        // = ((LATTE_PER_BLOCK * 0.8 + LATTE_PER_BLOCK * 10 * 4 * 0.8) * 0.7) + LATTE_PER_BLOCK * 4 * 0.8 + LATTE_PER_BLOCK * 4 * 0.8
        // = (320) * 0.3 + 8 + 32 + 32 = 168
        expect(await latteV2.balanceOf(await alice.getAddress())).to.eq(
          ethers.utils.parseEther("168"),
          "alice should get a correct amount of latte v2"
        );
        expect(aliceLatteV1Balance).to.eq(
          await latteToken.balanceOf(await alice.getAddress()),
          "since the reward has been migrated to v2, v1 should stay the same"
        );

        // 26. alice wants to withdraw lattev1
        const userInfo = await masterBaristaAsAlice.userInfo(latteToken.address, await alice.getAddress());
        await expect(
          masterBaristaAsAlice.withdraw(await alice.getAddress(), latteToken.address, userInfo.amount)
        ).to.revertedWith("MasterBarista::withdraw::use withdrawLatte instead");
        const aliceLatteV1Before = await latteToken.balanceOf(await alice.getAddress());
        await expect(masterBaristaAsAlice.withdrawLatte(await alice.getAddress(), userInfo.amount))
          .to.emit(masterBarista, "Withdraw")
          .withArgs(await alice.getAddress(), await alice.getAddress(), latteToken.address, 0);
        const aliceLatteV1After = await latteToken.balanceOf(await alice.getAddress());
        expect(aliceLatteV1After.sub(aliceLatteV1Before)).to.eq(
          userInfo.amount,
          "latte v1 of alice should be increased as she withdrew a latte v1 token"
        );
        expect(await beanBag.balanceOf(await alice.getAddress())).to.eq(0);
      });
    });

    context("scenario #2 everyone withdraw after migrate", async () => {
      it("should successfully delegate all lattev2 owned by beanbagV2 to all users after migrate", async () => {
        // Since new features come out, master barista needs to be updated

        // 21. deployer call upgrade from V1 to V2Migrate (based on convention the latest version will use the name MasterBarista)
        const MasterBarista = (await ethers.getContractFactory("MasterBarista", deployer)) as MasterBarista__factory;
        const masterBarista = (await upgrades.upgradeProxy(masterBaristaV1.address, MasterBarista)) as MasterBarista;
        await masterBarista.deployed();

        // should call active latte without error
        const wrapped = await wrapErr(masterBarista.activeLatte());
        expect(isLeft(wrapped), "should not be isLeft which infer that some errors occurred").to.be.false;

        // 22. trigger massUpdatePools
        await masterBarista.massUpdatePools();
        expect(await masterBarista.activeBean()).to.eq(beanBag.address, "active bean should be a v1");
        expect(await masterBarista.activeLatte()).to.eq(latteToken.address, "active latte should be a v1");
        // 23. deployer set latte/block to be 0
        await masterBarista.setLattePerBlock(0);
        expect(await masterBarista.lattePerBlock()).to.eq(0, "latte per block should be 0");

        // 24. deployer calls migrate
        const latteOwnedByBean = await latteToken.balanceOf(beanBag.address);
        await expect(masterBarista.migrate(latteV2.address, beanV2.address), "should emit a correct migrate amount")
          .to.emit(masterBarista, "Migrate")
          .withArgs(latteOwnedByBean);
        await masterBarista.addPool(latteV2.address, 1);
        await masterBarista.setPoolAllocBps(latteToken.address, 0);
        await expect(
          masterBarista.deposit(await deployer.getAddress(), latteV2.address, ethers.utils.parseEther("100"))
        ).to.be.revertedWith("MasterBarista::deposit::use depositLatteV2 instead");
        expect(await masterBarista.activeBean()).to.eq(beanV2.address, "active bean should be a v2");
        expect(await masterBarista.activeLatte()).to.eq(latteV2.address, "active latte should be a v2");
        expect(await latteV2.balanceOf(beanV2.address)).to.eq(
          latteOwnedByBean,
          "latte owned by bean should be redeemed to v2"
        );
        expect(await latteToken.balanceOf(beanBag.address)).to.eq(0, "latteV1 should be 0");
        // withdraw all stuff
        const actors = [alice, bob];
        for (const i in actors) {
          const latteBalanceBefore = await latteV2.balanceOf(beanV2.address);
          const beanBagBefore = await beanBag.balanceOf(await actors[i].getAddress());
          const userInfo = await masterBarista.userInfo(latteToken.address, await actors[i].getAddress());
          const pendingLatte = await masterBarista.pendingLatte(latteToken.address, await actors[i].getAddress());
          const masterBaristaAsActor = MasterBarista__factory.connect(masterBarista.address, actors[i]);
          await masterBaristaAsActor.withdrawLatte(await actors[i].getAddress(), userInfo.amount);
          expect(latteBalanceBefore.sub(pendingLatte)).to.eq(
            await latteV2.balanceOf(beanV2.address),
            "latte owned by beanv2 should be delegated to the actors"
          );
          expect(beanBagBefore.sub(await beanBag.balanceOf(await actors[i].getAddress()))).to.eq(
            userInfo.amount,
            "bean owned by bean should be delegated"
          );
        }

        await expect(await latteV2.balanceOf(beanV2.address)).to.eq(0, "latteV2 owned by bean v2 should be 0");
      });
    });
  });
});
