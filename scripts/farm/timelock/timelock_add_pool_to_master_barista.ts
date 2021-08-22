import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from '../../../utils';

interface IStakingPool {
  STAKING_TOKEN_ADDRESS: string
  ALLOC_POINT: string
  EXACT_ETA: string
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

  const STAKING_POOLS: IStakingPools = [
    {
      STAKING_TOKEN_ADDRESS: '',
      ALLOC_POINT: '',
      EXACT_ETA: ''
    }
  ]










  const config = getConfig()
  const timelockTransactions: Array<ITimelockResponse> = []
  
  for (let STAKING_POOL of STAKING_POOLS) {
    console.log(">> Queue Transaction to add a staking token pool through Timelock");
    timelockTransactions.push(await TimelockService.queueTransaction(`adding staking token pool ${STAKING_POOL.STAKING_TOKEN_ADDRESS}`, config.MasterBarista, '0', 'addPool(uint256,address)', ['uint256','address'], [STAKING_POOL.ALLOC_POINT, STAKING_POOL.STAKING_TOKEN_ADDRESS], STAKING_POOL.EXACT_ETA));
    console.log("✅ Done");
  }

  await FileService.write('add-staking-token-pools', timelockTransactions)
};

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })