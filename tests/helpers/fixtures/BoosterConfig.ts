import { BoosterConfig, BoosterConfig__factory, LatteNFT } from "../../../typechain";
import { ethers, upgrades } from "hardhat";
import { ModifiableContract, smoddit } from "@eth-optimism/smock";

export interface IBoosterConfigUnitTestFixtureDTO {
  boosterConfig: BoosterConfig;
  latteNft: ModifiableContract;
}

export async function boosterConfigUnitTestFixture(): Promise<IBoosterConfigUnitTestFixtureDTO> {
  const [deployer, alice, bob, eve] = await ethers.getSigners();

  // Deploy BoosterConfig
  const BoosterConfig = (await ethers.getContractFactory("BoosterConfig", deployer)) as BoosterConfig__factory;
  const boosterConfig = (await upgrades.deployProxy(BoosterConfig)) as BoosterConfig;
  await boosterConfig.deployed();

  const LatteNft = await smoddit("LatteNFT", deployer);
  const latteNft = await LatteNft.deploy();
  await (latteNft as unknown as LatteNFT).initialize("baseURI");
  await latteNft.smodify.put({
    latteNFTToCategory: {
      0: 1,
    },
  });

  return { boosterConfig, latteNft };
}
