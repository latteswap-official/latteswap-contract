import { commify, formatEther, parseEther } from "@ethersproject/units";
import { ethers, network, upgrades } from "hardhat";
import { OGNFTOffering, OGNFTOffering__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface ISellParam {
  NFT_CATEGORY_ID: number;
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
    {
      NFT_CATEGORY_ID: 0, // light roast
      AMOUNT: 1888,
      START_BLOCK: 10728977,
      END_BLOCK: 11315303,
      QUOTE_BEP20_TOKEN: config.Tokens.WBNB,
    },
    {
      NFT_CATEGORY_ID: 1, // medium roast
      AMOUNT: 888,
      START_BLOCK: 10728977,
      END_BLOCK: 11315303,
      QUOTE_BEP20_TOKEN: config.Tokens.WBNB,
    },
    {
      NFT_CATEGORY_ID: 2, // dark roast
      AMOUNT: 88,
      START_BLOCK: 10728977,
      END_BLOCK: 11315303,
      QUOTE_BEP20_TOKEN: config.Tokens.WBNB,
    },
  ];

  const latteMarket = OGNFTOffering__factory.connect(
    config.OGNFTOffering,
    (await ethers.getSigners())[0]
  ) as OGNFTOffering;
  for (const PARAM of PARAMS) {
    console.log(`>> Execute Transaction to sell nft`);
    console.table({
      id: PARAM.NFT_CATEGORY_ID,
      amount: PARAM.AMOUNT,
      startBlock: PARAM.START_BLOCK,
      endBlock: PARAM.END_BLOCK,
      quoteBEP20Token: PARAM.QUOTE_BEP20_TOKEN,
    });
    const estimatedGas = await latteMarket.estimateGas.readyToSellNFT(
      PARAM.NFT_CATEGORY_ID,
      PARAM.AMOUNT,
      PARAM.START_BLOCK,
      PARAM.END_BLOCK,
      PARAM.QUOTE_BEP20_TOKEN
    );
    const tx = await latteMarket.readyToSellNFT(
      PARAM.NFT_CATEGORY_ID,
      PARAM.AMOUNT,
      PARAM.START_BLOCK,
      PARAM.END_BLOCK,
      PARAM.QUOTE_BEP20_TOKEN,
      {
        gasLimit: estimatedGas.add(100000),
      }
    );
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
