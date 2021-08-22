import {  Ownable__factory } from '../../typechain'
import { ethers, network } from 'hardhat';
import ProdConfig from '../../prod.json'
import DevelopConfig from '../../develop.json'
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

  const TO_BE_TRANSFERED: Array<string> = [
  ];








  const config = process.env.DEPLOYMENT_ENV === "prod" ? ProdConfig : DevelopConfig

  for(let i = 0; i < TO_BE_TRANSFERED.length; i++ ) {
    console.log(`>> Transferring ownership of ${TO_BE_TRANSFERED[i]} to TIMELOCK`);
    const ownable = Ownable__factory.connect(TO_BE_TRANSFERED[i], (await ethers.getSigners())[0]);
    const tx = await ownable.transferOwnership(config.Timelock);
    console.log(`>> tx hash: ${tx.hash}`)
    console.log("✅ Done")
  }
};

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })