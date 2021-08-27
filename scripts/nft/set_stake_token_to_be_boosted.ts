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
      STAKING_TOKEN_ADDRESS: config.Tokens.LATTE,
    },
    {
      STAKING_TOKEN_ADDRESS: "0xa63b4be46eC650E2D786fA0fd763C61D6B56871c",
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
