import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import { BeanBagV2, BeanBagV2__factory, LATTEV2, LATTEV2__factory } from "../../typechain";
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
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const config = getConfig();

  const { deployer } = await getNamedAccounts();

  await withNetworkFile(async () => {
    /// DEPLOY LATTEV2
    await deploy("LATTEV2", {
      from: deployer,
      args: [config.Tokens.LATTE],
      log: true,
      deterministicDeployment: false,
    });

    const latteV2 = LATTEV2__factory.connect(
      (await deployments.get("LATTEV2")).address,
      (await ethers.getSigners())[0]
    ) as LATTEV2;

    /// DEPLOY BeanBagV2
    console.log(`>> Execute Transaction to deploy BeanBagV2`);
    const BeanBagV2 = await ethers.getContractFactory("BeanBagV2", (await ethers.getSigners())[0]);
    const beanV2 = (await upgrades.deployProxy(BeanBagV2, [latteV2.address])) as BeanBagV2;
    await beanV2.deployed();
    console.log(`>> ✅ Done Executing a transaction to deploy BeanBagV2 with an address ${beanV2.address}`);

    // add latteV2's MINTER_ROLE to MasterBarista
    console.log(`>> Execute Transaction to add a master barista as a minter for latteV2`);
    let estimateGas = await latteV2.estimateGas.grantRole(await latteV2.MINTER_ROLE(), config.MasterBarista);
    let tx = await latteV2.grantRole(await latteV2.MINTER_ROLE(), config.MasterBarista, {
      gasLimit: estimateGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done adding a master barista as a minter for latteV2");

    // transfer bean's ownership to master barista
    console.log(`>> Execute Transaction to transfer beanV2's ownership to master barista`);
    estimateGas = await beanV2.estimateGas.transferOwnership(config.MasterBarista);
    tx = await beanV2.transferOwnership(config.MasterBarista, {
      gasLimit: estimateGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done transfer beanV2's ownership to master barista");
  });
};

export default func;
func.tags = ["DeployLATTEV2andBeanBagV2"];
