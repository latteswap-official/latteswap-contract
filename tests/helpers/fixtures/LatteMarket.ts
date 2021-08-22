import { MockProvider } from "ethereum-waffle";
import { BigNumber, Signer, Wallet } from "ethers";
import { ethers, upgrades  } from "hardhat"
import { SimpleToken, SimpleToken__factory, MockWBNB, MockWBNB__factory, WNativeRelayer__factory, WNativeRelayer, WBNB, MockLatteNFT__factory, LatteMarket__factory, LatteMarket, LatteNFT, MockLatteNFT } from "../../../typechain";
import { ModifiableContract, smoddit } from '@eth-optimism/smock'
import { latestBlockNumber } from "../time";

export interface ILatteMarketUnitTestFixtureDTO {
  FEE_ADDR: string,
  FEE_BPS: number,
  stakingTokens: Array<SimpleToken>
  wbnb: MockWBNB,
  wNativeRelayer: WNativeRelayer,
  latteNFT: ModifiableContract,
  latteMarket: LatteMarket
  startingBlock: BigNumber
  signatureFn: (signer: Signer, msg?: string) => Promise<string>,
}

export async function latteMarketUnitTestFixture(maybeWallets?: Wallet[], maybeProvider?: MockProvider): Promise<ILatteMarketUnitTestFixtureDTO> {

  const [deployer, bob, alice, dev] = await ethers.getSigners()
  const FEE_ADDR = await dev.getAddress()
  const FEE_BPS = 1000

   // Deploy LatteNFT
   const LatteNFT = (await smoddit("MockLatteNFT", deployer)) 
   const latteNFT = await LatteNFT.deploy("baseURI")
   await latteNFT.deployed()

  // Deploy mocked stake tokens
  const stakingTokens = new Array();
  for(let i = 0; i < 4; i++) {
    const SimpleToken = (await ethers.getContractFactory(
        "SimpleToken",
        deployer
    )) as SimpleToken__factory;
    const simpleToken = await SimpleToken.deploy(`STOKEN${i}`, `STOKEN${i}`) as SimpleToken
    await simpleToken.deployed();
    stakingTokens.push(simpleToken);
  }

  const WBNB = (await ethers.getContractFactory(
    "MockWBNB",
    deployer
  )) as MockWBNB__factory; 
  const wbnb = await WBNB.deploy()
  await wbnb.deployed()

  const WNativeRelayer = (await ethers.getContractFactory(
    "WNativeRelayer",
    deployer
  )) as WNativeRelayer__factory; 
  const wNativeRelayer = await WNativeRelayer.deploy(wbnb.address)
  await await wNativeRelayer.deployed()

  const LatteMarket = await ethers.getContractFactory(
    "LatteMarket",
    deployer
  ) as LatteMarket__factory
  const latteMarket = await upgrades.deployProxy(LatteMarket, [FEE_ADDR, FEE_BPS, wNativeRelayer.address, wbnb.address]) as LatteMarket
  await latteMarket.deployed()

  await wNativeRelayer.setCallerOk([latteMarket.address], true)

  const signatureFn = async (signer: Signer, msg = 'I am an EOA'): Promise<string> => {
    return await signer.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(msg))))
  }

  const startingBlock = await latestBlockNumber()

  return {
    stakingTokens,
    signatureFn,
    wbnb,
    wNativeRelayer,
    latteNFT,
    latteMarket,
    startingBlock,
  } as ILatteMarketUnitTestFixtureDTO
}
