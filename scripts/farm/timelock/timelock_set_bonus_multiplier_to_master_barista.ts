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
  const MULTIPLIER = "5";
  const EXACT_ETA = "1632713400";

  const timelockTransactions: Array<ITimelockResponse> = [];

  console.log(">> Queue Transaction to set a new bonus multiplier through Timelock");
  const masterBarista = MasterBarista__factory.connect(config.MasterBarista, (await ethers.getSigners())[0]);
  const bonusEndBlock = await masterBarista.bonusEndBlock();
  const bonusLockupBps = await masterBarista.bonusLockUpBps();

  timelockTransactions.push(
    await TimelockService.queueTransaction(
      `setting a new bonus multiplier to ${MULTIPLIER} having the same endblock ${bonusEndBlock} and lock bps ${bonusLockupBps}`,
      config.MasterBarista,
      "0",
      "setBonus(uint256,uint256,uint256)",
      ["uint256", "uint256", "uint256"],
      [MULTIPLIER, bonusEndBlock, bonusLockupBps],
      EXACT_ETA
    )
  );
  console.log("✅ Done");

  await FileService.write("set-masterbarista-multiplier", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
