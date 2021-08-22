import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network } from 'hardhat'



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
  if (network.name === "mainnet") throw new Error("T002::deploy_mock_latte:: Mainnet is not allowed here")
  const GOVERNOR_ADDRESS = '0x864e90222f99a70aeECa036Ffc7d12cC4b3313B4'
  const LATTE_START_RELEASE_BLOCK = '10533111';
  const LATTE_END_RELEASE_BLOCK = '52609874';








  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy('LATTE', {
    from: deployer,
    args: [
      GOVERNOR_ADDRESS,
      LATTE_START_RELEASE_BLOCK,
      LATTE_END_RELEASE_BLOCK,
    ],
    log: true,
    deterministicDeployment: false,
  });
};

export default func;
func.tags = ['TestnetDeployMockLatte'];