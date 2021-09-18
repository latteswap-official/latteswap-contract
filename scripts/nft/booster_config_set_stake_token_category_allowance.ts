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
      stakingToken: config.Tokens.BUSD,
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
      ],
    },
    {
      stakingToken: config.Tokens.WBNB,
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
      ],
    },
    {
      stakingToken: config.Tokens.ETH,
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
      ],
    },
    {
      stakingToken: config.Tokens.BTCB,
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
      ],
    },
    {
      stakingToken: config.Tokens.CAKE,
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
      ],
    },
    {
      stakingToken: config.Tokens.XVS,
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
      ],
    },
    {
      stakingToken: config.Tokens.EPS,
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
      ],
    },
    {
      stakingToken: config.Tokens.BELT,
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
      ],
    },
    {
      stakingToken: "0xf1bE8ecC990cBcb90e166b71E368299f0116d421", //ibALPACA
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
      ],
    },
    {
      stakingToken: "0xc019ca579efa75be917f38afb1113030c06ba035", // PCS LATTE-BUSD
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
      ],
    },
    {
      stakingToken: "0xB4BC3F991aec9c54B489d5a5db818487db42857D", //LATTE-BUSD
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
      ],
    },
    {
      stakingToken: "0xBD4284d34b9673FC79aAb2C0080C5A19b4282425", // BTCB-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x1fEc7039304a237A8402214488FBfB0f777C08e6", // WBNB-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x937F273568428D7dcaCc2FB43330a70d330B641d", // ETH-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0xcFF09B973f21489D76a9396b1505eab04766d58C", // ETH-WBNB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x79666A68ee70C36D5f865E59aFD3B2fBDAD41A0C", // BTCB-WBNB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x3Dcb13386E0a5353e0B2E5b53858Be6FFB888bB5", // ETH-BTCB
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: false,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 2,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 3,
          allowance: true,
        },
      ],
    },
    {
      stakingToken: "0x318B894003D0EAcfEDaA41B8c70ed3CE1Fde1450", // USDT-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: true,
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
      ],
    },
    {
      stakingToken: "0xee4341Dc1a64720c9E7AE776DaebF6ec5367a9F0", // USDC-BUSD
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftCategoryId: 1,
          allowance: true,
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
      ],
    },
    {
      stakingToken: "0x7ffAfa8F5846476688708096F6Cdf7c96CaA5B32", // ALPACA-BUSD
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
    await tx.wait();
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
