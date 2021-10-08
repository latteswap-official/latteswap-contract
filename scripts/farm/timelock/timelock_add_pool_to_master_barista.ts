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
      STAKING_TOKEN_ADDRESS: "0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", // LATTEV2-BUSD
      ALLOC_POINT: "5000",
      EXACT_ETA: "1633607417",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xa82a0b7bacf3fde41802b1ec32065e518958c715", // LATTEV2-BUSD PCS
      ALLOC_POINT: "500",
      EXACT_ETA: "1633607417",
    },
  ];

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(">> Queue Transaction to add a staking token pool through Timelock");
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `adding staking token pool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`,
        config.MasterBarista,
        "0",
        "addPool(address,uint256)",
        ["address", "uint256"],
        [STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_POINT],
        STAKING_POOL.EXACT_ETA
      )
    );
    console.log("✅ Done");
  }

  await FileService.write("add-staking-token-pools", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
