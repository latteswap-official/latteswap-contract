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
      stakingToken: "0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", // LATTEv2-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xa82a0B7baCF3FdE41802B1Ec32065E518958C715", // PCS LATTEv2-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x3461AB63e417F49C25BB37F372B2Fc731e6AE6Bc", // COUPON-WBNB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xda2C54De8fBcE8a48E6BbE3B4088923B483EeBe1", // SAMOY-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x5Eab4C59a4CabDD93237F55Eb2d89A42f8A5e2b8", // SCZ-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x225170b4308EE84627Ee29296d014908bab56313", // KWS-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xA4d38Dd8050AC66E4f0101BaD1Ac62B3995BDAFC", // XBN-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xF29df34748694f53e6C7Bd1fb159659164cC3E27", // LUCKY-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xBD4284d34b9673FC79aAb2C0080C5A19b4282425", // BTCB-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x937F273568428D7dcaCc2FB43330a70d330B641d", // ETH-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x1fEc7039304a237A8402214488FBfB0f777C08e6", // BNB-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x3Dcb13386E0a5353e0B2E5b53858Be6FFB888bB5", // BTCB-ETH
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xcFF09B973f21489D76a9396b1505eab04766d58C", // ETH-BNB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x79666A68ee70C36D5f865E59aFD3B2fBDAD41A0C", // BNB-BTCB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x318B894003D0EAcfEDaA41B8c70ed3CE1Fde1450", // USDT-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xee4341Dc1a64720c9E7AE776DaebF6ec5367a9F0", // USDC-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 4,
          allowance: true,
        },
      ],
    },
  ];
  const TIMELOCK_ETA = "1637221500";

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
