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

  const NEW_BUY_LIMIT_COUNT = 30;
  const EXACT_ETA = "";

  const config = getConfig();
  const timelockTransactions: Array<ITimelockResponse> = [];

  console.log(`>> Queue Transaction to set a buy limit count to ${NEW_BUY_LIMIT_COUNT} through Timelock`);
  timelockTransactions.push(
    await TimelockService.queueTransaction(
      `set buy limit count of ${config.OGNFTOffering} to ${NEW_BUY_LIMIT_COUNT}`,
      config.OGNFTOffering,
      "0",
      "setBuyLimitCount(uint256)",
      ["uint256"],
      [NEW_BUY_LIMIT_COUNT],
      EXACT_ETA
    )
  );
  console.log("✅ Done");

  await FileService.write("set-buy-limit-count", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
