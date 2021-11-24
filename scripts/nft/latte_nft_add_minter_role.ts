import { ethers, network } from "hardhat";
import { LatteNFT, LatteNFT__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

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
  const MINTER_ROLES: Array<string> = [config.SurvivalGame];

  const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
  for (const MINTER_ROLE of MINTER_ROLES) {
    console.log(`>> Execute Transaction to add minter role to ${MINTER_ROLE}`);
    const estimatedGas = await latteNFT.estimateGas.grantRole(await latteNFT.MINTER_ROLE(), MINTER_ROLE);
    const tx = await latteNFT.grantRole(await latteNFT.MINTER_ROLE(), MINTER_ROLE, {
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
