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
  const FEE_ADDR = await (await ethers.getSigners())[0].getAddress();
  const FEE_BPS = "150";
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
    console.log(
      `>> Execute Transaction to set support nft of ${latteMarket.address} to ${[config.OGNFT, config.LatteNFT]}`
    );
    estimatedGas = await latteMarket.estimateGas.setSupportNFT([config.OGNFT, config.LatteNFT], true);
    tx = await latteMarket.setSupportNFT([config.OGNFT, config.LatteNFT], true, {
      gasLimit: estimatedGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
    console.log(`>> Execute Transaction to set minter of a latte nft to ${latteMarket.address}`);
    estimatedGas = await latteNFT.estimateGas.grantRole(await latteNFT.MINTER_ROLE(), latteMarket.address);
    tx = await latteNFT.grantRole(await latteNFT.MINTER_ROLE(), latteMarket.address, {
      gasLimit: estimatedGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    const ogNFT = OGNFT__factory.connect(config.OGNFT, (await ethers.getSigners())[0]) as OGNFT;
    console.log(`>> Execute Transaction to set minter of an OG nft to ${latteMarket.address}`);
    estimatedGas = await ogNFT.estimateGas.grantRole(await ogNFT.MINTER_ROLE(), latteMarket.address);
    tx = await ogNFT.grantRole(await ogNFT.MINTER_ROLE(), latteMarket.address, {
      gasLimit: estimatedGas.add(100000),
    });
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
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  });
};

export default func;
func.tags = ["DeployLatteMarket"];
