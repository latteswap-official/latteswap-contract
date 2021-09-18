import { commify, formatEther, parseEther } from "@ethersproject/units";
import { ethers, network, upgrades } from "hardhat";
import { LatteMarket, LatteMarket__factory } from "../../../typechain";
import { getConfig, withNetworkFile } from "../../../utils";
import { expect } from "chai";

interface ISellParam {
  NFT_ADDRESS: string;
  NFT_CATEGORY_ID: number;
  PRICE: string;
  AMOUNT: number;
  START_BLOCK: number;
  END_BLOCK: number;
  QUOTE_BEP20_TOKEN: string;
}

type ISellParams = Array<ISellParam>;

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
  const PARAMS: ISellParams = [
    /// Latte booster
    {
      NFT_ADDRESS: config.LatteNFT,
      NFT_CATEGORY_ID: 1, // soy milk
      PRICE: parseEther("3.88").toString(),
      AMOUNT: 888,
      START_BLOCK: 11047888,
      END_BLOCK: 11472088,
      QUOTE_BEP20_TOKEN: config.Tokens.WBNB,
    },
    {
      NFT_ADDRESS: config.LatteNFT,
      NFT_CATEGORY_ID: 2, // almond milk
      PRICE: parseEther("3.88").toString(),
      AMOUNT: 888,
      START_BLOCK: 11047888,
      END_BLOCK: 11472088,
      QUOTE_BEP20_TOKEN: config.Tokens.WBNB,
    },
    {
      NFT_ADDRESS: config.LatteNFT,
      NFT_CATEGORY_ID: 3, // whole milk
      PRICE: parseEther("3.88").toString(),
      AMOUNT: 888,
      START_BLOCK: 11047888,
      END_BLOCK: 11472088,
      QUOTE_BEP20_TOKEN: config.Tokens.WBNB,
    },
  ];
  const latteMarket = LatteMarket__factory.connect(config.LatteMarket, (await ethers.getSigners())[0]) as LatteMarket;
  for (const PARAM of PARAMS) {
    console.log(`>> Execute Transaction to check latte nft metadata`);
    const metadata = await latteMarket.latteNFTMetadata(PARAM.NFT_ADDRESS, PARAM.NFT_CATEGORY_ID);
    console.table([
      {
        case: "cap should be equal",
        result: metadata.cap.toNumber() === PARAM.AMOUNT,
      },
      {
        case: "startblock should be equal",
        result: metadata.startBlock.toNumber() === PARAM.START_BLOCK,
      },
      {
        case: "endblock should be equal",
        result: metadata.endBlock.toNumber() === PARAM.END_BLOCK,
      },
      {
        case: "isBidding should be false",
        result: !metadata.isBidding,
      },
      {
        case: "price should be equal",
        result: metadata.price.toString() === PARAM.PRICE,
      },
      {
        case: "quoteBEP20 should be equal",
        result: metadata.quoteBep20.toLowerCase() === PARAM.QUOTE_BEP20_TOKEN.toLowerCase(),
      },
    ]);
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
