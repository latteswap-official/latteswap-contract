import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades, network } from "hardhat";
import { Booster__factory, Timelock__factory } from "../../../typechain";
import { getConfig, withNetworkFile } from "../../../utils";

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
  const TARGETED_BOOSTER = config.Booster;
  const EXACT_ETA = "";

  const timelock = Timelock__factory.connect(config.Timelock, (await ethers.getSigners())[0]);

  console.log(`============`);
  console.log(`>> Upgrading Booster through Timelock + ProxyAdmin`);
  console.log(">> Prepare upgrade & deploy if needed a new IMPL automatically.");
  const BoosterFactory = (await ethers.getContractFactory("Booster")) as Booster__factory;
  const preparedOGNFTOffering = await upgrades.prepareUpgrade(TARGETED_BOOSTER, BoosterFactory);
  console.log(`>> Implementation address: ${preparedOGNFTOffering}`);
  console.log("✅ Done");

  console.log(`>> Queue tx on Timelock to upgrade the implementation`);
  await timelock.queueTransaction(
    config.ProxyAdmin,
    "0",
    "upgrade(address,address)",
    ethers.utils.defaultAbiCoder.encode(["address", "address"], [TARGETED_BOOSTER, preparedOGNFTOffering]),
    EXACT_ETA
  );
  console.log("✅ Done");

  console.log(`>> Generate executeTransaction:`);
  console.log(
    `await timelock.executeTransaction('${config.ProxyAdmin}', '0', 'upgrade(address,address)', ethers.utils.defaultAbiCoder.encode(['address','address'], ['${TARGETED_BOOSTER}','${preparedOGNFTOffering}']), ${EXACT_ETA})`
  );
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
