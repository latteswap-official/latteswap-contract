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
    "0xdeAaFFD54d11B3dfa50E7A4b178E045ab750e4eA", // Booster Config
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6", // Master Barista
    "0x288f26D5Ed901e290D713Db86142302AF8266b31", // Latte Market
    "0xa4FD125A4384faf310c1e8F7b3cE87e8b423B100", // OGNFTOffering
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
