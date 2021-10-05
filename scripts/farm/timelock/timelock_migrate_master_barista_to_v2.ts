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
  const EXACT_ETA = "1633278300";

  const timelockTransactions: Array<ITimelockResponse> = [];

  console.log(">> Queue Transaction to migrate a MasterBarista to use LATTEV2 and BeanBagV2");

  timelockTransactions.push(
    await TimelockService.queueTransaction(
      `call migrate() function in MasterBarista to migrate to use LATTEV2 and BeanBagV2`,
      config.MasterBarista,
      "0",
      "migrate(address,address)",
      ["address", "address"],
      [config.Tokens.LATTEV2, config.BeanBagV2],
      EXACT_ETA
    )
  );
  console.log("✅ Done");

  await FileService.write("masterbarista-migrate", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
