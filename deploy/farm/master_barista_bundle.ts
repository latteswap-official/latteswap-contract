import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import {
  BeanBag,
  BeanBag__factory,
  LATTE,
  LATTE__factory,
  MasterBarista,
  MasterBarista__factory,
} from "../../typechain";
import { withNetworkFile } from "../../utils";

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

  // Master Barista
  const BONUS_MULTIPLIER = 8;
  const BONUS_END_BLOCK = "11878376";
  const BONUS_LOCK_BPS = "6000";
  const LATTE_PER_BLOCK = ethers.utils.parseEther("1");
  const LATTE_START_BLOCK = "9287828";
  const TREASURY_ADDRESS = "";

  // LATTE token
  const GOVERNOR_ADDRESS = "0x864e90222f99a70aeECa036Ffc7d12cC4b3313B4";
  const LATTE_START_RELEASE_BLOCK = "9287828";
  const LATTE_END_RELEASE_BLOCK = "14470376";
  const INITIAL_DEPLOYER_LATTE_FEE = ethers.utils.parseEther("2");

  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  await withNetworkFile(async () => {
    /// DEPLOY LATTE
    await deploy("LATTE", {
      from: deployer,
      args: [GOVERNOR_ADDRESS, LATTE_START_RELEASE_BLOCK, LATTE_END_RELEASE_BLOCK],
      log: true,
      deterministicDeployment: false,
    });

    const latte = LATTE__factory.connect(
      (await deployments.get("LATTE")).address,
      (await ethers.getSigners())[0]
    ) as LATTE;

    /// DEPLOY BeanBag
    await deploy("BeanBag", {
      from: deployer,
      args: [(await deployments.get("LATTE")).address],
      log: true,
      deterministicDeployment: false,
    });

    const bean = BeanBag__factory.connect(
      (await deployments.get("BeanBag")).address,
      (await ethers.getSigners())[0]
    ) as BeanBag;

    // DEPLOY MasterBarista
    console.log(`>> Deploying MasterBarista via proxy`);
    const MasterBarista = (await ethers.getContractFactory(
      "MasterBarista",
      (
        await ethers.getSigners()
      )[0]
    )) as MasterBarista__factory;
    const masterBarista = (await upgrades.deployProxy(MasterBarista, [
      (await deployments.get("LATTE")).address,
      (await deployments.get("BeanBag")).address,
      TREASURY_ADDRESS,
      LATTE_PER_BLOCK,
      LATTE_START_BLOCK,
    ])) as MasterBarista;
    await masterBarista.deployed();
    console.log(`>> Deployed at ${masterBarista.address}`);
    console.log("✅ Done deploying a MasterBarista");
    let estimateGas, tx;
    // transfer latte's ownership to master barista
    console.log(`>> Execute Transaction to mint an initial fee to deployer`);
    estimateGas = await latte.estimateGas.mint(deployer, INITIAL_DEPLOYER_LATTE_FEE);
    tx = await latte.mint(deployer, INITIAL_DEPLOYER_LATTE_FEE, {
      gasLimit: estimateGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done minting an initial fee to a deployer");

    // transfer latte's ownership to master barista
    console.log(`>> Execute Transaction to transfer latte's ownership to master barista`);
    estimateGas = await latte.estimateGas.transferOwnership(masterBarista.address);
    tx = await latte.transferOwnership(masterBarista.address, {
      gasLimit: estimateGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done transfer latte's ownership to master barista");

    // transfer bean's ownership to master barista
    console.log(`>> Execute Transaction to transfer bean's ownership to master barista`);
    estimateGas = await bean.estimateGas.transferOwnership(masterBarista.address);
    tx = await bean.transferOwnership(masterBarista.address, {
      gasLimit: estimateGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done transfer bean's ownership to master barista");

    // set master barista bonus
    console.log(
      `>> Set MasterBarista bonus to BONUS_MULTIPLIER: "${BONUS_MULTIPLIER}", BONUS_END_BLOCK: "${BONUS_END_BLOCK}", LOCK_BPS: ${BONUS_LOCK_BPS}`
    );
    estimateGas = await masterBarista.estimateGas.setBonus(BONUS_MULTIPLIER, BONUS_END_BLOCK, BONUS_LOCK_BPS);
    tx = await masterBarista.setBonus(BONUS_MULTIPLIER, BONUS_END_BLOCK, BONUS_LOCK_BPS, {
      gasLimit: estimateGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log(`✅ Done Set MasterBarista's Bonus`);
  });
};

export default func;
func.tags = ["DeployMasterBarista"];
