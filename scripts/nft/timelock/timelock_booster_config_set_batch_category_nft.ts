import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { getConfig, withNetworkFile, TimelockService, ITimelockResponse, FileService } from "../../../utils";

interface ISetBatchCategoryNftParam {
  nftAddress: string;
  nftCategoryId: number;
  maxEnergy: string;
  boostBps: string;
}

type ISetBatchCategoryNftParams = Array<ISetBatchCategoryNftParam>;

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
  const timelockTransactions: Array<ITimelockResponse> = [];
  const PARAMS: ISetBatchCategoryNftParams = [
    {
      nftAddress: config.LatteNFT,
      nftCategoryId: 4,
      maxEnergy: parseEther("1000").toString(),
      boostBps: "2500",
    },
  ];
  const TIMELOCK_ETA = "1637221500";

  console.log(`>> Queue BoosterConfig Transaction to setBatchCategoryNFTEnergyInfo`);
  console.log(PARAMS);
  timelockTransactions.push(
    await TimelockService.queueTransaction(
      `setBatchCategoryNFTEnergyInfo`,
      config.BoosterConfig,
      "0",
      "setBatchCategoryNFTEnergyInfo((address,uint256,uint256,uint256)[])",
      ["(address nftAddress,uint256 nftCategoryId,uint256 maxEnergy,uint256 boostBps)[]"],
      [PARAMS],
      TIMELOCK_ETA
    )
  );
  console.log("✅ Done");

  await FileService.write("set-batch-category-nft-info", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
