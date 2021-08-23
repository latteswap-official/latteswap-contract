import { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import LatteSwapPairAbi from "../../artifacts/contracts/swap/LatteSwapPair.sol/LatteSwapPair.json";
import {
  LatteSwapFactory,
  LatteSwapFactory__factory,
  LatteSwapPair__factory,
  SimpleToken,
  SimpleToken__factory,
  WBNB,
  WBNB__factory,
} from "../../typechain";
import { getCreate2Address, sortsBefore } from "../helpers";
import config from "@latteswap/latteswap-contract-config/develop.json";

chai.use(solidity);
const { expect } = chai;

describe("LatteSwapFactory", () => {
  // LatteSwap instances
  let latteSwapFactory: LatteSwapFactory;

  // Token instances
  let wbnb: WBNB;
  let token0: SimpleToken;
  let token1: SimpleToken;

  // Accounts
  let deployer: Signer;
  let alice: Signer;

  beforeEach(async () => {
    [deployer, alice] = await ethers.getSigners();

    const WBNB = (await ethers.getContractFactory("WBNB", deployer)) as WBNB__factory;
    wbnb = await WBNB.deploy();

    const LatteSwapFactory = (await ethers.getContractFactory(
      "LatteSwapFactory",
      deployer
    )) as LatteSwapFactory__factory;
    latteSwapFactory = await LatteSwapFactory.deploy(await deployer.getAddress());

    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    token0 = await SimpleToken.deploy("TOKEN0", "TOKEN0");
    token0.mint(await deployer.getAddress(), ethers.utils.parseEther("8888888888"));

    token1 = await SimpleToken.deploy("TOKEN1", "TOKEN1");
    token1.mint(await deployer.getAddress(), ethers.utils.parseEther("999999999"));
  });

  context("initialized states", () => {
    it("should return the correct pairHash", async () => {
      expect(await latteSwapFactory.pairCodeHash()).to.be.eq(ethers.utils.keccak256(LatteSwapPairAbi.bytecode));
      expect(await latteSwapFactory.pairCodeHash()).to.be.eq(config.InitCodeHash);
    });

    it("should has a correct initial state variables", async () => {
      expect(await latteSwapFactory.feeTo()).to.be.eq(ethers.constants.AddressZero);
      expect(await latteSwapFactory.feeToSetter()).to.be.eq(await deployer.getAddress());
      expect(await latteSwapFactory.allPairsLength()).to.be.eq(0);
    });
  });

  context("createPair", () => {
    it("should create a pair", async () => {
      const create2Address = getCreate2Address(
        latteSwapFactory.address,
        [token0.address, token1.address],
        LatteSwapPairAbi.bytecode
      );
      const [sortedToken0, sortedToken1] = sortsBefore(token0.address, token1.address)
        ? [token0.address, token1.address]
        : [token1.address, token0.address];
      await expect(latteSwapFactory.createPair(token0.address, token1.address))
        .to.emit(latteSwapFactory, "PairCreated")
        .withArgs(sortedToken0, sortedToken1, create2Address, 1);

      // LP address should be the same as create2Address for both [token0, token1] and [token1, token0]
      expect(await latteSwapFactory.getPair(token0.address, token1.address)).to.be.eq(create2Address);
      expect(await latteSwapFactory.getPair(token1.address, token0.address)).to.be.eq(create2Address);

      // allPairs(0) must be the create2Address
      expect(await latteSwapFactory.allPairs(0)).to.be.eq(create2Address);

      // allPairsLength must be 1
      expect(await latteSwapFactory.allPairsLength()).to.be.eq(1);

      // expect that pair contract should have the right state variables
      const t0t1Pair = LatteSwapPair__factory.connect(create2Address, deployer);
      expect(await t0t1Pair.factory()).to.be.eq(latteSwapFactory.address);
      expect(await t0t1Pair.token0()).to.be.eq(sortedToken0);
      expect(await t0t1Pair.token1()).to.be.eq(sortedToken1);
    });

    it("should revert if the given pair is existed", async () => {
      const create2Address = getCreate2Address(
        latteSwapFactory.address,
        [token0.address, token1.address],
        LatteSwapPairAbi.bytecode
      );
      const [sortedToken0, sortedToken1] =
        token0.address.toLowerCase() < token1.address.toLowerCase()
          ? [token0.address, token1.address]
          : [token1.address, token0.address];
      await expect(latteSwapFactory.createPair(token0.address, token1.address))
        .to.emit(latteSwapFactory, "PairCreated")
        .withArgs(sortedToken0, sortedToken1, create2Address, 1);

      await expect(latteSwapFactory.createPair(sortedToken0, sortedToken1)).to.be.revertedWith(
        "LatteSwapFactory::createPair::PAIR_EXISTS"
      );
      await expect(latteSwapFactory.createPair(sortedToken1, sortedToken0)).to.be.revertedWith(
        "LatteSwapFactory::createPair::PAIR_EXISTS"
      );
    });
  });

  context("setFeeTo", () => {
    it("should set feeTo to the given address", async () => {
      await latteSwapFactory.setFeeTo(await alice.getAddress());
      expect(await latteSwapFactory.feeTo()).to.be.eq(await alice.getAddress());
    });

    it("should revert if non-feeToSetter try to set feeTo", async () => {
      const latteSwapFactoryAsAlice = LatteSwapFactory__factory.connect(latteSwapFactory.address, alice);
      await expect(latteSwapFactoryAsAlice.setFeeTo(await deployer.getAddress())).to.be.revertedWith(
        "LatteSwapFactory::setFeeTo::FORBIDDEN"
      );
    });
  });

  context("setFeeToSetter", () => {
    it("should set FeeToSetter to the given address", async () => {
      await latteSwapFactory.setFeeToSetter(await alice.getAddress());
      expect(await latteSwapFactory.feeToSetter()).to.be.eq(await alice.getAddress());
    });

    it("should revert if non-feeToSetter try to set FeeToSetter", async () => {
      const latteSwapFactoryAsAlice = LatteSwapFactory__factory.connect(latteSwapFactory.address, alice);
      await expect(latteSwapFactoryAsAlice.setFeeToSetter(await deployer.getAddress())).to.be.revertedWith(
        "LatteSwapFactory::setFeeToSetter::FORBIDDEN"
      );
    });
  });
});
