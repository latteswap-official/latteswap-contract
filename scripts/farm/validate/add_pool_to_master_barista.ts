import { ethers, network } from "hardhat";
import { MasterBarista, MasterBarista__factory } from "../../../typechain";
import { withNetworkFile, getConfig } from "../../../utils";

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string;
  ALLOC_POINT: string;
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
    },
    {
      STAKING_TOKEN_ADDRESS: "0xa82a0b7bacf3fde41802b1ec32065e518958c715", // LATTEV2-BUSD PCS
      ALLOC_POINT: "100",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xcFF09B973f21489D76a9396b1505eab04766d58C", // ETH-BNB
      ALLOC_POINT: "500",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x79666A68ee70C36D5f865E59aFD3B2fBDAD41A0C", // BTCB-BNB
      ALLOC_POINT: "500",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x3Dcb13386E0a5353e0B2E5b53858Be6FFB888bB5", // ETH-BTCB
      ALLOC_POINT: "500",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x318B894003D0EAcfEDaA41B8c70ed3CE1Fde1450", // USDT-BUSD
      ALLOC_POINT: "750",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xee4341Dc1a64720c9E7AE776DaebF6ec5367a9F0", // USDC-BUSD
      ALLOC_POINT: "250",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x7ffAfa8F5846476688708096F6Cdf7c96CaA5B32", // ALPACA-BUSD
      ALLOC_POINT: "250",
    },
  ];

  const masterBarista = MasterBarista__factory.connect(
    config.MasterBarista,
    (await ethers.getSigners())[0]
  ) as MasterBarista;
  for (const STAKING_POOL of STAKING_POOLS) {
    const poolInfo = await masterBarista.poolInfo(STAKING_POOL.STAKING_TOKEN_ADDRESS);
    console.table([
      {
        case: "allocPoint should be the same",
        address: STAKING_POOL.STAKING_TOKEN_ADDRESS,
        actual: poolInfo.allocPoint.toString(),
        expected: STAKING_POOL.ALLOC_POINT,
        result: STAKING_POOL.ALLOC_POINT === poolInfo.allocPoint.toString(),
      },
      {
        case: "acc latte per share should be 0",
        result: poolInfo.allocBps.toString() === "0",
      },
    ]);
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
