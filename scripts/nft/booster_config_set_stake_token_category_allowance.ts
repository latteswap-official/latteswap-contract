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
      stakingToken: config.Tokens.BUSD, // master barista pool
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
      stakingToken: "0xE1e1c47f47cB874A3a538C6AC6371eEfcc95828c", //LATTE-BUSD
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
      stakingToken: "0xA4fdBf0c00fFA3F4e26B4E5ef5A23CB3cc8df4Fe", // BTCB-BUSD
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
      stakingToken: "0x849D4B13Aa9D9a6B90870524CefCD812F4e0040B", // WBNB-BUSD
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
      stakingToken: "0xd87670d3C46FBBb3629061D46C194Aa69Ca5d027", // ETH-BUSD
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
      stakingToken: "0x0080206AcE8997DfE2d84cEaDE2fDD00Ea8d3941", // ETH-WBNB
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
      stakingToken: "0x4C5b1AE43D2E35090014C9ecFA892a30380034cb", // BTCB-WBNB
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
      stakingToken: "0x818bfb8F8884da5b57C366D79B898e1d4d45580F", // ETH-BTCB
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
      stakingToken: "0x8779B9468Be481844391912d5838B88D6F60fF45", // USDT-BUSD
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
      stakingToken: "0x187688C117132Bb57ED5C1a51e1860eb76c6f17d", // USDC-BUSD
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
      stakingToken: "0x384d797a969745Fc6E6961f86Dc8490D46BDC011", // ALPACA-BUSD
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
