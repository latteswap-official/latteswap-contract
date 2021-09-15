import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import { OGNFT, OGNFT__factory } from "../../typechain";
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

  const config = getConfig();
  const BASE_URI = "ipfs://QmU2ehA8Uz64GAaUBjQHyZr7a3n8FMggxptPyzdAdpc1sS";
  const LATTE_TOKEN = config.Tokens.LATTE;
  const MASTER_BARISTA = config.MasterBarista;

  // Deploy OGNFT
  console.log(`>> Deploying OGNFT`);
  await withNetworkFile(async () => {
    const OGNFT = (await ethers.getContractFactory("OGNFT", (await ethers.getSigners())[0])) as OGNFT__factory;
    const ogNFT = (await upgrades.deployProxy(OGNFT, [BASE_URI, LATTE_TOKEN, MASTER_BARISTA], {
      initializer: "initialize(string,address,address)",
    })) as OGNFT;
    await ogNFT.deployed();
    console.log(`>> Deployed at ${ogNFT.address}`);
    console.log(`>> ✅ Done Deploying OGNFT`);
  });
};

export default func;
func.tags = ["DeployOGNFT"];
