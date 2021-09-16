import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import {
  LatteMarket,
  LatteMarket__factory,
  LatteNFT,
  LatteNFT__factory,
  OGNFT,
  OGNFT__factory,
  WNativeRelayer,
  WNativeRelayer__factory,
} from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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
  const FEE_ADDR = "0x1E70d4B0F723D660E99B9a404fca1548717034aD"; // latte market treasury
  const SELLER_ADDR = "0x1E70d4B0F723D660E99B9a404fca1548717034aD"; // latte market treasury
  const FEE_BPS = "0";
  const WNATIVE_RELAYER = config.WnativeRelayer;
  const WNATIVE = config.Tokens.WBNB;
  // Deploy LatteMarket
  console.log(`>> Deploying LatteMarket`);
  let tx, estimatedGas;
  await withNetworkFile(async () => {
    const LatteMarket = (await ethers.getContractFactory(
      "LatteMarket",
      (
        await ethers.getSigners()
      )[0]
    )) as LatteMarket__factory;
    const latteMarket = (await upgrades.deployProxy(LatteMarket, [
      FEE_ADDR,
      FEE_BPS,
      WNATIVE_RELAYER,
      WNATIVE,
    ])) as LatteMarket;
    await latteMarket.deployed();
    console.log(`>> Deployed at ${latteMarket.address}`);
    console.log(`>> ✅ Done Deploying LatteMarket`);

    console.log(`>> Execute Transaction to set support nft of ${latteMarket.address} to ${[config.LatteNFT]}`);
    estimatedGas = await latteMarket.estimateGas.setSupportNFT([config.LatteNFT], true);
    tx = await latteMarket.setSupportNFT([config.LatteNFT], true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(`>> Execute Transaction to set governance role to ${SELLER_ADDR}`);
    estimatedGas = await latteMarket.estimateGas.grantRole(await latteMarket.GOVERNANCE_ROLE(), SELLER_ADDR);
    tx = await latteMarket.grantRole(await latteMarket.GOVERNANCE_ROLE(), SELLER_ADDR, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
    console.log(`>> Execute Transaction to set minter of a latte nft to ${latteMarket.address}`);
    estimatedGas = await latteNFT.estimateGas.grantRole(await latteNFT.MINTER_ROLE(), latteMarket.address);
    tx = await latteNFT.grantRole(await latteNFT.MINTER_ROLE(), latteMarket.address, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    const wNativeRelayer = WNativeRelayer__factory.connect(
      config.WnativeRelayer,
      (await ethers.getSigners())[0]
    ) as WNativeRelayer;
    console.log(`>> Execute Transaction to set wNativeRelayer setCallerOK to ${latteMarket.address}`);
    estimatedGas = await wNativeRelayer.estimateGas.setCallerOk([latteMarket.address], true);
    tx = await wNativeRelayer.setCallerOk([latteMarket.address], true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  });
};

export default func;
func.tags = ["DeployLatteMarket"];
