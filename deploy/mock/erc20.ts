import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { withNetworkFile } from "../../utils";

interface IToken {
  NAME: string;
  SYMBOL: string;
}

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

  const MOCK_TOKENS: Array<IToken> = [
    {
      NAME: "MOCK_TOKEN_3",
      SYMBOL: "MOCK_TOKEN_3",
    },
  ];

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  await withNetworkFile(async () => {
    for (let i = 0; i < MOCK_TOKENS.length; i++) {
      await deploy("SimpleToken", {
        from: deployer,
        args: [MOCK_TOKENS[i].NAME, MOCK_TOKENS[i].SYMBOL],
        log: true,
        deterministicDeployment: false,
      });
    }
  });
};

export default func;
func.tags = ["DeployMockERC20"];
