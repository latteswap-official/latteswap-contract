import { ethers, upgrades } from "hardhat";
import { Signer, BigNumber, Wallet, utils } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  LatteSwapFactory,
  LatteSwapFactory__factory,
  LatteSwapRouter__factory,
  LatteSwapRouter,
  LatteSwapPair__factory,
  SimpleToken,
  SimpleToken__factory,
  WBNB,
  WBNB__factory,
  LatteSwapPair,
  LatteSwapOptimalDeposit,
  LatteSwapOptimalDeposit__factory,
} from "../../typechain";
import { AddressZero, MaxUint256, Zero } from "@ethersproject/constants";
import { getApprovalDigest, sortsBefore } from "../helpers";
import { before } from "mocha";

chai.use(solidity);
const { expect } = chai;

describe("LatteSwapOptimalDeposit", () => {
  const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3);

  // LatteSwap instances
  let latteSwapOptimalDeposit: LatteSwapOptimalDeposit;
  let latteSwapFactory: LatteSwapFactory;
  let latteSwapRouter: LatteSwapRouter;
  let nonNativePair: LatteSwapPair;
  let nativePair: LatteSwapPair;

  // Token instances
  let wbnb: WBNB;
  let token0: SimpleToken;
  let token1: SimpleToken;

  // Accounts
  let deployer: Wallet;
  let funder: Signer;
  let alice: Wallet;

  // Binding
  let latteSwapRouterAsAlice: LatteSwapRouter;
  let nonNativePairAsAlice: LatteSwapPair;
  let nativePairAsAlice: LatteSwapPair;

  before(async () => {
    [funder] = await ethers.getSigners();
    // funding a mocked wallet
    alice = ethers.Wallet.createRandom().connect(ethers.provider);
    let sendtx = await funder.sendTransaction({
      to: alice.address,
      value: utils.parseEther("1000"),
    });
    await sendtx.wait();

    deployer = ethers.Wallet.createRandom().connect(ethers.provider);
    sendtx = await funder.sendTransaction({
      to: deployer.address,
      value: utils.parseEther("1000"),
    });

    await sendtx.wait();
  });

  beforeEach(async () => {
    // contracts creation
    const WBNB = (await ethers.getContractFactory("WBNB", deployer)) as WBNB__factory;
    wbnb = await WBNB.deploy();

    const LatteSwapFactory = (await ethers.getContractFactory(
      "LatteSwapFactory",
      deployer
    )) as LatteSwapFactory__factory;
    latteSwapFactory = await LatteSwapFactory.deploy(await deployer.getAddress());

    const LatteSwapRouter = (await ethers.getContractFactory("LatteSwapRouter", deployer)) as LatteSwapRouter__factory;
    latteSwapRouter = await LatteSwapRouter.deploy(latteSwapFactory.address, wbnb.address);

    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    token0 = await SimpleToken.deploy("TOKEN0", "TOKEN0");
    await token0.mint(await deployer.getAddress(), ethers.utils.parseEther("8888888888"));

    token1 = await SimpleToken.deploy("TOKEN1", "TOKEN1");
    await token1.mint(await deployer.getAddress(), ethers.utils.parseEther("999999999"));

    await latteSwapFactory.createPair(token0.address, token1.address);
    const nonNativePairAddress = await latteSwapFactory.getPair(token0.address, token1.address);
    nonNativePair = LatteSwapPair__factory.connect(nonNativePairAddress, deployer) as LatteSwapPair;

    await latteSwapFactory.createPair(token0.address, wbnb.address);
    const nativePairAddress = await latteSwapFactory.getPair(token0.address, wbnb.address);
    nativePair = LatteSwapPair__factory.connect(nativePairAddress, deployer) as LatteSwapPair;

    const LatteSwapOptimalDeposit = (await ethers.getContractFactory(
      "LatteSwapOptimalDeposit",
      deployer
    )) as LatteSwapOptimalDeposit__factory;
    latteSwapOptimalDeposit = (await upgrades.deployProxy(LatteSwapOptimalDeposit, [
      latteSwapRouter.address,
      wbnb.address,
    ])) as LatteSwapOptimalDeposit;

    latteSwapRouterAsAlice = LatteSwapRouter__factory.connect(latteSwapRouter.address, alice) as LatteSwapRouter;
    nonNativePairAsAlice = LatteSwapPair__factory.connect(nonNativePairAddress, alice) as LatteSwapPair;
    nativePairAsAlice = LatteSwapPair__factory.connect(nativePairAddress, alice) as LatteSwapPair;
  });

  describe("initialized states", () => {
    it("should contain the correct factory address", async () => {
      expect((await latteSwapOptimalDeposit.factory()).toLowerCase()).to.be.eq(latteSwapFactory.address.toLowerCase());
    });

    it("should contain the correct router address", async () => {
      expect((await latteSwapOptimalDeposit.router()).toLowerCase()).to.be.eq(latteSwapRouter.address.toLowerCase());
    });

    it("should contain the correct wbnb address", async () => {
      expect((await latteSwapOptimalDeposit.wbnb()).toLowerCase()).to.be.eq(wbnb.address.toLowerCase());
    });
  });

  describe("#optimalAddLiquidity()", () => {
    it("should add an initial liquidity", async () => {
      const [sortedToken0, sortedToken1] = sortsBefore(token0.address, token1.address)
        ? [token0, token1]
        : [token1, token0];
      const token0Amount = ethers.utils.parseEther("1");
      const token1Amount = ethers.utils.parseEther("4");
      const aliceAddress = await alice.getAddress();
      const deployerAddress = await deployer.getAddress();
      // sqrt(1*4) - MINIMUM_LIQUIDITY
      // 2*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther("2");
      // approve tokens
      await sortedToken0.approve(latteSwapOptimalDeposit.address, MaxUint256);
      await sortedToken1.approve(latteSwapOptimalDeposit.address, MaxUint256);

      // add initial liquidity
      await expect(
        latteSwapOptimalDeposit.optimalAddLiquidity(
          sortedToken0.address,
          sortedToken1.address,
          token0Amount,
          token1Amount,
          0,
          aliceAddress,
          MaxUint256
        )
      )
        .to.emit(sortedToken0, "Transfer")
        .withArgs(deployerAddress, latteSwapOptimalDeposit.address, token0Amount)
        .to.emit(sortedToken1, "Transfer")
        .withArgs(deployerAddress, latteSwapOptimalDeposit.address, token1Amount)
        .to.emit(sortedToken0, "Transfer")
        .withArgs(latteSwapOptimalDeposit.address, nonNativePair.address, token0Amount)
        .to.emit(sortedToken1, "Transfer")
        .withArgs(latteSwapOptimalDeposit.address, nonNativePair.address, token1Amount)
        .to.emit(nonNativePair, "Transfer")
        .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
        .to.emit(nonNativePair, "Transfer")
        .withArgs(AddressZero, aliceAddress, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(nonNativePair, "Sync")
        .withArgs(token0Amount, token1Amount)
        .to.emit(nonNativePair, "Mint")
        .withArgs(latteSwapRouter.address, token0Amount, token1Amount);

      expect(await nonNativePair.balanceOf(aliceAddress)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY));
    });

    it("should add an additional liquidity", async () => {
      const [sortedToken0, sortedToken1] = sortsBefore(token0.address, token1.address)
        ? [token0, token1]
        : [token1, token0];
      const token0Amount = ethers.utils.parseEther("10000");
      const token1Amount = ethers.utils.parseEther("10000");
      const aliceAddress = await alice.getAddress();
      const deployerAddress = await deployer.getAddress();
      // sqrt(1*1) - MINIMUM_LIQUIDITY
      // 1*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther("10000");
      // approve tokens
      await sortedToken0.approve(latteSwapOptimalDeposit.address, MaxUint256);
      await sortedToken1.approve(latteSwapOptimalDeposit.address, MaxUint256);

      // add initial liquidity
      await latteSwapOptimalDeposit.optimalAddLiquidity(
        sortedToken0.address,
        sortedToken1.address,
        token0Amount,
        token1Amount,
        0,
        deployerAddress,
        MaxUint256
      );

      // add additional liquidity
      const token0Amount2 = ethers.utils.parseEther("4");
      const token1Amount2 = ethers.utils.parseEther("2");
      await expect(
        latteSwapOptimalDeposit.optimalAddLiquidity(
          sortedToken0.address,
          sortedToken1.address,
          token0Amount2,
          token1Amount2,
          0,
          aliceAddress,
          MaxUint256
        )
      )
        .to.emit(sortedToken0, "Transfer")
        .withArgs(deployerAddress, latteSwapOptimalDeposit.address, token0Amount2)
        .to.emit(sortedToken1, "Transfer")
        .withArgs(deployerAddress, latteSwapOptimalDeposit.address, token1Amount2);

      expect(await nonNativePair.balanceOf(aliceAddress)).to.eq("2998698513177453476");
    });
  });

  describe("#optimalAddLiquidityBNB()", () => {
    it("should add an initial liquidity", async () => {
      const [sortedToken0, sortedToken1] = sortsBefore(token0.address, wbnb.address) ? [token0, wbnb] : [wbnb, token0];
      const token0Amount = ethers.utils.parseEther("1");
      const bnbAmount = ethers.utils.parseEther("4");
      const [sortedToken0Amount, sortedToken1Amount] = sortsBefore(token0.address, wbnb.address)
        ? [token0Amount, bnbAmount]
        : [bnbAmount, token0Amount];
      const aliceAddress = await alice.getAddress();
      // sqrt(1*4) - MINIMUM_LIQUIDITY
      // 2*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther("2");
      // approve tokens
      await sortedToken0.approve(latteSwapOptimalDeposit.address, MaxUint256);
      await sortedToken1.approve(latteSwapOptimalDeposit.address, MaxUint256);

      // add initial liquidity
      await expect(
        latteSwapOptimalDeposit.optimalAddLiquidityBNB(token0.address, token0Amount, 0, aliceAddress, MaxUint256, {
          value: bnbAmount,
        })
      )
        .to.emit(nativePair, "Transfer")
        .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
        .to.emit(nativePair, "Transfer")
        .withArgs(AddressZero, aliceAddress, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(nativePair, "Sync")
        .withArgs(sortedToken0Amount, sortedToken1Amount)
        .to.emit(nativePair, "Mint")
        .withArgs(latteSwapRouter.address, sortedToken0Amount, sortedToken1Amount);

      expect(await nativePair.balanceOf(aliceAddress)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY));
    });

    it("should add an additional liquidity", async () => {
      const [sortedToken0, sortedToken1] = sortsBefore(token0.address, wbnb.address) ? [token0, wbnb] : [wbnb, token0];
      const token0Amount = ethers.utils.parseEther("1");
      const bnbAmount = ethers.utils.parseEther("1");
      const [sortedToken0Amount, sortedToken1Amount] = sortsBefore(token0.address, wbnb.address)
        ? [token0Amount, bnbAmount]
        : [bnbAmount, token0Amount];
      const aliceAddress = await alice.getAddress();
      const deployerAddress = await deployer.getAddress();
      // sqrt(1*1) - MINIMUM_LIQUIDITY
      // 1*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther("1");
      // approve tokens
      await sortedToken0.approve(latteSwapOptimalDeposit.address, MaxUint256);
      await sortedToken1.approve(latteSwapOptimalDeposit.address, MaxUint256);

      // add initial liquidity
      await latteSwapOptimalDeposit.optimalAddLiquidityBNB(
        token0.address,
        token0Amount,
        0,
        deployerAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      );

      // add additional liquidity
      const token0Amount2 = ethers.utils.parseEther("4");
      const bnbAmount2 = ethers.utils.parseEther("2");
      await latteSwapOptimalDeposit.optimalAddLiquidityBNB(token0.address, token0Amount2, 0, aliceAddress, MaxUint256, {
        value: bnbAmount2,
      });
      expect(await nativePair.balanceOf(aliceAddress)).to.eq("2871890905202394504");
    });
  });
});
