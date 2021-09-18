import { ethers, network } from "hardhat";
import { MasterBarista, MasterBarista__factory } from "../../typechain";
import { withNetworkFile, getConfig } from "../../utils";

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
      STAKING_TOKEN_ADDRESS: config.Tokens.BUSD,
      ALLOC_POINT: "1250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.WBNB,
      ALLOC_POINT: "1250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.ETH,
      ALLOC_POINT: "1250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.BTCB,
      ALLOC_POINT: "1250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.CAKE,
      ALLOC_POINT: "250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.XVS,
      ALLOC_POINT: "250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.EPS,
      ALLOC_POINT: "250",
    },
    {
      STAKING_TOKEN_ADDRESS: config.Tokens.BELT,
      ALLOC_POINT: "250",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xf1bE8ecC990cBcb90e166b71E368299f0116d421", //ibALPACA
      ALLOC_POINT: "0",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xc019ca579efa75be917f38afb1113030c06ba035", // PCS LATTE-BUSD
      ALLOC_POINT: "0",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xB4BC3F991aec9c54B489d5a5db818487db42857D", // LATTE-BUSD
      ALLOC_POINT: "0",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xBD4284d34b9673FC79aAb2C0080C5A19b4282425", // BTCB-BUSD
      ALLOC_POINT: "1500",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x1fEc7039304a237A8402214488FBfB0f777C08e6", // BNB-BUSD
      ALLOC_POINT: "2000",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x937F273568428D7dcaCc2FB43330a70d330B641d", //ETH-BUSD
      ALLOC_POINT: "1500",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xcFF09B973f21489D76a9396b1505eab04766d58C", //ETH-BNB
      ALLOC_POINT: "750",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x79666A68ee70C36D5f865E59aFD3B2fBDAD41A0C", //BTCB-BNB
      ALLOC_POINT: "750",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x3Dcb13386E0a5353e0B2E5b53858Be6FFB888bB5", //ETH-BTCB
      ALLOC_POINT: "750",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x318B894003D0EAcfEDaA41B8c70ed3CE1Fde1450", //USDT-BUSD
      ALLOC_POINT: "1000",
    },
    {
      STAKING_TOKEN_ADDRESS: "0xee4341Dc1a64720c9E7AE776DaebF6ec5367a9F0", //USDC-BUSD
      ALLOC_POINT: "500",
    },
    {
      STAKING_TOKEN_ADDRESS: "0x7ffAfa8F5846476688708096F6Cdf7c96CaA5B32", //ALPACA-BUSD
      ALLOC_POINT: "500",
    },
  ];

  for (const STAKING_POOL of STAKING_POOLS) {
    const masterBarista = MasterBarista__factory.connect(
      config.MasterBarista,
      (await ethers.getSigners())[0]
    ) as MasterBarista;

    console.log(`>> Execute Transaction to add a staking token pool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`);
    const estimatedGas = await masterBarista.estimateGas.addPool(
      STAKING_POOL.STAKING_TOKEN_ADDRESS,
      STAKING_POOL.ALLOC_POINT
    );
    const tx = await masterBarista.addPool(STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_POINT, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
