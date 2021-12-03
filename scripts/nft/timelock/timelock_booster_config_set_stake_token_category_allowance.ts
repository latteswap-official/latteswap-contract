import { ethers } from "ethers";
import { getConfig, withNetworkFile, FileService, TimelockService, ITimelockResponse } from "../../../utils";

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
  const timelockTransactions: Array<ITimelockResponse> = [];
  const STAKING_POOLS: ISetStakingTokenBoosterAllowanceParams = [
    {
      stakingToken: "0x24734C67CB3a9812772bF289d7898b90EE2859FB", // DEP-WBNB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
  ];
  const TIMELOCK_ETA = "1638338400";

  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(`>> Queue BoosterConfig Transaction to setStakingTokenCategoryAllowance ${STAKING_POOL.stakingToken}`);
    console.table(STAKING_POOL.allowance);
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `setStakingTokenCategoryAllowance pool ${STAKING_POOL.stakingToken}`,
        config.BoosterConfig,
        "0",
        "setStakingTokenCategoryAllowance((address,(address,uint256,bool)[]))",
        ["(address stakingToken,(address nftAddress,uint256 nftCategoryId,bool allowance)[] allowance)"],
        [STAKING_POOL],
        TIMELOCK_ETA
      )
    );
    console.log("✅ Done");
  }

  await FileService.write("set-staking-token-category-allowance", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
