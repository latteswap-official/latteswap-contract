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
      nftTokenId: 13,
      maxEnergy: parseEther("100").toString(),
      boostBps: "10000",
    },
    {
      nftAddress: config.LatteNFT,
      nftTokenId: 14,
      maxEnergy: parseEther("100").toString(),
      boostBps: "10000",
    },
    {
      nftAddress: config.LatteNFT,
      nftTokenId: 15,
      maxEnergy: parseEther("100").toString(),
      boostBps: "10000",
    },
  ];

  const boosterConfig = BoosterConfig__factory.connect(
    config.BoosterConfig,
    (await ethers.getSigners())[0]
  ) as BoosterConfig;

  console.log(
    `>> Execute BoosterConfig Transaction to setBatchBoosterNFTEnergyInfo ${PARAMS.map((param) => {
      return `${param.nftAddress}-${param.nftTokenId}`;
    })}`
  );
  const estimatedGas = await boosterConfig.estimateGas.setBatchBoosterNFTEnergyInfo(PARAMS);
  const tx = await boosterConfig.setBatchBoosterNFTEnergyInfo(PARAMS, {
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
