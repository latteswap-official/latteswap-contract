import { commify, formatEther, parseEther } from "@ethersproject/units";
import { ethers, network, upgrades } from "hardhat";
import { OGNFTOffering, OGNFTOffering__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface ISellParam {
  NFT_CATEGORY_ID: number;
  AMOUNT: number;
  START_BLOCK: number;
  END_BLOCK: number;
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
      NFT_CATEGORY_ID: 1,
      AMOUNT: 10,
      START_BLOCK: 10726861,
      END_BLOCK: 11315303,
    },
  ];
  const ogMarket = OGNFTOffering__factory.connect(
    config.OGNFTOffering,
    (await ethers.getSigners())[0]
  ) as OGNFTOffering;

  console.log(`>> Execute Transaction to set an og nft metadata`);
  console.table(PARAMS);
  const estimatedGas = await ogMarket.estimateGas.setOGNFTMetadata(
    PARAMS.map((param) => {
      return {
        nftCategoryId: param.NFT_CATEGORY_ID,
        cap: param.AMOUNT,
        startBlock: param.START_BLOCK,
        endBlock: param.END_BLOCK,
      };
    })
  );
  const tx = await ogMarket.setOGNFTMetadata(
    PARAMS.map((param) => {
      return {
        nftCategoryId: param.NFT_CATEGORY_ID,
        cap: param.AMOUNT,
        startBlock: param.START_BLOCK,
        endBlock: param.END_BLOCK,
      };
    }),
    {
      gasLimit: estimatedGas.add(100000),
    }
  );
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
