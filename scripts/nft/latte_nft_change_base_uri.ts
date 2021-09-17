import { ethers, network } from "hardhat";
import { LatteNFT__factory, LatteNFT } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

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
  const BASE_URI = "ipfs://QmbU6iWqDKHn1zLJxTbiUznZzWDAFBQZEnxNGE3ruF4Hqr";

  const config = getConfig();
  const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
  console.log(`>> Execute Transaction to set base uri ${BASE_URI} to latte nft`);
  const estimatedGas = await latteNFT.estimateGas.setBaseURI(BASE_URI);
  const tx = await latteNFT.setBaseURI(BASE_URI, {
    gasLimit: estimatedGas.add(100000),
  });
  console.log(`>> returned tx hash: ${tx.hash}`);
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
