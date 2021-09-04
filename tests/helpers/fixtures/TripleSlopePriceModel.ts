import { TripleSlopePriceModel, TripleSlopePriceModel__factory } from "../../../typechain";
import { ethers, upgrades } from "hardhat";
import { parseEther } from "ethers/lib/utils";

export interface ITripleSlopePriceModelUnitTestFixtureDTO {
  priceModel: TripleSlopePriceModel;
}

export async function tripleSlopePriceModelUnitTestFixture(): Promise<ITripleSlopePriceModelUnitTestFixtureDTO> {
  const [deployer, alice, bob, eve] = await ethers.getSigners();

  // Deploy LatteNFT
  const TripleSlopePriceModel = (await ethers.getContractFactory(
    "TripleSlopePriceModel",
    deployer
  )) as TripleSlopePriceModel__factory;
  const priceModel = (await TripleSlopePriceModel.deploy([
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
    {
      categoryId: 1,
      price: parseEther("2.82"),
      slope: 10000,
    },
    {
      categoryId: 1,
      price: parseEther("4.93"),
      slope: 5000,
    },
    {
      categoryId: 1,
      price: parseEther("6.69"),
      slope: 2000,
    },
  ])) as TripleSlopePriceModel;
  await priceModel.deployed();

  return { priceModel };
}
