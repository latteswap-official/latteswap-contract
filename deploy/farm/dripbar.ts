import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import { DripBar, DripBar__factory } from "../../typechain";
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
  const deployer = (await ethers.getSigners())[0];
  const REWARD_HOLDER = await deployer.getAddress();

  await withNetworkFile(async () => {
    console.log(`deploying a Dripbar having ${REWARD_HOLDER} as a reward holder`);
    const DripBar = (await ethers.getContractFactory("DripBar", (await ethers.getSigners())[0])) as DripBar__factory;
    const dripbar = (await upgrades.deployProxy(DripBar, [REWARD_HOLDER])) as DripBar;

    await dripbar.deployed();
    console.log(`>> Deployed at ${dripbar.address}`);
    console.log("✅ Done deploying a DripBar");
  });
};

export default func;
func.tags = ["DeployDripBar"];
