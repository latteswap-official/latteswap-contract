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
      ALLOC_POINT: "7500",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xa82a0b7bacf3fde41802b1ec32065e518958c715", // LATTEV2-BUSD PCS
      ALLOC_POINT: "100",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xcFF09B973f21489D76a9396b1505eab04766d58C", // ETH-BNB
      ALLOC_POINT: "500",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x79666A68ee70C36D5f865E59aFD3B2fBDAD41A0C", // BTCB-BNB
      ALLOC_POINT: "500",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x3Dcb13386E0a5353e0B2E5b53858Be6FFB888bB5", // ETH-BTCB
      ALLOC_POINT: "500",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x318B894003D0EAcfEDaA41B8c70ed3CE1Fde1450", // USDT-BUSD
      ALLOC_POINT: "750",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xee4341Dc1a64720c9E7AE776DaebF6ec5367a9F0", // USDC-BUSD
      ALLOC_POINT: "250",
      EXACT_ETA: "1633701600",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x7ffAfa8F5846476688708096F6Cdf7c96CaA5B32", // ALPACA-BUSD
      ALLOC_POINT: "250",
      EXACT_ETA: "1633701600",
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
