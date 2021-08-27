import { ethers, network } from "hardhat";
import { BoosterConfig, BoosterConfig__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface ISetStakingTokenBoosterAllowanceParam {
  stakingToken: string;
  allowance: Array<{
    nftAddress: string;
    nftCategoryId: number;
    allowance: boolean;
  }>;
}

type ISetStakingTokenBoosterAllowanceParams = Array<ISetStakingTokenBoosterAllowanceParam>;

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
  const STAKING_POOLS: ISetStakingTokenBoosterAllowanceParams = [
    {
      stakingToken: "0xa63b4be46eC650E2D786fA0fd763C61D6B56871c",
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 0,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
      ],
    },
  ];

  const boosterConfig = BoosterConfig__factory.connect(
    config.BoosterConfig,
    (await ethers.getSigners())[0]
  ) as BoosterConfig;

  let tx, estimatedGas;
  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(
      `>> Execute BoosterConfig Transaction to setStakingTokenCategoryAllowance ${STAKING_POOL.stakingToken}`
    );
    console.table(STAKING_POOL.allowance);
    estimatedGas = await boosterConfig.estimateGas.setStakingTokenCategoryAllowance(STAKING_POOL);
    tx = await boosterConfig.setStakingTokenCategoryAllowance(STAKING_POOL, {
      gasLimit: estimatedGas.add(100000),
    });
    console.log(`>> returned add a staking token pool tx hash: ${tx.hash}`);
    console.log("✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
