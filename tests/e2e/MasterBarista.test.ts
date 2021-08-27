import { ethers, waffle } from "hardhat";
import { Overrides, Signer, BigNumberish, utils, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BeanBag,
  BeanBag__factory,
  LATTE,
  LATTE__factory,
  MasterBarista,
  MasterBarista__factory,
  SimpleToken,
  SimpleToken__factory,
} from "../../typechain";
import { assertAlmostEqual } from "../helpers/assert";
import { advanceBlock, advanceBlockTo, latestBlockNumber } from "../helpers/time";
import { masterBaristaE2ETestFixture } from "../helpers/fixtures/MasterBarista";

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
  let beanBag: BeanBag;
  let masterBarista: MasterBarista;
  let stakingTokens: SimpleToken[];

  beforeEach(async () => {
    ({
      latteToken,
      beanBag,
      masterBarista,
      stakingTokens,
      LATTE_START_BLOCK,
      LATTE_PER_BLOCK,
      LATTE_BONUS_LOCK_UP_BPS,
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

    masterBaristaAsDeployer = MasterBarista__factory.connect(masterBarista.address, deployer);
    masterBaristaAsAlice = MasterBarista__factory.connect(masterBarista.address, alice);
    masterBaristaAsBob = MasterBarista__factory.connect(masterBarista.address, bob);
    masterBaristaAsDev = MasterBarista__factory.connect(masterBarista.address, dev);
  });

  context("when using pool", async () => {
    it("should distribute rewards according to the alloc point", async () => {
      // 1. Mint STOKEN0 and transfer LATTE from Deployer to Alice for staking
      await stoken0AsDeployer.mint(await alice.getAddress(), ethers.utils.parseEther("100"));
      await latteToken.transfer(await alice.getAddress(), ethers.utils.parseEther("100"));

      // 2. Add STOKEN0 to the MasterBarista pool
      await masterBarista.addPool(stakingTokens[0].address, 2000);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(masterBarista.address, ethers.utils.parseEther("100"));
      await masterBaristaAsAlice.deposit(
        await alice.getAddress(),
        stakingTokens[0].address,
        ethers.utils.parseEther("100")
      );

      // 4. Deposit LATTE to the LATTE pool
      await latteAsAlice.approve(masterBarista.address, ethers.utils.parseEther("100"));
      await masterBaristaAsAlice.depositLatte(await alice.getAddress(), ethers.utils.parseEther("100"));

      // 5. Move 1 Block so there is some pending
      await masterBarista.massUpdatePools();

      // The following conditions must be satisfied:
      // - Current emission is 10 LATTE/Block
      // - Alice should earned ~18 LATTE from staking STOKEN0 as it passed 3 blocks
      // since she staked, STOKEN0 get 60% of LATTE. Hence, LATTE_PER_BLOCK*0.6*3 LATTE
      // - Alice should earned ~8 LATTE from staking LATTE as it passed 1 block
      // since she staked, LATTE get 40% of LATTE. Hence, LATTE_PER_BLOCK*0.4*1 LATTE
      const latteEarnedFromStoken0 = await masterBarista.pendingLatte(
        stakingTokens[0].address,
        await alice.getAddress()
      );
      assertAlmostEqual(LATTE_PER_BLOCK.mul(6000).div(10000).mul(3).toString(), latteEarnedFromStoken0.toString());
      const latteEarnedFromLatte = await masterBarista.pendingLatte(latteToken.address, await alice.getAddress());
      assertAlmostEqual(LATTE_PER_BLOCK.mul(4000).div(10000).mul(1).toString(), latteEarnedFromLatte.toString());

      // 6. Harvest all yield
      await masterBaristaAsAlice["harvest(address,address)"](await alice.getAddress(), stakingTokens[0].address);
      await masterBaristaAsAlice["harvest(address,address)"](await alice.getAddress(), latteToken.address);

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

    it("should work", async () => {
      // 0. Initialized vars
      let aliceLatteBefore: BigNumberish;
      let bobLatteBefore: BigNumberish;

      // 1. Distribute LATTE to Alice and Bob for staking
      await latteToken.transfer(await alice.getAddress(), ethers.utils.parseEther("400"));
      await latteToken.transfer(await bob.getAddress(), ethers.utils.parseEther("100"));

      // 2. Deposit LATTE to the LATTE pool
      await latteAsAlice.approve(masterBarista.address, ethers.utils.parseEther("100"));
      await masterBaristaAsAlice.depositLatte(await alice.getAddress(), ethers.utils.parseEther("100"));

      // 3. Trigger random update pool to make 1 more block mine
      await masterBarista.massUpdatePools();

      // 4. Check pendingAlpaca for Alice, the following conditions must be satisfied:
      // - 1 block has passed, so Alice should earned LATTE_PER_BLOCK * 1 LATTE
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(LATTE_PER_BLOCK);

      // 5. Trigger random update pool to make 1 more block mine
      await masterBaristaAsAlice.massUpdatePools();

      // 6. Check pendingAlpaca for Alice, the following conditions must be satisfied:
      // - 2 blocks have mined since Alice staked, so Alice should earned LATTE_PER_BLOCK * 2 LATTE
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
      );

      // 7. Alice harvest her yields, the following conditions must be satisfied:
      // - Alice should get LATTE_PER_BLOCK * 3 LATTE when she harvest.
      // - Dev should earn 15% of LATTE_PER_BLOCK * 3.
      aliceLatteBefore = await latteToken.balanceOf(await alice.getAddress());
      await masterBaristaAsAlice["harvest(address,address)"](await alice.getAddress(), latteToken.address);
      expect(await latteToken.balanceOf(await alice.getAddress())).to.be.eq(
        aliceLatteBefore.add(LATTE_PER_BLOCK.mul(3))
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(3).mul(1500).div(10000));

      // 8. Bob come in and join the party, these are expected results:
      // - 2 blocks are mined from where Alice harvested, hence Alice should has LATTE_PER_BLOCK * 2 pending LATTE.
      // - 2 blocks are mined from where a user first deposit, hence Dev should earn 15% of LATTE_PER_BLOCK * (3+2).
      await latteAsBob.approve(masterBarista.address, ethers.utils.parseEther("100"));
      await masterBaristaAsBob.depositLatte(await bob.getAddress(), ethers.utils.parseEther("100"));
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(5).mul(1500).div(10000));

      // 9. Trigger random update pool to make 1 more block mine
      await masterBarista.massUpdatePools();

      // 10. Expect that the following conditions must be satisfied:
      // - LATTE_PER_BLOCK must share amoung Bob and Alice (50-50), due to Alice and Bob staked equally
      // - Alice should has [LATTE_PER_BLOCK * 2] from previous state + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Bob should has LATTE_PER_BLOCK * 0.5 LATTE
      // - Dev get 15% of LATTE_PER_BLOCK * (5+1) LATTE
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await masterBarista.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(5000).div(10000)
      );
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(6).mul(1500).div(10000));

      // 11. Trigger random update pool to make 1 more block mine
      await masterBarista.massUpdatePools();

      // 12. Expect that the following conditions must be satisfied:
      // - LATTE_PER_BLOCK must share amoung Bob and Alice (50-50), due to Alice and Bob staked equally
      // - Alice should has [LATTE_PER_BLOCK * 2] + [LATTE_PER_BLOCK * 0.5] from previous state
      // + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Bob should has [LATTE_PER_BLOCK * 0.5] from previous state + [LATTE_PER_BLOCK * 0.5] pending LATTE
      // - Dev get 15% of LATTE_PER_BLOCK * (6+1) LATTE
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).add(LATTE_PER_BLOCK.mul(5000).div(10000)).add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await masterBarista.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
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
      await masterBaristaAsBob["harvest(address,address)"](await bob.getAddress(), latteToken.address);
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2)
          .add(LATTE_PER_BLOCK.mul(2).mul(5000).div(10000))
          .add(LATTE_PER_BLOCK.mul(5000).div(10000))
      );
      expect(await masterBarista.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq("0");
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
      await latteAsAlice.approve(masterBarista.address, ethers.utils.parseEther("300"));
      await masterBaristaAsAlice.depositLatte(await alice.getAddress(), ethers.utils.parseEther("300"));
      expect(await latteToken.balanceOf(await alice.getAddress())).to.be.eq(
        aliceLatteBefore
          .sub(ethers.utils.parseEther("300"))
          .add(LATTE_PER_BLOCK.mul(2))
          .add(LATTE_PER_BLOCK.mul(3).mul(5000).div(10000).add(LATTE_PER_BLOCK.mul(2).mul(5000).div(10000)))
      );
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq("0");
      expect(await masterBarista.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).mul(5000).div(10000)
      );
      expect(await latteToken.balanceOf(await bob.getAddress())).to.be.eq(bobLatteBefore);
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(10).mul(1500).div(10000));

      // 15. Trigger random update pool to make 1 more block mine
      await masterBarista.massUpdatePools();

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
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(8000).div(10000)
      );
      expect(await latteToken.balanceOf(await alice.getAddress())).to.be.eq(aliceLatteBefore);
      expect(await masterBarista.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(2).mul(5000).div(10000).add(LATTE_PER_BLOCK.mul(2000).div(10000))
      );
      expect(await latteToken.balanceOf(await bob.getAddress())).to.be.eq(bobLatteBefore);
      expect(await latteToken.balanceOf(await dev.getAddress())).to.be.eq(LATTE_PER_BLOCK.mul(11).mul(1500).div(10000));

      // 17. Activate Bonus period, 1 block executed
      // bonus will start the calculation on the next block
      const currentBlock = await latestBlockNumber();
      await masterBarista.setBonus(10, currentBlock.add(5), 7000);

      // 18. Make block mined 7 times to make it pass bonusEndBlock
      await advanceBlockTo(currentBlock.add(7).toNumber());

      // 19. Trigger this to mint token for dev, 1 more block mined
      await masterBarista.massUpdatePools();

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
      // - Bob should has
      //   From previous state:         [LATTE_PER_BLOCK * 2 * 0.5] + [LATTE_PER_BLOCK * 0.2] +
      //   From bonus period:           [LATTE_PER_BLOCK * 10 * 4 * 0.2] +
      //   From 3 blocks after bonus:   [LATTE_PER_BLOCK * 4 * 0.2] pending LATTE
      // - Dev should has
      //   From previous state:         [LATTE_PER_BLOCK * 11 * 0.15] +
      //   From bonus period:           [LATTE_PER_BLOCK * 10 * 4 * 0.15 * 0.3] +
      //   From 3 blocks after bonus:   [LATTE_PER_BLOCK * 4 * 0.15] in the account
      // - Dev should has [LATTE_PER_BLOCK * 10 * 4 * 0.15 * 0.7] locked LATTE
      expect(await masterBarista.pendingLatte(latteToken.address, await alice.getAddress())).to.be.eq(
        LATTE_PER_BLOCK.mul(8000)
          .div(10000)
          .add(LATTE_PER_BLOCK.mul(10).mul(4).mul(8000).div(10000))
          .add(LATTE_PER_BLOCK.mul(4).mul(8000).div(10000))
      );
      expect(await masterBarista.pendingLatte(latteToken.address, await bob.getAddress())).to.be.eq(
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
  });
});


