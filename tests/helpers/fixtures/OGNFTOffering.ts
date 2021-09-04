import { MockProvider } from "ethereum-waffle";
import { BigNumber, Signer, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  SimpleToken,
  SimpleToken__factory,
  MockWBNB,
  MockWBNB__factory,
  WNativeRelayer__factory,
  WNativeRelayer,
  WBNB,
  LatteNFT,
} from "../../../typechain";
import { ModifiableContract, smoddit } from "@eth-optimism/smock";
import { latestBlockNumber } from "../time";
import { OGNFTOffering__factory } from "../../../typechain/factories/OGNFTOffering__factory";
import { OGNFTOffering } from "../../../typechain/OGNFTOffering";
import { parseEther } from "@ethersproject/units";

export interface IOgOfferingUnitTestFixtureDTO {
  FEE_ADDR: string;
  FEE_BPS: number;
  stakingTokens: Array<SimpleToken>;
  wbnb: MockWBNB;
  wNativeRelayer: WNativeRelayer;
  ogNFT: ModifiableContract;
  ogOffering: OGNFTOffering;
  startingBlock: BigNumber;
  priceModel: ModifiableContract;
  signatureFn: (signer: Signer, msg?: string) => Promise<string>;
}

export async function ogOfferingUnitTestFixture(
  maybeWallets?: Wallet[],
  maybeProvider?: MockProvider
): Promise<IOgOfferingUnitTestFixtureDTO> {
  const [deployer, bob, alice, dev] = await ethers.getSigners();
  const FEE_ADDR = await dev.getAddress();
  const FEE_BPS = 1000;

  // Deploy LatteNFT
  const LatteNFT = await smoddit("LatteNFT", deployer);
  const latteNFT = await LatteNFT.deploy();
  await (latteNFT as unknown as LatteNFT).initialize("baseURI");

  // Deploy mocked stake tokens
  const stakingTokens = [];
  for (let i = 0; i < 4; i++) {
    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    const simpleToken = (await SimpleToken.deploy(`STOKEN${i}`, `STOKEN${i}`)) as SimpleToken;
    await simpleToken.deployed();
    stakingTokens.push(simpleToken);
  }

  const WBNB = (await ethers.getContractFactory("MockWBNB", deployer)) as MockWBNB__factory;
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();

  const WNativeRelayer = (await ethers.getContractFactory("WNativeRelayer", deployer)) as WNativeRelayer__factory;
  const wNativeRelayer = await WNativeRelayer.deploy(wbnb.address);
  await await wNativeRelayer.deployed();

  const TripleSlopeModel = await smoddit("TripleSlopePriceModel", deployer);
  const priceModel = await TripleSlopeModel.deploy([
    {
      categoryId: 0,
      price: parseEther("1.61"),
      slope: 10000,
    },
    {
      categoryId: 0,
      price: parseEther("2.69"),
      slope: 5000,
    },
    {
      categoryId: 0,
      price: parseEther("3.59"),
      slope: 2000,
    },
  ]);
  await priceModel.deployed();

  const OGNFTOffering = (await ethers.getContractFactory("OGNFTOffering", deployer)) as OGNFTOffering__factory;
  const ogOffering = (await upgrades.deployProxy(OGNFTOffering, [
    latteNFT.address,
    FEE_ADDR,
    FEE_BPS,
    wNativeRelayer.address,
    wbnb.address,
    priceModel.address,
  ])) as OGNFTOffering;
  await ogOffering.deployed();

  await (latteNFT as unknown as LatteNFT).grantRole(await latteNFT.MINTER_ROLE(), ogOffering.address);

  await wNativeRelayer.setCallerOk([ogOffering.address], true);

  const signatureFn = async (signer: Signer, msg = "I am an EOA"): Promise<string> => {
    return await signer.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(msg))));
  };

  const startingBlock = await latestBlockNumber();

  return {
    stakingTokens,
    signatureFn,
    wbnb,
    wNativeRelayer,
    ogNFT: latteNFT,
    ogOffering,
    startingBlock,
    priceModel,
  } as IOgOfferingUnitTestFixtureDTO;
}
