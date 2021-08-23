import { LATTE__factory, LATTE, BeanBag__factory, BeanBag } from "../../typechain";
import { ethers, network } from "hardhat";
import { withNetworkFile, getConfig } from "../../utils";

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

  const latte = LATTE__factory.connect(config.Tokens.LATTE, (await ethers.getSigners())[0]) as LATTE;

  const bean = BeanBag__factory.connect(config.BeanBag, (await ethers.getSigners())[0]) as BeanBag;

  console.log(`>> Execute Transaction to transfer latte's ownership to master barista`);
  let estimateGas = await latte.estimateGas.transferOwnership(config.MasterBarista);
  let tx = await latte.transferOwnership(config.MasterBarista, {
    gasLimit: estimateGas.add(100000),
  });
  console.log(`>> returned tx hash: ${tx.hash}`);

  console.log(`>> Execute Transaction to transfer bean's ownership to master barista`);
  estimateGas = await bean.estimateGas.transferOwnership(config.MasterBarista);
  tx = await bean.transferOwnership(config.MasterBarista, {
    gasLimit: estimateGas.add(100000),
  });
  console.log(`>> returned tx hash: ${tx.hash}`);
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
