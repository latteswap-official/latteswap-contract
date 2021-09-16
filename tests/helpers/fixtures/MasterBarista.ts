import { MockProvider } from "ethereum-waffle";
import { BigNumber, providers, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  LATTE__factory,
  LATTE,
  BeanBag__factory,
  MasterBarista__factory,
  SimpleToken__factory,
  BeanBag,
  MasterBarista,
  SimpleToken,
  MockStakeTokenCallerContract__factory,
  MockStakeTokenCallerContract,
} from "../../../typechain";

export interface IMasterBaristaUnitTestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  LATTE_BONUS_LOCK_UP_BPS: number;
  latteToken: LATTE;
  beanBag: BeanBag;
  masterBarista: MasterBarista;
  stakingTokens: Array<SimpleToken>;
  mockStakeTokenCaller: MockStakeTokenCallerContract;
}

export interface IMasterBaristaE2ETestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  LATTE_BONUS_LOCK_UP_BPS: number;
  latteToken: LATTE;
  beanBag: BeanBag;
  masterBarista: MasterBarista;
  stakingTokens: Array<SimpleToken>;
}

export async function masterBaristaUnitTestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<IMasterBaristaUnitTestFixtureDTO> {
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

  // Deploy MasterBarista
  const MasterBarista = (await ethers.getContractFactory("MasterBarista", deployer)) as MasterBarista__factory;
  const masterBarista = (await upgrades.deployProxy(MasterBarista, [
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
  ])) as MasterBarista;

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
  } as IMasterBaristaUnitTestFixtureDTO;
}

export async function masterBaristaE2ETestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<IMasterBaristaE2ETestFixtureDTO> {
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

  // Deploy MasterBarista
  const MasterBarista = (await ethers.getContractFactory("MasterBarista", deployer)) as MasterBarista__factory;
  const masterBarista = (await upgrades.deployProxy(MasterBarista, [
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
  ])) as MasterBarista;
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
  } as IMasterBaristaE2ETestFixtureDTO;
}
