import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import { LatteNFT, LatteNFT__factory } from "../../typechain";
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

  const BASE_URI = "ipfs://QmU2ehA8Uz64GAaUBjQHyZr7a3n8FMggxptPyzdAdpc1sS"; // mock json response

  // Deploy LatteNFT
  console.log(`>> Deploying LatteNFT`);
  await withNetworkFile(async () => {
    const LatteNFT = (await ethers.getContractFactory("LatteNFT", (await ethers.getSigners())[0])) as LatteNFT__factory;
    const latteNft = (await upgrades.deployProxy(LatteNFT, [BASE_URI])) as LatteNFT;
    await latteNft.deployed();
    console.log(`>> Deployed at ${latteNft.address}`);
    console.log(`>> ✅ Done Deploying LatteNFT`);
  });
};

export default func;
func.tags = ["DeployLatteNFT"];
