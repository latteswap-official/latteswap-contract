import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { network } from "hardhat";
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

  if (network.name === "mainnet") throw new Error("T000::deploy_mock_erc20:: Mainnet is not allowed here");

  const MOCK_TOKENS: Array<IToken> = [
    {
      NAME: "Binance USD",
      SYMBOL: "BUSD",
    },
    {
      NAME: "Ethereum",
      SYMBOL: "ETH",
    },
    {
      NAME: "Bitcoin",
      SYMBOL: "BTC",
    },
    {
      NAME: "PancakeSwap",
      SYMBOL: "CAKE",
    },
    {
      NAME: "Alpaca Finance",
      SYMBOL: "ALPACA",
    },
    {
      NAME: "AUTO",
      SYMBOL: "AUTO",
    },
    {
      NAME: "Pancake Bunny",
      SYMBOL: "BUNNY",
    },
    {
      NAME: "WaultSwap",
      SYMBOL: "WEX",
    },
    {
      NAME: "Biswap",
      SYMBOL: "BSW",
    },
  ];

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  withNetworkFile(async () => {
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
func.tags = ["TestnetDeployMockERC20"];
