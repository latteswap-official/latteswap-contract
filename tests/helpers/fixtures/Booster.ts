import { MockProvider } from "ethereum-waffle";
import { BigNumber, Signer, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  BeanBag,
  BeanBag__factory,
  Booster,
  Booster__factory,
  LATTE,
  LATTE__factory,
  SimpleToken,
  SimpleToken__factory,
  MockWBNB,
  MockWBNB__factory,
  WNativeRelayer__factory,
  WNativeRelayer,
  BoosterConfig,
  MasterBarista,
  LatteNFT,
} from "../../../typechain";
import { ModifiableContract, smoddit } from "@eth-optimism/smock";

export interface IBoosterUnitTestFixtureDTO {
  LATTE_START_BLOCK: number;
  LATTE_PER_BLOCK: BigNumber;
  booster: Booster;
  masterBarista: ModifiableContract;
  boosterConfig: ModifiableContract;
  stakingTokens: Array<SimpleToken>;
  latteToken: LATTE;
  nftToken: ModifiableContract;
  beanBag: BeanBag;
  wbnb: MockWBNB;
  wNativeRelayer: WNativeRelayer;
  latteNft: ModifiableContract;
  signatureFn: (signer: Signer, msg?: string) => Promise<string>;
}

export async function boosterUnitTestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<IBoosterUnitTestFixtureDTO> {
  const LATTE_START_BLOCK = 5;
  const LATTE_PER_BLOCK = ethers.utils.parseEther("10");
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

  // Deploy mocked MasterBarista
  const MasterBarista = await smoddit("MasterBarista", deployer);
  const mockMasterBarista: ModifiableContract = await MasterBarista.deploy();
  await (mockMasterBarista as unknown as MasterBarista).initialize(
    latteToken.address,
    beanBag.address,
    await dev.getAddress(),
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK
  );

  await latteToken.transferOwnership(mockMasterBarista.address);
  await beanBag.transferOwnership(mockMasterBarista.address);

  // Deploy mocked stake tokens
  const stakingTokens = [];
  for (let i = 0; i < 4; i++) {
    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    const simpleToken = (await SimpleToken.deploy(`STOKEN${i}`, `STOKEN${i}`)) as SimpleToken;
    await simpleToken.deployed();
    stakingTokens.push(simpleToken);
  }

  // Deploy mocked ERC-721
  const MockERC721 = await smoddit("MockERC721", deployer);
  const mockERC721: ModifiableContract = await MockERC721.deploy(`NFT`, `NFT`);

  const LatteNft = await smoddit("LatteNFT", deployer);
  const latteNft = await LatteNft.deploy();
  await (latteNft as unknown as LatteNFT).initialize("baseURI");
  await latteNft.smodify.put({
    latteNFTToCategory: {
      0: 1,
    },
  });

  // Deploy mocked booster config
  const BoosterConfigFactory = await smoddit("BoosterConfig", deployer);
  const mockBoosterConfig = await BoosterConfigFactory.deploy();
  await (mockBoosterConfig as unknown as BoosterConfig).initialize();

  const WBNB = (await ethers.getContractFactory("MockWBNB", deployer)) as MockWBNB__factory;
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();

  const WNativeRelayer = (await ethers.getContractFactory("WNativeRelayer", deployer)) as WNativeRelayer__factory;
  const wNativeRelayer = await WNativeRelayer.deploy(wbnb.address);
  await await wNativeRelayer.deployed();

  // Deploy Booster
  const Booster = (await ethers.getContractFactory("Booster", deployer)) as Booster__factory;
  const booster = (await upgrades.deployProxy(Booster, [
    latteToken.address,
    mockMasterBarista.address,
    mockBoosterConfig.address,
    wNativeRelayer.address,
    wbnb.address,
  ])) as Booster;
  await booster.deployed();

  await wNativeRelayer.setCallerOk([booster.address], true);

  const signatureFn = async (signer: Signer, msg = "I am an EOA"): Promise<string> => {
    return await signer.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(msg))));
  };

  return {
    LATTE_PER_BLOCK,
    LATTE_START_BLOCK,
    booster,
    masterBarista: mockMasterBarista,
    boosterConfig: mockBoosterConfig,
    stakingTokens,
    latteToken,
    nftToken: mockERC721,
    beanBag,
    signatureFn,
    wbnb,
    wNativeRelayer,
    latteNft,
  } as IBoosterUnitTestFixtureDTO;
}
