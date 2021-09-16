import { ethers, network } from "hardhat";
import { BoosterConfig, BoosterConfig__factory, MasterBarista__factory, MasterBarista } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

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

  let tx, estimatedGas;
  for (const STAKING_POOL of STAKING_POOLS) {
    console.log(`>> Execute BoosterConfig Transaction to setStakeTokenAllowance ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`);
    estimatedGas = await boosterConfig.estimateGas.setStakeTokenAllowance(STAKING_POOL.STAKING_TOKEN_ADDRESS, true);
    tx = await boosterConfig.setStakeTokenAllowance(STAKING_POOL.STAKING_TOKEN_ADDRESS, true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned setStakeTokenAllowance tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(
      `>> Execute Master Transaction to setStakeTokenCallerAllowancePool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`
    );
    estimatedGas = await masterBarista.estimateGas.setStakeTokenCallerAllowancePool(
      STAKING_POOL.STAKING_TOKEN_ADDRESS,
      true
    );
    tx = await masterBarista.setStakeTokenCallerAllowancePool(STAKING_POOL.STAKING_TOKEN_ADDRESS, true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned setStakeTokenCallerAllowancePool tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(
      `>> Execute Master Transaction to addStakeTokenCallerContract of ${STAKING_POOL.STAKING_TOKEN_ADDRESS} having this caller ${config.Booster}`
    );
    estimatedGas = await masterBarista.estimateGas.addStakeTokenCallerContract(
      STAKING_POOL.STAKING_TOKEN_ADDRESS,
      config.Booster
    );
    tx = await masterBarista.addStakeTokenCallerContract(STAKING_POOL.STAKING_TOKEN_ADDRESS, config.Booster, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned addStakeTokenCallerContract tx hash: ${tx.hash}`);
    console.log("✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
