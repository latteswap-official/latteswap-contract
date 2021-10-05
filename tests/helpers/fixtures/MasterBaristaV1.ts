import { MockProvider } from "ethereum-waffle";
import { BigNumber, providers, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  LATTE__factory,
  LATTE,
  BeanBag__factory,
  MasterBaristaV1,
  SimpleToken__factory,
  BeanBag,
  SimpleToken,
  MockStakeTokenCallerContract__factory,
  MockStakeTokenCallerContract,
  MasterBaristaV1__factory,
  LATTEV2__factory,
  LATTEV2,
} from "../../../typechain";
import { formatBigNumber } from "../../../utils/format";
import { parseBalanceMap } from "../../../utils/merkle/parse-balance-map";

export interface IMasterBaristaV1UnitTestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  LATTE_BONUS_LOCK_UP_BPS: number;
  latteToken: LATTE;
  beanBag: BeanBag;
  masterBarista: MasterBaristaV1;
  stakingTokens: Array<SimpleToken>;
  mockStakeTokenCaller: MockStakeTokenCallerContract;
}

export interface IMasterBaristaV1E2ETestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  LATTE_BONUS_LOCK_UP_BPS: number;
  latteToken: LATTE;
  beanBag: BeanBag;
  masterBarista: MasterBaristaV1;
  stakingTokens: Array<SimpleToken>;
}

export async function masterBaristaV1UnitTestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<IMasterBaristaV1UnitTestFixtureDTO> {
  const LATTE_START_BLOCK = 5;
  const LATTE_PER_BLOCK = ethers.utils.parseEther("10");
  const LATTE_BONUS_LOCK_UP_BPS = 7000;
  const [deployer, bob, alice, dev] = await ethers.getSigners();
  // Deploy LATTE
  const LATTE = (await ethers.getContractFactory("LATTE", deployer)) as LATTE__factory;
  const latteToken = await LATTE.deploy(await dev.getAddress(), 132, 137);
  await latteToken.deployed();

  // Mint LATTE for testing purpose
  await latteToken.mint(await deployer.getAddress(), ethers.utils.parseEther("888888888"));

  // Deploy BeanBag
  const BeanBag = (await ethers.getContractFactory("BeanBag", deployer)) as BeanBag__factory;
  const beanBag = await BeanBag.deploy(latteToken.address);
  await beanBag.deployed();

  // Deploy MasterBaristaV1
  const MasterBarista = (await ethers.getContractFactory("MasterBaristaV1", deployer)) as MasterBaristaV1__factory;
  const masterBarista = (await upgrades.deployProxy(MasterBarista, [
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
  ])) as MasterBaristaV1;

  await masterBarista.setPool(latteToken.address, 1);
  await masterBarista.setPoolAllocBps(latteToken.address, 4000);

  await latteToken.transferOwnership(masterBarista.address);
  await beanBag.transferOwnership(masterBarista.address);

  const stakingTokens = [];
  for (let i = 0; i < 4; i++) {
    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    const simpleToken = await SimpleToken.deploy(`STOKEN${i}`, `STOKEN${i}`);
    await simpleToken.deployed();
    stakingTokens.push(simpleToken);
  }

  const MockStakeTokenCallerContract = (await ethers.getContractFactory(
    "MockStakeTokenCallerContract",
    deployer
  )) as MockStakeTokenCallerContract__factory;
  const mockStakeTokenCaller = await MockStakeTokenCallerContract.deploy(
    latteToken.address,
    stakingTokens[0].address,
    masterBarista.address
  );
  await mockStakeTokenCaller.deployed();

  return {
    LATTE_START_BLOCK,
    LATTE_PER_BLOCK,
    LATTE_BONUS_LOCK_UP_BPS,
    latteToken,
    beanBag,
    masterBarista,
    stakingTokens,
    mockStakeTokenCaller,
  } as IMasterBaristaV1UnitTestFixtureDTO;
}

export async function masterBaristaV1E2ETestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<IMasterBaristaV1E2ETestFixtureDTO> {
  const LATTE_START_BLOCK = 5;
  const LATTE_PER_BLOCK = ethers.utils.parseEther("10");
  const LATTE_BONUS_LOCK_UP_BPS = 7000;
  const [deployer, bob, alice, dev] = await ethers.getSigners();
  // Deploy LATTE
  const LATTE = (await ethers.getContractFactory("LATTE", deployer)) as LATTE__factory;
  const latteToken = await LATTE.deploy(await dev.getAddress(), 132, 137);
  await latteToken.deployed();

  // Mint LATTE for testing purpose
  await latteToken.mint(await deployer.getAddress(), ethers.utils.parseEther("888888888"));

  // Deploy BeanBag
  const BeanBag = (await ethers.getContractFactory("BeanBag", deployer)) as BeanBag__factory;
  const beanBag = await BeanBag.deploy(latteToken.address);
  await beanBag.deployed();

  // Deploy LATTEV2
  const {
    claims: innerClaims,
    merkleRoot,
    tokenTotal,
  } = parseBalanceMap({
    [await alice.getAddress()]: formatBigNumber(ethers.utils.parseEther("200"), "purehex"),
    [await bob.getAddress()]: formatBigNumber(ethers.utils.parseEther("300"), "purehex"),
    [await dev.getAddress()]: formatBigNumber(ethers.utils.parseEther("250"), "purehex"),
  });

  // Deploy MasterBarista
  const MasterBarista = (await ethers.getContractFactory("MasterBaristaV1", deployer)) as MasterBaristaV1__factory;
  const masterBarista = (await upgrades.deployProxy(MasterBarista, [
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
  ])) as MasterBaristaV1;
  await masterBarista.deployed();

  await masterBarista.setPool(latteToken.address, 1);
  await masterBarista.setPoolAllocBps(latteToken.address, 4000);

  await latteToken.transferOwnership(masterBarista.address);
  await beanBag.transferOwnership(masterBarista.address);

  const stakingTokens = [];
  for (let i = 0; i < 4; i++) {
    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    const simpleToken = await SimpleToken.deploy(`STOKEN${i}`, `STOKEN${i}`);
    await simpleToken.deployed();
    stakingTokens.push(simpleToken);
  }

  return {
    LATTE_START_BLOCK,
    LATTE_PER_BLOCK,
    LATTE_BONUS_LOCK_UP_BPS,
    latteToken,
    beanBag,
    masterBarista,
    stakingTokens,
  } as IMasterBaristaV1E2ETestFixtureDTO;
}
