import { getCreate2Address } from "ethers/lib/utils";
import { ethers } from "hardhat";
import DevelopConfig from '../../develop.json'
import ProdConfig from '../../prod.json'
import { LatteSwapFactory__factory } from "../../typechain";
import { withNetworkFile } from "../../utils";


interface IPairAddress {
    TOKEN0: string
    TOKEN1: string
}

async function main() {
    const config = process.env.DEPLOYMENT_ENV === "prod" ? ProdConfig : DevelopConfig
    const PAIR_ADDRESS: IPairAddress = {
        TOKEN0: config.Tokens.LATTE,
        TOKEN1: config.Tokens.BUSD,
    }
    
    const deployer = (await ethers.getSigners())[0]
    const FACTORY_ADDRESS = config.Factory
    const factory = LatteSwapFactory__factory.connect(FACTORY_ADDRESS, deployer)
    const estimatedGas = await factory.estimateGas.createPair(PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1)
    console.log(`>> Creating Pair ${PAIR_ADDRESS.TOKEN1} - ${PAIR_ADDRESS.TOKEN0}`)
    const tx = await factory.createPair(PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1, {
        gasLimit: estimatedGas.add(100000),
    })
    await tx.wait()
    const lpAddress = await factory.getPair(PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1)
    console.log(`create pair ${PAIR_ADDRESS.TOKEN1} - ${PAIR_ADDRESS.TOKEN0} at ${tx.hash} lp address ${lpAddress}`)
    console.log(">> ✅ Done");
}


withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

