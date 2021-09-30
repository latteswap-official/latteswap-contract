import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades, network } from "hardhat";
import { MasterBarista__factory, Timelock__factory } from "../../../typechain";
import { getConfig, ITimelockResponse, withNetworkFile, FileService, TimelockService } from "../../../utils";

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
  const TARGETED_MASTER_BARISTA = config.MasterBarista;
  const EXACT_ETA = "1632409221";

  const timelockTransactions: Array<ITimelockResponse> = [];

  console.log(`============`);
  console.log(`>> Upgrading MasterBarista through Timelock + ProxyAdmin`);
  console.log(">> Prepare upgrade & deploy if needed a new IMPL automatically.");
  const MasterBarista = (await ethers.getContractFactory("MasterBarista")) as MasterBarista__factory;
  const preparedMasterBarista = await upgrades.prepareUpgrade(TARGETED_MASTER_BARISTA, MasterBarista);
  console.log(`>> Implementation address: ${preparedMasterBarista}`);
  console.log("✅ Done");

  console.log(`>> Queue tx on Timelock to upgrade the implementation`);
  timelockTransactions.push(
    await TimelockService.queueTransaction(
      `queue tx on Timelock to upgrade the implementation to ${preparedMasterBarista}`,
      config.ProxyAdmin,
      "0",
      "upgrade(address,address)",
      ["address", "address"],
      [TARGETED_MASTER_BARISTA, preparedMasterBarista],
      EXACT_ETA
    )
  );
  console.log("✅ Done");
  await FileService.write("upgrade-master-barista", timelockTransactions);
  console.log(`============`);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
