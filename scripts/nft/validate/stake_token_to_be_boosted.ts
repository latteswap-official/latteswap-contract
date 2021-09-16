import { ethers, network } from "hardhat";
import { BoosterConfig, BoosterConfig__factory, MasterBarista__factory, MasterBarista } from "../../../typechain";
import { getConfig, withNetworkFile } from "../../../utils";

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string;
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
      STAKING_TOKEN_ADDRESS: config.Tokens.BUSD,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.WBNB,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.ETH,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.BTCB,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.CAKE,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.XVS,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.EPS,
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.BELT,
    },
    {
      STAKING_TOKEN_ADDRESS: "0xE1e1c47f47cB874A3a538C6AC6371eEfcc95828c", //LATTE-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0xA4fdBf0c00fFA3F4e26B4E5ef5A23CB3cc8df4Fe", // BTCB-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x849D4B13Aa9D9a6B90870524CefCD812F4e0040B", // WBNB-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0xd87670d3C46FBBb3629061D46C194Aa69Ca5d027", // ETH-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x0080206AcE8997DfE2d84cEaDE2fDD00Ea8d3941", // ETH-WBNB
    },
    {
      STAKING_TOKEN_ADDRESS: "0x4C5b1AE43D2E35090014C9ecFA892a30380034cb", // BTCB-WBNB
    },
    {
      STAKING_TOKEN_ADDRESS: "0x818bfb8F8884da5b57C366D79B898e1d4d45580F", // ETH-BTCB
    },
    {
      STAKING_TOKEN_ADDRESS: "0x8779B9468Be481844391912d5838B88D6F60fF45", // USDT-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x187688C117132Bb57ED5C1a51e1860eb76c6f17d", // USDC-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x384d797a969745Fc6E6961f86Dc8490D46BDC011", // ALPACA-BUSD
    },
  ];

  const boosterConfig = BoosterConfig__factory.connect(
    config.BoosterConfig,
    (await ethers.getSigners())[0]
  ) as BoosterConfig;
  const masterBarista = MasterBarista__factory.connect(
    config.MasterBarista,
    (await ethers.getSigners())[0]
  ) as MasterBarista;

  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(
      `>> Execute BoosterConfig Transaction to check stake token allowance ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`
    );
    (await boosterConfig.stakeTokenAllowance(STAKING_POOL.STAKING_TOKEN_ADDRESS))
      ? console.log(`✅ ${STAKING_POOL.STAKING_TOKEN_ADDRESS} is allowed`)
      : console.log(`❌ ${STAKING_POOL.STAKING_TOKEN_ADDRESS} not allowed`);

    console.log(
      `>> Execute Master Transaction to check stakeTokenCallerAllowancePool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`
    );
    (await masterBarista.stakeTokenCallerAllowancePool(STAKING_POOL.STAKING_TOKEN_ADDRESS))
      ? console.log(`✅ ${STAKING_POOL.STAKING_TOKEN_ADDRESS} is allowed`)
      : console.log(`❌ ${STAKING_POOL.STAKING_TOKEN_ADDRESS} not allowed`);
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
