import { Ownable__factory } from "../../typechain";
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

  const TO_BE_TRANSFERED: Array<string> = [
    "0xEb85Af63fb38eFa97AccaAe2c66F4b3636a435E9", // Master Barista
    "0xCe16028373F210c42f366aDB78819c02611d2b79", // Booster Config
    "0x4e2B5591Eb8378314a8042D422F36D3F6E150756", // Latte Market
    "0x360946e5d90eb6Be5931D88A152E43146415da5E", // OG NFT Offering
  ];

  const config = getConfig();

  for (let i = 0; i < TO_BE_TRANSFERED.length; i++) {
    console.log(`>> Transferring ownership of ${TO_BE_TRANSFERED[i]} to TIMELOCK`);
    const ownable = Ownable__factory.connect(TO_BE_TRANSFERED[i], (await ethers.getSigners())[0]);
    const tx = await ownable.transferOwnership(config.Timelock);
    await tx.wait();
    console.log(`>> tx hash: ${tx.hash}`);
    console.log("✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
