import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import {
  BoosterConfig,
  BoosterConfig__factory,
  Booster,
  Booster__factory,
  WNativeRelayer__factory,
  WNativeRelayer,
} from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
  ░██╗░░░░░░░██╗░█████╗░██████╗░███╗░░██╗██╗███╗░░██╗░██████╗░
  ░██║░░██╗░░██║██╔══██╗██╔══██╗████╗░██║██║████╗░██║██╔════╝░
  ░╚██╗████╗██╔╝███████║██████╔╝██╔██╗██║██║██╔██╗██║██║░░██╗░
  ░░████╔═████║░██╔══██║██╔══██╗██║╚████║██║██║╚████║██║░░╚██╗
  ░░╚██╔╝░╚██╔╝░██║░░██║██║░░██║██║░╚███║██║██║░╚███║╚██████╔╝
  ░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═╝╚═╝░░╚══╝░╚═════╝░
  Check all variables below before execute the deployment script
  */

  const config = getConfig();
  let tx, estimatedGas;
  await withNetworkFile(async () => {
    // Deploy BoosterConfig
    console.log(`>> Deploying BoosterConfig`);
    const BoosterConfig = (await ethers.getContractFactory(
      "BoosterConfig",
      (
        await ethers.getSigners()
      )[0]
    )) as BoosterConfig__factory;
    const boosterConfig = (await upgrades.deployProxy(BoosterConfig)) as BoosterConfig;
    await boosterConfig.deployed();
    console.log(`>> Deployed at ${boosterConfig.address}`);
    console.log(`>> ✅ Done Deploying BoosterConfig`);

    console.log(`>> Deploying a Booster`);
    const Booster = (await ethers.getContractFactory("Booster", (await ethers.getSigners())[0])) as Booster__factory;
    const booster = (await upgrades.deployProxy(Booster, [
      config.Tokens.LATTE,
      config.MasterBarista,
      boosterConfig.address,
      config.WnativeRelayer,
      config.Tokens.WBNB,
    ])) as Booster;
    await booster.deployed();
    console.log(`>> Deployed at ${booster.address}`);
    console.log(`>> ✅ Done Deploying Booster`);

    console.log(`>> Adding a Booster as a BoosterConfig's Caller Allowance`);
    estimatedGas = await boosterConfig.estimateGas.setCallerAllowance(booster.address, true);
    tx = await boosterConfig.setCallerAllowance(booster.address, true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> Done Adding a Booster as a BoosterConfig's Caller Allowance with tx hash ${tx.hash}`);
    console.log(`>> ✅ Done Adding a Booster as a BoosterConfig's Caller Allowance`);

    const wNativeRelayer = WNativeRelayer__factory.connect(
      config.WnativeRelayer,
      (await ethers.getSigners())[0]
    ) as WNativeRelayer;
    console.log(`>> Execute Transaction to set wNativeRelayer setCallerOK to ${booster.address}`);
    estimatedGas = await wNativeRelayer.estimateGas.setCallerOk([booster.address], true);
    tx = await wNativeRelayer.setCallerOk([booster.address], true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  });
};

export default func;
func.tags = ["DeployBooster"];
