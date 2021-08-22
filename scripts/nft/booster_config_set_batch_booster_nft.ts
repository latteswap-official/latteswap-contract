import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { BoosterConfig, BoosterConfig__factory, MasterBarista__factory, MasterBarista } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface ISetBatchBoosterNftParam {
  nftAddress: string;
  nftTokenId: number;
  maxEnergy: string;
  boostBps: string;
}

type ISetBatchBoosterNftParams = Array<ISetBatchBoosterNftParam>;

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
  const PARAMS: ISetBatchBoosterNftParams = [
    {
      nftAddress: config.LatteNFT,
      nftTokenId: 0,
      maxEnergy: parseEther("10000").toString(),
      boostBps: "100",
    },
    {
      nftAddress: config.LatteNFT,
      nftTokenId: 1,
      maxEnergy: parseEther("10000").toString(),
      boostBps: "100",
    },
  ];

  const boosterConfig = BoosterConfig__factory.connect(
    config.BoosterConfig,
    (await ethers.getSigners())[0]
  ) as BoosterConfig;

  let tx, estimatedGas;
  console.log(
    `>> Execute BoosterConfig Transaction to setBatchBoosterNFTEnergyInfo ${PARAMS.map((param) => {
      return `${param.nftAddress}-${param.nftTokenId}`;
    })}`
  );
  estimatedGas = await boosterConfig.estimateGas.setBatchBoosterNFTEnergyInfo(PARAMS);
  tx = await boosterConfig.setBatchBoosterNFTEnergyInfo(PARAMS, {
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
