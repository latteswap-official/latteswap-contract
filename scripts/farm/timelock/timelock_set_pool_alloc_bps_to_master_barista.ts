import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from "../../../utils";

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string;
  ALLOC_BPS: string;
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
      STAKING_TOKEN_ADDRESS: config.Tokens.LATTEV2,
      ALLOC_BPS: "1500",
      EXACT_ETA: "1633331560",
    },
  ];

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(">> Queue Transaction to set a staking token pool bps through Timelock");
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `adding staking token pool bps of ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`,
        config.MasterBarista,
        "0",
        "setPoolAllocBps(address,uint256)",
        ["address", "uint256"],
        [STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_BPS],
        STAKING_POOL.EXACT_ETA
      )
    );
    console.log("✅ Done");
  }

  await FileService.write("set-staking-token-bps", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
