import { OGNFT__factory, OGNFT, MockWBNB__factory, WNativeRelayer__factory, SimpleToken__factory, SimpleToken, BeanBag__factory, LATTE__factory, BeanBag, LATTE, MockWBNB, WNativeRelayer, OGOwnerToken, MockMasterBarista, MockOGOwnerToken } from "../../../typechain";
import { ethers, upgrades } from "hardhat";
import { smoddit, ModifiableContract } from "@eth-optimism/smock";
import { BigNumber, constants } from "ethers";


export interface IOGNFTUnitTestFixtureDTO {
    ogNFT: OGNFT
    wbnb: MockWBNB,
    wNativeRelayer: WNativeRelayer
    stakingTokens: Array<SimpleToken>
    masterBarista: ModifiableContract
    beanBag: BeanBag
    latteToken: LATTE
    LATTE_START_BLOCK: number
    LATTE_PER_BLOCK: BigNumber,
    ogOwnerToken: ModifiableContract
}

export async function ogNFTUnitTestFixture(): Promise<IOGNFTUnitTestFixtureDTO> {
  const LATTE_START_BLOCK = 5;
  const LATTE_PER_BLOCK = ethers.utils.parseEther('10');
  const [deployer, alice, bob, dev] = await ethers.getSigners()
  // Deploy LATTE
  const LATTE = (await ethers.getContractFactory(
    "LATTE",
    deployer
  )) as LATTE__factory;
  const latteToken = await LATTE.deploy(await dev.getAddress(), 132, 137)
  await latteToken.deployed()
  // Mint LATTE for testing purpose
  await latteToken.mint(await deployer.getAddress(), ethers.utils.parseEther('888888888'))
  // Deploy BeanBag
  const BeanBag = (await ethers.getContractFactory(
      "BeanBag",
      deployer
    )) as BeanBag__factory;
  const beanBag = await BeanBag.deploy(latteToken.address)
  await beanBag.deployed()
  const MasterBarista = await smoddit(
    "MockMasterBarista",
    deployer
  );
  const masterBarista: ModifiableContract = await MasterBarista.deploy(
      latteToken.address,
      beanBag.address,
      (await dev.getAddress()),
      LATTE_PER_BLOCK,
      LATTE_START_BLOCK,
  )
  await latteToken.transferOwnership(masterBarista.address)
  await beanBag.transferOwnership(masterBarista.address)

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
  // Deploy OG Owner Token
  const OGOwnerToken = (await smoddit("MockOGOwnerToken", deployer))
  const ogOwnerToken = await OGOwnerToken.deploy("OGOWNERTOKEN", "OGOWNERTOKEN", constants.AddressZero)
  await ogOwnerToken.deployed()
  // Deploy OGNFT
  const OGNFT = (await ethers.getContractFactory("OGNFT", deployer)) as OGNFT__factory
  const ogNFT = await upgrades.deployProxy(OGNFT, ["baseURI", latteToken.address, masterBarista.address], {initializer: 'initialize(string,address,address)'}) as OGNFT
  await ogNFT.deployed()
  await ogNFT.setCategoryOGOwnerToken(0, ogOwnerToken.address)


  await (ogOwnerToken as unknown as MockOGOwnerToken).setOkHolders([ogNFT.address, masterBarista.address], true)
  await (ogOwnerToken as unknown as MockOGOwnerToken).transferOwnership(ogNFT.address)

  await masterBarista.smodify.put({
    stakeTokenCallerAllowancePool: {
      [ogOwnerToken.address]: true
    },
  })

  await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(ogOwnerToken.address, ogNFT.address)
  await ((masterBarista as unknown) as MockMasterBarista).addPool(ogOwnerToken.address, '1000')

  return { ogNFT, wNativeRelayer, wbnb, stakingTokens, masterBarista, beanBag, latteToken, LATTE_START_BLOCK, LATTE_PER_BLOCK, ogOwnerToken  } as IOGNFTUnitTestFixtureDTO
}