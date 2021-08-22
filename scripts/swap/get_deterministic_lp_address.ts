import { getCreate2Address } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import DevelopConfig from '../../develop.json'
import ProdConfig from '../../prod.json'
import { getConfig, withNetworkFile } from '../../utils'
import { pack, keccak256 } from '@ethersproject/solidity'


interface IPairAddress {
    TOKEN0: string
    TOKEN1: string
}

async function main() {
    const config = getConfig()
    const PAIR_ADDRESS: IPairAddress = {
        TOKEN0: config.Tokens.LATTE,
        TOKEN1: config.Tokens.BUSD,
    }
    
    const FACTORY_ADDRESS = config.Factory
    const INIT_CODE_HASH = config.InitCodeHash
    const tokens = PAIR_ADDRESS.TOKEN0.toLowerCase() < PAIR_ADDRESS.TOKEN1.toLowerCase() ? [PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1] : [PAIR_ADDRESS.TOKEN1, PAIR_ADDRESS.TOKEN0] // does safety checks
    const lpAddress = getCreate2Address(
        FACTORY_ADDRESS,
        keccak256(['bytes'], [pack(['address', 'address'], [tokens[0], tokens[1]])]),
        INIT_CODE_HASH
    )
    console.log(`>> ✅ Done generated lp address of pair ${PAIR_ADDRESS.TOKEN0} - ${PAIR_ADDRESS.TOKEN1} is: ${lpAddress}`)
}


withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

