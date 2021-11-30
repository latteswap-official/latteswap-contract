import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from "../../../utils";

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string;
  ALLOC_POINT: string;
  EXACT_ETA: string;
}

type IStakingPools = Array<IStakingPool>;

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
  const STAKING_POOLS: IStakingPools = [
    {
      STAKING_TOKEN_ADDRESS: "0x0efa34E1ed6184ECfdC739f6dDFB3890fe5e8054", // CZF-WBNB
      ALLOC_POINT: "90",
      EXACT_ETA: "1637906400",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x2d8166A5ADCf8305873dedAf4727Cf0731579a86", // GNT-BUSD
      ALLOC_POINT: "115",
      EXACT_ETA: "1637906400",
    },
  ];

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(">> Queue Transaction to set a staking token pool alloc point through Timelock");
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `setting staking token pool alloc point ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`,
        config.MasterBarista,
        "0",
        "setPool(address,uint256)",
        ["address", "uint256"],
        [STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_POINT],
        STAKING_POOL.EXACT_ETA
      )
    );
    console.log("✅ Done");
  }

  await FileService.write("set-staking-token-pool-alloc-point", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
