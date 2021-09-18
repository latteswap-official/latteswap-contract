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
      STAKING_TOKEN_ADDRESS: "0xf1bE8ecC990cBcb90e166b71E368299f0116d421", //ibALPACA
    },
    {
      STAKING_TOKEN_ADDRESS: "0xc019ca579efa75be917f38afb1113030c06ba035", // PCS LATTE-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0xB4BC3F991aec9c54B489d5a5db818487db42857D", // LATTE-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0xBD4284d34b9673FC79aAb2C0080C5A19b4282425", // BTCB-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x1fEc7039304a237A8402214488FBfB0f777C08e6", // BNB-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x937F273568428D7dcaCc2FB43330a70d330B641d", //ETH-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0xcFF09B973f21489D76a9396b1505eab04766d58C", //ETH-BNB
    },
    {
      STAKING_TOKEN_ADDRESS: "0x79666A68ee70C36D5f865E59aFD3B2fBDAD41A0C", //BTCB-BNB
    },
    {
      STAKING_TOKEN_ADDRESS: "0x3Dcb13386E0a5353e0B2E5b53858Be6FFB888bB5", //ETH-BTCB
    },
    {
      STAKING_TOKEN_ADDRESS: "0x318B894003D0EAcfEDaA41B8c70ed3CE1Fde1450", //USDT-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0xee4341Dc1a64720c9E7AE776DaebF6ec5367a9F0", //USDC-BUSD
    },
    {
      STAKING_TOKEN_ADDRESS: "0x7ffAfa8F5846476688708096F6Cdf7c96CaA5B32", //ALPACA-BUSD
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
