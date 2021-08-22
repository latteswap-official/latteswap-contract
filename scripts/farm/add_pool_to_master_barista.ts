import { ethers, network } from 'hardhat';
import ProdConfig from '../../prod.json'
import DevelopConfig from '../../develop.json'
import { MasterBarista, MasterBarista__factory } from '../../typechain'
import { withNetworkFile } from '../../utils';

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string
  ALLOC_POINT: string
}

type IStakingPools = Array<IStakingPool>

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
  const config = process.env.DEPLOYMENT_ENV === "prod" ? ProdConfig : DevelopConfig
  const STAKING_POOLS: IStakingPools = [
    {
      STAKING_TOKEN_ADDRESS: '0xa63b4be46eC650E2D786fA0fd763C61D6B56871c',
      ALLOC_POINT: '0',
    }
  ]







  
  for (let STAKING_POOL of STAKING_POOLS) {
    const masterBarista = MasterBarista__factory.connect(
      config.MasterBarista, (await ethers.getSigners())[0]
    ) as MasterBarista
  
    console.log(`>> Execute Transaction to add a staking token pool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`);
    const estimatedGas = await masterBarista.estimateGas.addPool(STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_POINT)
    const tx = await masterBarista.addPool(STAKING_POOL.STAKING_TOKEN_ADDRESS, STAKING_POOL.ALLOC_POINT, {
      gasLimit: estimatedGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`)
    console.log("✅ Done");
  }
};

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })