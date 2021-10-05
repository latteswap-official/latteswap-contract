import { LATTEV2, LATTEV2__factory, LATTE__factory, LATTE } from "../../../typechain";
import { ethers, upgrades } from "hardhat";
import { parseBalanceMap } from "../../../utils/merkle/parse-balance-map";
import { BigNumber } from "ethers";
import { expect } from "chai";
import { formatUnits } from "ethers/lib/utils";
import { formatBigNumber } from "../../../utils/format";
import { smoddit, ModifiableContract } from "@eth-optimism/smock";

export interface IClaims {
  [account: string]: {
    index: number;
    amount: string;
    proof: string[];
  };
}

export interface ILatteConfigUnitTestFixtureDTO {
  latteV2: LATTEV2;
  latteV1: ModifiableContract;
}

export async function latteV2UnitTestFixture(): Promise<ILatteConfigUnitTestFixtureDTO> {
  const [deployer, alice, bob, eve] = await ethers.getSigners();

  const LATTE = await smoddit("LATTE", deployer);
  const latteV1: ModifiableContract = await LATTE.deploy(
    await deployer.getAddress(),
    (await ethers.provider.getBlockNumber()) + 100,
    (await ethers.provider.getBlockNumber()) + 200
  );
  await latteV1.deployed();

  // Mint LATTE for testing purpose
  await latteV1.mint(await deployer.getAddress(), ethers.utils.parseEther("888888888"));
  await latteV1.mint(await bob.getAddress(), ethers.utils.parseEther("300"));
  await latteV1.mint(await eve.getAddress(), ethers.utils.parseEther("250"));

  // Deploy LATTEV2
  const LATTEV2 = (await ethers.getContractFactory("LATTEV2", deployer)) as LATTEV2__factory;
  const latteV2 = (await LATTEV2.deploy(latteV1.address)) as LATTEV2;
  await latteV2.deployed();

  return { latteV2, latteV1 };
}
