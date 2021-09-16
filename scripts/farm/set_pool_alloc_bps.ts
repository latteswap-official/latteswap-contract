import { ethers, network } from "hardhat";
import { MasterBarista, MasterBarista__factory } from "../../typechain";
import { withNetworkFile, getConfig } from "../../utils";

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string;
  ALLOC_BPS: string;
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
      STAKING_TOKEN_ADDRESS: "0xf1bE8ecC990cBcb90e166b71E368299f0116d421", // ibALPACA
      ALLOC_BPS: "100",
    },
  ];

  for (const STAKING_POOL of STAKING_POOLS) {
    const masterBarista = MasterBarista__factory.connect(
      config.MasterBarista,
      (await ethers.getSigners())[0]
    ) as MasterBarista;

    console.log(
      `>> Execute Transaction to set alloc bps for a staking token pool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`
    );
    console.table(STAKING_POOL);
    const estimatedGas = await masterBarista.estimateGas.setPoolAllocBps(
      STAKING_POOL.STAKING_TOKEN_ADDRESS,
      STAKING_POOL.ALLOC_BPS
    );
    const tx = await masterBarista.setPoolAllocBps(STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_BPS, {
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
