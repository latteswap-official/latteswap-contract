import { LatteNFT, LatteNFT__factory } from "../../../typechain";
import { ethers, upgrades } from "hardhat";

export interface ILatteConfigUnitTestFixtureDTO {
  latteNFT: LatteNFT;
}

export async function latteNFTUnitTestFixture(): Promise<ILatteConfigUnitTestFixtureDTO> {
  const [deployer, alice, bob, eve] = await ethers.getSigners();

  // Deploy LatteNFT
  const LatteNFT = (await ethers.getContractFactory("LatteNFT", deployer)) as LatteNFT__factory;
  const latteNFT = (await upgrades.deployProxy(LatteNFT, ["baseURI"])) as LatteNFT;
  await latteNFT.deployed();

  return { latteNFT };
}
