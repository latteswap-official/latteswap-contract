import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades, network } from "hardhat";
import { LatteMarket__factory, Timelock__factory } from "../../../typechain";
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
  const TARGETED_LATTE_MARKET = config.LatteMarket;
  const EXACT_ETA = "";

  const timelock = Timelock__factory.connect(config.Timelock, (await ethers.getSigners())[0]);

  console.log(`============`);
  console.log(`>> Upgrading LatteMarket through Timelock + ProxyAdmin`);
  console.log(">> Prepare upgrade & deploy if needed a new IMPL automatically.");
  const LatteMarketFactory = (await ethers.getContractFactory("LatteMarket")) as LatteMarket__factory;
  const preparedLatteMarket = await upgrades.prepareUpgrade(TARGETED_LATTE_MARKET, LatteMarketFactory);
  console.log(`>> Implementation address: ${preparedLatteMarket}`);
  console.log("✅ Done");

  console.log(`>> Queue tx on Timelock to upgrade the implementation`);
  await timelock.queueTransaction(
    config.ProxyAdmin,
    "0",
    "upgrade(address,address)",
    ethers.utils.defaultAbiCoder.encode(["address", "address"], [TARGETED_LATTE_MARKET, preparedLatteMarket]),
    EXACT_ETA
  );
  console.log("✅ Done");

  console.log(`>> Generate executeTransaction:`);
  console.log(
    `await timelock.executeTransaction('${config.ProxyAdmin}', '0', 'upgrade(address,address)', ethers.utils.defaultAbiCoder.encode(['address','address'], ['${TARGETED_LATTE_MARKET}','${preparedLatteMarket}']), ${EXACT_ETA})`
  );
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
