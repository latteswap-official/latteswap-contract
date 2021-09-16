import { ethers } from "hardhat";
import {
  LatteMarket,
  LatteMarket__factory,
  LatteNFT,
  LatteNFT__factory,
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
  const latteMarketAddr = "0x288f26D5Ed901e290D713Db86142302AF8266b31";
  const wnativeRelayerAddr = config.WnativeRelayer;
  const latteNFTAddr = config.LatteNFT;
  const feeAddr = "0x1E70d4B0F723D660E99B9a404fca1548717034aD"; // latte market treasury
  const sellerAddr = "0x1E70d4B0F723D660E99B9a404fca1548717034aD"; // latte market treasury
  const feeBps = "0";

  const latteMarket = LatteMarket__factory.connect(latteMarketAddr, (await ethers.getSigners())[0]) as LatteMarket;
  const wNativeRelayer = WNativeRelayer__factory.connect(
    wnativeRelayerAddr,
    (await ethers.getSigners())[0]
  ) as WNativeRelayer;
  const latteNFT = LatteNFT__factory.connect(latteNFTAddr, (await ethers.getSigners())[0]) as LatteNFT;

  console.table([
    {
      case: "latte market should support nft",
      result: await latteMarket.isNFTSupported(latteNFTAddr),
    },
    {
      case: "latte market should grant role to seller addr",
      result: await latteMarket.hasRole(await latteMarket.GOVERNANCE_ROLE(), sellerAddr),
    },
    {
      case: "latte market should contain a correct fee and fee bps",
      result:
        (await latteMarket.feeAddr()).toLowerCase() === feeAddr.toLowerCase() &&
        (await latteMarket.feePercentBps()).toString() === feeBps,
    },
    {
      case: "latte nft should grant minter role to latte market",
      result: await latteNFT.hasRole(await latteNFT.MINTER_ROLE(), latteMarketAddr),
    },
    {
      case: "wnative relayer should set latte market as a caller ok",
      result: await wNativeRelayer.okCallers(latteMarketAddr),
    },
  ]);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
