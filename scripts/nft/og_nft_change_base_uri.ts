import { ethers, network } from "hardhat";
import { LatteNFT__factory, LatteNFT, OGNFT, OGNFT__factory } from "../../typechain";
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
  const BASE_URI = "https://latteswap-nft-dev.s3.ap-southeast-1.amazonaws.com";

  const config = getConfig();
  const ogNFT = OGNFT__factory.connect(config.OGNFT, (await ethers.getSigners())[0]) as OGNFT;
  console.log(`>> Execute Transaction to set base uri ${BASE_URI} to OG NFT`);
  const estimatedGas = await ogNFT.estimateGas.setBaseURI(BASE_URI);
  const tx = await ogNFT.setBaseURI(BASE_URI, {
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
