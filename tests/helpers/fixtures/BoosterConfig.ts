import { BoosterConfig, BoosterConfig__factory } from "../../../typechain";
import { ethers, upgrades } from "hardhat";

export interface IBoosterConfigUnitTestFixtureDTO {
    boosterConfig: BoosterConfig
}

export async function boosterConfigUnitTestFixture(): Promise<IBoosterConfigUnitTestFixtureDTO> {
    const [deployer, alice, bob, eve] = await ethers.getSigners()

    // Deploy BoosterConfig
    const BoosterConfig = (await ethers.getContractFactory(
        "BoosterConfig",
        deployer
    )) as BoosterConfig__factory;
    const boosterConfig = await upgrades.deployProxy(BoosterConfig) as BoosterConfig
    await boosterConfig.deployed()

    return { boosterConfig }
} 