import { ethers, network } from 'hardhat';
import { BoosterConfig, BoosterConfig__factory, MasterBarista__factory, MasterBarista } from '../../typechain'
import { getConfig, withNetworkFile } from '../../utils'


interface ISetStakingTokenBoosterAllowanceParam {
    stakingToken: string
    allowance: Array<{
        nftAddress: string,
        nftTokenId: number,
        allowance: boolean
    }>
}

type ISetStakingTokenBoosterAllowanceParams = Array<ISetStakingTokenBoosterAllowanceParam>

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
  const config = getConfig()
  const STAKING_POOLS: ISetStakingTokenBoosterAllowanceParams = [
    {
      stakingToken: config.Tokens.BUSD,
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftTokenId: 0,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftTokenId: 1,
          allowance: true,
        }
      ]
    },
    {
      stakingToken: config.Tokens.WBNB,
      allowance: [
        {
          nftAddress: config.LatteNFT,
          nftTokenId: 0,
          allowance: true,
        },
        {
          nftAddress: config.LatteNFT,
          nftTokenId: 1,
          allowance: true,
        }
      ]
    }
  ]







  const boosterConfig = BoosterConfig__factory.connect(
    config.BoosterConfig, (await ethers.getSigners())[0]
  ) as BoosterConfig

  let tx, estimatedGas
  for (let STAKING_POOL of STAKING_POOLS) {
    console.log(`>> Execute BoosterConfig Transaction to setStakingTokenBoosterAllowance ${STAKING_POOL.stakingToken}`);
    console.table(STAKING_POOL.allowance)
    estimatedGas = await boosterConfig.estimateGas.setStakingTokenBoosterAllowance(STAKING_POOL)
    tx = await boosterConfig.setStakingTokenBoosterAllowance(STAKING_POOL, {
      gasLimit: estimatedGas.add(100000),
    });
    console.log(`>> returned add a staking token pool tx hash: ${tx.hash}`)
    console.log("✅ Done");
  }
};

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })