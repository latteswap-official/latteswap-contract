import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';
import { BoosterConfig, BoosterConfig__factory, Booster, Booster__factory } from '../../typechain';
import { getConfig, withNetworkFile } from '../../utils' 

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





  const config = getConfig()
  withNetworkFile(async() => {
    // Deploy BoosterConfig
    console.log(`>> Deploying BoosterConfig`)
    const BoosterConfig = (await ethers.getContractFactory(
      "BoosterConfig",
      (await ethers.getSigners())[0]
    )) as BoosterConfig__factory;
    const boosterConfig = await upgrades.deployProxy(BoosterConfig) as BoosterConfig;
    await boosterConfig.deployed();
    console.log(`>> Deployed at ${boosterConfig.address}`);
    console.log(`>> ✅ Done Deploying BoosterConfig`);

    console.log(`>> Deploying a Booster`);
    const Booster = (await ethers.getContractFactory(
      'Booster',
      (await ethers.getSigners())[0]
    )) as Booster__factory;
    const booster = await upgrades.deployProxy(
      Booster, [config.Tokens.LATTE, config.MasterBarista, boosterConfig.address]
    ) as Booster;
    await booster.deployed();
    console.log(`>> Deployed at ${booster.address}`);
    console.log(`>> ✅ Done Deploying Booster`);

    console.log(`>> Adding a Booster as a BoosterConfig's Caller Allowance`);
    const estimatedGas = await boosterConfig.estimateGas.setCallerAllowance(booster.address, true)
    const tx = await boosterConfig.setCallerAllowance(booster.address, true, {
      gasLimit: estimatedGas.add(100000),
    })
    console.log(`>> Done Adding a Booster as a BoosterConfig's Caller Allowance with tx hash ${tx.hash}`);
    console.log(`>> ✅ Done Adding a Booster as a BoosterConfig's Caller Allowance`);
  })
};

export default func;
func.tags = ['DeployBooster'];