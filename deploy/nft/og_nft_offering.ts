import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import {
  OGNFTOffering,
  OGNFTOffering__factory,
  LatteNFT,
  LatteNFT__factory,
  OGNFT,
  OGNFT__factory,
  WNativeRelayer,
  WNativeRelayer__factory,
} from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";
import { parseEther } from "@ethersproject/units";

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
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const deployer = await (await ethers.getSigners())[0].getAddress();
  const config = getConfig();
  const FEE_ADDR = deployer;
  const FEE_BPS = "150";
  const WNATIVE_RELAYER = config.WnativeRelayer;
  const WNATIVE = config.Tokens.WBNB;
  const PRICE_SLOPE = [
    {
      categoryId: 0,
      price: parseEther("0.000161"),
      slope: 10000,
    },
    {
      categoryId: 0,
      price: parseEther("0.000269"),
      slope: 5000,
    },
    {
      categoryId: 0,
      price: parseEther("0.000359"),
      slope: 2000,
    },
    {
      categoryId: 1,
      price: parseEther("0.000282"),
      slope: 10000,
    },
    {
      categoryId: 1,
      price: parseEther("0.000493"),
      slope: 5000,
    },
    {
      categoryId: 1,
      price: parseEther("0.000669"),
      slope: 2000,
    },
    {
      categoryId: 2,
      price: parseEther("0.002486"),
      slope: 10000,
    },
    {
      categoryId: 2,
      price: parseEther("0.004616"),
      slope: 5000,
    },
    {
      categoryId: 2,
      price: parseEther("0.006392"),
      slope: 2000,
    },
  ];

  let tx, estimatedGas;
  await withNetworkFile(async () => {
    // deploy triple slope price model
    await deploy("TripleSlopePriceModel", {
      from: deployer,
      contract: "TripleSlopePriceModel",
      args: [PRICE_SLOPE],
      log: true,
      deterministicDeployment: false,
    });

    // Deploy OGNFTOffering
    console.log(`>> Deploying OGNFTOffering`);
    const OGNFTOffering = (await ethers.getContractFactory(
      "OGNFTOffering",
      (
        await ethers.getSigners()
      )[0]
    )) as OGNFTOffering__factory;
    const ogNftOffering = (await upgrades.deployProxy(OGNFTOffering, [
      config.OGNFT,
      FEE_ADDR,
      FEE_BPS,
      WNATIVE_RELAYER,
      WNATIVE,
      (await deployments.get("TripleSlopePriceModel")).address,
    ])) as OGNFTOffering;
    await ogNftOffering.deployed();
    console.log(`>> Deployed at ${ogNftOffering.address}`);
    console.log(`>> ✅ Done Deploying OGNFTOffering`);

    const ogNFT = OGNFT__factory.connect(config.OGNFT, (await ethers.getSigners())[0]) as OGNFT;
    console.log(`>> Execute Transaction to set minter of an OG nft to ${ogNftOffering.address}`);
    estimatedGas = await ogNFT.estimateGas.grantRole(await ogNFT.MINTER_ROLE(), ogNftOffering.address);
    tx = await ogNFT.grantRole(await ogNFT.MINTER_ROLE(), ogNftOffering.address, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    const wNativeRelayer = WNativeRelayer__factory.connect(
      config.WnativeRelayer,
      (await ethers.getSigners())[0]
    ) as WNativeRelayer;
    console.log(`>> Execute Transaction to set wNativeRelayer setCallerOK to ${ogNftOffering.address}`);
    estimatedGas = await wNativeRelayer.estimateGas.setCallerOk([ogNftOffering.address], true);
    tx = await wNativeRelayer.setCallerOk([ogNftOffering.address], true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  });
};

export default func;
func.tags = ["DeployOGNFTOffering"];
