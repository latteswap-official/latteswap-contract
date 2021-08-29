import { commify, parseEther } from "@ethersproject/units";
import { ethers, network, upgrades } from "hardhat";
import { LatteMarket, LatteMarket__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

type ISellParams = Array<string>;

async function main() {
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
  const PARAMS: ISellParams = [config.LatteNFT, config.OGNFT];
  const latteMarket = LatteMarket__factory.connect(config.LatteMarket, (await ethers.getSigners())[0]) as LatteMarket;
  console.log(`>> Execute Transaction to set supported nft to be ${PARAMS}`);
  const estimatedGas = await latteMarket.estimateGas.setSupportNFT(PARAMS, true);
  const tx = await latteMarket.setSupportNFT(PARAMS, true, {
    gasLimit: estimatedGas.add(100000),
  });
  await tx.wait();
  console.log(`>> returned tx hash: ${tx.hash}`);
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
