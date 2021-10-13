import { MockProvider } from "ethereum-waffle";
import { BigNumber, Signer, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  BeanBag,
  Booster,
  LATTE,
  LATTE__factory,
  SimpleToken,
  SimpleToken__factory,
  MockWBNB,
  WNativeRelayer,
  MasterBarista,
  LatteVault__factory,
  LATTEV2__factory,
  LATTEV2,
  BeanBagV2,
  LatteVault,
  MockWBNB__factory,
  BeanBag__factory,
} from "../../../typechain";
import { ModifiableContract, smoddit } from "@eth-optimism/smock";
import { parseBalanceMap } from "../../../utils/merkle/parse-balance-map";
import { formatBigNumber } from "../../../utils/format";

export interface ILatteVaultUnitTestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  masterBarista: ModifiableContract;
  stakingTokens: Array<SimpleToken>;
  latteToken: LATTEV2;
  beanBag: ModifiableContract;
  wbnb: MockWBNB;
  latteVault: LatteVault;
  signatureFn: (signer: Signer, msg?: string) => Promise<string>;
}

export async function latteVaultUnitTestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<ILatteVaultUnitTestFixtureDTO> {
  const LATTE_START_BLOCK = 5;
  const LATTE_PER_BLOCK = ethers.utils.parseEther("10");
  const [deployer, alice, farmer, dev] = await ethers.getSigners();
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
    [await farmer.getAddress()]: formatBigNumber(ethers.utils.parseEther("300"), "purehex"),
    [await dev.getAddress()]: formatBigNumber(ethers.utils.parseEther("250"), "purehex"),
  });
  const LATTEV2 = (await ethers.getContractFactory("LATTEV2", deployer)) as LATTEV2__factory;
  const latteV2 = (await LATTEV2.deploy(latteToken.address, merkleRoot)) as LATTEV2;
  await latteV2.deployed();

  // Mint LATTE for testing purpose
  await latteV2.grantRole(await latteV2.MINTER_ROLE(), await deployer.getAddress());
  await latteV2.mint(await deployer.getAddress(), ethers.utils.parseEther("888888888"));

  // Deploy BeanBag
  const BeanBag = (await ethers.getContractFactory("BeanBag", deployer)) as BeanBag__factory;
  const beanBag = await BeanBag.deploy(latteToken.address);
  await beanBag.deployed();

  // Deploy BeanBagV2
  const BeanBagV2 = await smoddit("BeanBagV2", deployer);
  const beanV2: ModifiableContract = await BeanBagV2.deploy();
  await (beanV2 as unknown as BeanBagV2).initialize(latteV2.address);

  // Deploy mocked MasterBarista
  const MasterBarista = await smoddit("MasterBarista", deployer);
  const masterBarista: ModifiableContract = await MasterBarista.deploy();
  await (masterBarista as unknown as MasterBarista).initialize(
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK
  );

  // set minter role to master barista
  await latteV2.grantRole(await latteV2.MINTER_ROLE(), masterBarista.address);
  // set beanv2 owner to master barista
  await beanV2.transferOwnership(masterBarista.address);

  await masterBarista.smodify.put({
    latteV2: latteV2.address,
    beanV2: beanV2.address,
    activeLatte: latteV2.address,
    activeBean: beanV2.address,
  });

  // Deploy mocked stake tokens
  const stakingTokens = [];
  for (let i = 0; i < 4; i++) {
    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    const simpleToken = (await SimpleToken.deploy(`STOKEN${i}`, `STOKEN${i}`)) as SimpleToken;
    await simpleToken.deployed();
    stakingTokens.push(simpleToken);
  }

  // Deploy Lattevault
  const LatteVault = (await ethers.getContractFactory(
    "LatteVault",
    (
      await ethers.getSigners()
    )[0]
  )) as LatteVault__factory;
  const latteVault = (await upgrades.deployProxy(LatteVault, [
    latteV2.address,
    beanV2.address,
    masterBarista.address,
    await deployer.getAddress(),
    [await farmer.getAddress()],
  ])) as LatteVault;
  await latteVault.deployed();

  const WBNB = (await ethers.getContractFactory("MockWBNB", deployer)) as MockWBNB__factory;
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();

  const signatureFn = async (signer: Signer, msg = "I am an EOA"): Promise<string> => {
    return await signer.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(msg))));
  };

  return {
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
    latteVault,
    masterBarista: masterBarista,
    stakingTokens,
    latteToken: latteV2,
    beanBag: beanV2,
    signatureFn,
    wbnb,
  } as ILatteVaultUnitTestFixtureDTO;
}
