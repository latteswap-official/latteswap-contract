import { ethers, network } from 'hardhat';
import ProdConfig from '../../prod.json'
import DevelopConfig from '../../develop.json'
import { LatteSwapFactory, LatteSwapFactory__factory } from '../../typechain'
import { withNetworkFile } from '../../utils';


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
  const FEETO = '0xc4536F1526B683269ad1442255214f618ec943f8'







  
  const latteSwapFactory = LatteSwapFactory__factory.connect(
    config.Factory, (await ethers.getSigners())[0]
  ) as LatteSwapFactory

  console.log(`>> Execute Transaction to set a feeTo account to ${FEETO}`);
  const estimatedGas = await latteSwapFactory.estimateGas.setFeeTo(FEETO)
  const tx = await latteSwapFactory.setFeeTo(FEETO, {
    gasLimit: estimatedGas.add(100000),
  });
  console.log(`>> returned tx hash: ${tx.hash}`)
  console.log("✅ Done");
};

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })