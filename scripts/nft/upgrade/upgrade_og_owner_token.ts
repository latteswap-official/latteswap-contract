import { ethers, network, upgrades } from "hardhat";
import { OGOwnerToken, OGOwnerToken__factory } from "../../../typechain";
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

  const OGOwnerToken = (await ethers.getContractFactory(
    "OGOwnerToken",
    (
      await ethers.getSigners()
    )[0]
  )) as OGOwnerToken__factory;

  const ogOwnerTokens = Object.values(config.OGOwnerToken);
  for (const token of ogOwnerTokens) {
    console.log(`>> Upgrading an OGOwnerToken ${token}`);
    const latteMarket = (await upgrades.upgradeProxy(token, OGOwnerToken)) as OGOwnerToken;
    await latteMarket.deployed();
    console.log(`✅ Done Upgrading an OGOwnerToken`);
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
