import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getConfig, withNetworkFile } from "../../utils";
import { ethers, upgrades } from "hardhat";
import { LatteVault, LatteVault__factory } from "../../typechain";

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

  const TREASURY_ADDRESS = "0x864e90222f99a70aeECa036Ffc7d12cC4b3313B4";
  const FARMER_ADDRESSES: Array<string> = ["0x6A0611A7107d3D4C1F8cde8b7aF9e2b46A63Fed0"];

  await withNetworkFile(async () => {
    console.log(`>> Deploying LatteVault via proxy`);
    const LatteVault = (await ethers.getContractFactory(
      "LatteVault",
      (
        await ethers.getSigners()
      )[0]
    )) as LatteVault__factory;
    const latteVault = (await upgrades.deployProxy(LatteVault, [
      config.Tokens.LATTEV2,
      config.BeanBagV2,
      config.MasterBarista,
      TREASURY_ADDRESS,
      FARMER_ADDRESSES,
    ])) as LatteVault;
    await latteVault.deployed();
    console.log(`>> Deployed at ${latteVault.address}`);
    console.log("✅ Done deploying a LatteVault");
  });
};

export default func;
func.tags = ["DeployLatteVault"];
