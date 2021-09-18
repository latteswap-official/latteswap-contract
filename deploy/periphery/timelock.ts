import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
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
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const ADMIN_ADDRESS = deployer;
  const DELAY_IN_SEC = "21600";

  const { deploy } = deployments;

  await withNetworkFile(async () => {
    await deploy("Timelock", {
      from: deployer,
      args: [ADMIN_ADDRESS, DELAY_IN_SEC],
      log: true,
      deterministicDeployment: false,
    });
  });
};

export default func;
func.tags = ["DeployTimeLock"];
