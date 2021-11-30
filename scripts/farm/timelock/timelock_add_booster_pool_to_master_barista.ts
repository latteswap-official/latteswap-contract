import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from "../../../utils";

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string;
  ALLOC_POINT: string;
}

type IStakingPools = Array<IStakingPool>;

/**
 * A combination between timelock_add_pool_to_master_barista and timelock_set_stake_token_to_be_boosted
 * since ALL pools excep LATTE pools are always created using these 2 scripts, better to combine to be only single script to prevent any human error
 */
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
      ALLOC_POINT: "0",
    },
    // {
    //   STAKING_TOKEN_ADDRESS: "0x2d8166A5ADCf8305873dedAf4727Cf0731579a86", // GNT-BUSD
    //   ALLOC_POINT: "0",
    // },
  ];
  const TIMELOCK_ETA = "1637906400";

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const STAKING_POOL of STAKING_POOLS) {
    // console.log(`>> Queue BoosterConfig Transaction to setStakeTokenAllowance ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`);
    // timelockTransactions.push(
    //   await TimelockService.queueTransaction(
    //     `setStakeTokenAllowance in BoosterConfig to ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`,
    //     config.BoosterConfig,
    //     "0",
    //     "setStakeTokenAllowance(address,bool)",
    //     ["address", "bool"],
    //     [STAKING_POOL.STAKING_TOKEN_ADDRESS, true],
    //     TIMELOCK_ETA
    //   )
    // );
    // console.log("✅ Done");

    // console.log(
    //   `>> Queue Master Transaction to setStakeTokenCallerAllowancePool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`
    // );
    // timelockTransactions.push(
    //   await TimelockService.queueTransaction(
    //     `setStakeTokenCallerAllowancePool in MasterBarista to ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`,
    //     config.MasterBarista,
    //     "0",
    //     "setStakeTokenCallerAllowancePool(address,bool)",
    //     ["address", "bool"],
    //     [STAKING_POOL.STAKING_TOKEN_ADDRESS, true],
    //     TIMELOCK_ETA
    //   )
    // );
    // console.log("✅ Done");

    console.log(
      `>> Queue Master Transaction to addStakeTokenCallerContract of ${STAKING_POOL.STAKING_TOKEN_ADDRESS} having this caller ${config.Booster}`
    );
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `addStakeTokenCallerContract in MasterBarista of ${STAKING_POOL.STAKING_TOKEN_ADDRESS} having this caller ${config.Booster}`,
        config.MasterBarista,
        "0",
        "addStakeTokenCallerContract(address,address)",
        ["address", "address"],
        [STAKING_POOL.STAKING_TOKEN_ADDRESS, config.Booster],
        TIMELOCK_ETA
      )
    );
    console.log("✅ Done");

    // NOTE: DO NOT CHANGE THE SEQUENCE, ADD POOL OPERATION NEEDS TO BE AFTER THOSE BOOSTER CONFIG STATEMENTS
    // console.log(">> Queue Transaction to add a staking token pool through Timelock");
    // timelockTransactions.push(
    //   await TimelockService.queueTransaction(
    //     `adding staking token pool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`,
    //     config.MasterBarista,
    //     "0",
    //     "addPool(address,uint256)",
    //     ["address", "uint256"],
    //     [STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_POINT],
    //     TIMELOCK_ETA
    //   )
    // );
    //console.log("✅ Done");
  }

  await FileService.write("add-booster-staking-token-pools", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
