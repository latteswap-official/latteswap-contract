import { MockProvider } from "ethereum-waffle";
import { BigNumber, providers, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import { BeanBagV2 } from "../../../typechain";
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
  LATTEV2__factory,
  LATTEV2,
} from "../../../typechain";
import { formatBigNumber } from "../../../utils/format";
import { parseBalanceMap } from "../../../utils/merkle/parse-balance-map";

export interface IMasterBaristaUnitTestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  LATTE_BONUS_LOCK_UP_BPS: number;
  latteToken: LATTE;
  beanBag: BeanBag;
  beanV2: BeanBagV2;
  latteV2: LATTEV2;
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
  beanV2: BeanBagV2;
  latteV2: LATTEV2;
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
  const LATTEV2 = (await ethers.getContractFactory("LATTEV2", deployer)) as LATTEV2__factory;
  const latteV2 = (await LATTEV2.deploy(latteToken.address, merkleRoot)) as LATTEV2;
  await latteV2.deployed();

  // Mint LATTE for testing purpose
  await latteToken.mint(await deployer.getAddress(), ethers.utils.parseEther("888888888"));

  // Deploy BeanBag
  const BeanBag = (await ethers.getContractFactory("BeanBag", deployer)) as BeanBag__factory;
  const beanBag = await BeanBag.deploy(latteToken.address);
  await beanBag.deployed();

  // Deploy BeanBagV2
  const BeanBagV2 = await ethers.getContractFactory("BeanBagV2", deployer);
  const beanV2 = (await upgrades.deployProxy(BeanBagV2, [latteV2.address])) as BeanBagV2;
  await beanV2.deployed();

  // Deploy MasterBarista
  const MasterBarista = (await ethers.getContractFactory("MasterBarista", deployer)) as MasterBarista__factory;
  const masterBarista = (await upgrades.deployProxy(MasterBarista, [
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
  ])) as MasterBarista;

  // set minter role to master barista
  await latteV2.grantRole(await latteV2.MINTER_ROLE(), masterBarista.address);
  // set beanv2 owner to master barista
  await beanV2.transferOwnership(masterBarista.address);

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
    latteV2,
    beanBag,
    beanV2,
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
  const LATTEV2 = (await ethers.getContractFactory("LATTEV2", deployer)) as LATTEV2__factory;
  const latteV2 = (await LATTEV2.deploy(latteToken.address, merkleRoot)) as LATTEV2;
  await latteV2.deployed();

  // Mint LATTE for testing purpose
  await latteToken.mint(await deployer.getAddress(), ethers.utils.parseEther("888888888"));

  // Deploy BeanBag
  const BeanBag = (await ethers.getContractFactory("BeanBag", deployer)) as BeanBag__factory;
  const beanBag = await BeanBag.deploy(latteToken.address);
  await beanBag.deployed();

  // Deploy BeanBagV2
  const BeanBagV2 = await ethers.getContractFactory("BeanBagV2", deployer);
  const beanV2 = (await upgrades.deployProxy(BeanBagV2, [latteV2.address])) as BeanBagV2;
  await beanV2.deployed();

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

  // set minter role to master barista
  await latteV2.grantRole(await latteV2.MINTER_ROLE(), masterBarista.address);
  // set beanv2 owner to master barista
  await beanV2.transferOwnership(masterBarista.address);

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
    latteV2,
    beanBag,
    beanV2,
    masterBarista,
    stakingTokens,
  } as IMasterBaristaE2ETestFixtureDTO;
}
