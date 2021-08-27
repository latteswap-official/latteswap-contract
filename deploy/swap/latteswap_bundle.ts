import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { LatteSwapFactory__factory } from "../../typechain";
import { withNetworkFile, getConfig } from "../../utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  if (!process.env.DEPLOYMENT_ENV) throw new Error("unspecified deployment env :(");
  const config = getConfig();
  const WBNB_ADDRESS = config.Tokens.WBNB;
  const FEETO = "";

  const { deployer } = await getNamedAccounts();
  await withNetworkFile(async () => {
    await deploy("LatteSwapFactory", {
      from: deployer,
      args: [deployer],
      log: true,
      deterministicDeployment: false,
    });
    const factory = await deployments.get("LatteSwapFactory");

    const factoryContract = LatteSwapFactory__factory.connect(factory.address, (await ethers.getSigners())[0]);
    console.log(`>> setting feeto ${FEETO}`);
    const estimatedGas = await factoryContract.estimateGas.setFeeTo(FEETO);
    const tx = await factoryContract.setFeeTo(FEETO, { gasLimit: estimatedGas.add(100000) });
    console.log(`>> tx hash: ${tx.hash}`);
    console.log("✅ Done");

    await deploy("LatteSwapRouter", {
      from: deployer,
      args: [factory.address, WBNB_ADDRESS],
      log: true,
      deterministicDeployment: false,
    });
  });
};

export default func;
func.tags = ["DeployLatteSwap"];
