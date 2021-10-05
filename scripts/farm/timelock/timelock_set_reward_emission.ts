import { ethers } from "hardhat";
import { MasterBarista__factory } from "../../../typechain";
import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from "../../../utils";

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
  const LATTE_PER_BLOCK = ethers.utils.parseEther("10");
  const EXACT_ETA = "1633438806";

  const timelockTransactions: Array<ITimelockResponse> = [];

  console.log(`>> Queue Transaction to set a reward emission to ${LATTE_PER_BLOCK} through Timelock`);

  timelockTransactions.push(
    await TimelockService.queueTransaction(
      `seting a reward emission to ${LATTE_PER_BLOCK} through Timelock`,
      config.MasterBarista,
      "0",
      "setLattePerBlock(uint256)",
      ["uint256"],
      [LATTE_PER_BLOCK],
      EXACT_ETA
    )
  );
  console.log("✅ Done");

  await FileService.write("set-reward-emission", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
