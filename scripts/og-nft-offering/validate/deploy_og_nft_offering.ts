import { ethers } from "hardhat";
import {
  OGNFT,
  OGNFTOffering,
  OGNFTOffering__factory,
  OGNFT__factory,
  WNativeRelayer,
  WNativeRelayer__factory,
} from "../../../typechain";
import { getConfig, withNetworkFile } from "../../../utils";

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
  const ogNFTOfferingAddr = "0xa4FD125A4384faf310c1e8F7b3cE87e8b423B100";
  const wnativeRelayerAddr = config.WnativeRelayer;
  const ogNFTAddr = config.OGNFT;
  const feeAddr = "0xC29d5eB3d4baBa9b23753B00b8F048ec0431E358"; // og market treasury
  const sellerAddr = "0xC29d5eB3d4baBa9b23753B00b8F048ec0431E358"; // og market treasury
  const feeBps = "0";

  const ogNFTOffering = OGNFTOffering__factory.connect(
    ogNFTOfferingAddr,
    (await ethers.getSigners())[0]
  ) as OGNFTOffering;
  const wNativeRelayer = WNativeRelayer__factory.connect(
    wnativeRelayerAddr,
    (await ethers.getSigners())[0]
  ) as WNativeRelayer;
  const ogNFT = OGNFT__factory.connect(ogNFTAddr, (await ethers.getSigners())[0]) as OGNFT;
  console.table([
    {
      case: "og nft offering's og nft should be the same as og nft from the config",
      result: (await ogNFTOffering.ogNFT()).toLowerCase() === ogNFTAddr.toLowerCase(),
    },
    {
      case: "og nft offering should grant role to seller addr",
      result: await ogNFTOffering.hasRole(await ogNFTOffering.GOVERNANCE_ROLE(), sellerAddr),
    },
    {
      case: "og nft offering should contain a correct fee and fee bps",
      result:
        (await ogNFTOffering.feeAddr()).toLowerCase() === feeAddr.toLowerCase() &&
        (await ogNFTOffering.feePercentBps()).toString() === feeBps,
    },
    {
      case: "og nft should grant minter role to og nft offering",
      result: await ogNFT.hasRole(await ogNFT.MINTER_ROLE(), ogNFTOfferingAddr),
    },
    {
      case: "wnative relayer should set og nft offering as a caller ok",
      result: await wNativeRelayer.okCallers(ogNFTOfferingAddr),
    },
  ]);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
