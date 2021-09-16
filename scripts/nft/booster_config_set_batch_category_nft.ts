import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { BoosterConfig, BoosterConfig__factory, MasterBarista__factory, MasterBarista } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

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
  const PARAMS: ISetBatchCategoryNftParams = [
    {
      nftAddress: config.LatteNFT,
      nftCategoryId: 1,
      maxEnergy: parseEther("8888").toString(),
      boostBps: "5000",
    },
    {
      nftAddress: config.LatteNFT,
      nftCategoryId: 2,
      maxEnergy: parseEther("8888").toString(),
      boostBps: "3500",
    },
    {
      nftAddress: config.LatteNFT,
      nftCategoryId: 3,
      maxEnergy: parseEther("8888").toString(),
      boostBps: "2500",
    },
  ];

  const boosterConfig = BoosterConfig__factory.connect(
    config.BoosterConfig,
    (await ethers.getSigners())[0]
  ) as BoosterConfig;

  console.log(
    `>> Execute BoosterConfig Transaction to setBatchCategoryNFTEnergyInfo ${PARAMS.map((param) => {
      return `${param.nftAddress}-${param.nftCategoryId}`;
    })}`
  );
  const estimatedGas = await boosterConfig.estimateGas.setBatchCategoryNFTEnergyInfo(PARAMS);
  const tx = await boosterConfig.setBatchCategoryNFTEnergyInfo(PARAMS, {
    gasLimit: estimatedGas.add(100000),
  });
  console.log(`>> returned add a staking token pool tx hash: ${tx.hash}`);
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
