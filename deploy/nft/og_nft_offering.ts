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
  const FEE_ADDR = "0xC29d5eB3d4baBa9b23753B00b8F048ec0431E358"; // og market treasury
  const SELLER_ADDR = "0xC29d5eB3d4baBa9b23753B00b8F048ec0431E358"; // og market treasury
  const FEE_BPS = "0";
  const WNATIVE_RELAYER = config.WnativeRelayer;
  const WNATIVE = config.Tokens.WBNB;
  const PRICE_SLOPE = [
    {
      categoryId: 1,
      price: parseEther("2.18"),
      slope: 10000,
    },
    {
      categoryId: 1,
      price: parseEther("3.28"),
      slope: 5000,
    },
    {
      categoryId: 1,
      price: parseEther("4.28"),
      slope: 2000,
    },
    {
      categoryId: 2,
      price: parseEther("3.38"),
      slope: 10000,
    },
    {
      categoryId: 2,
      price: parseEther("5.08"),
      slope: 5000,
    },
    {
      categoryId: 2,
      price: parseEther("6.88"),
      slope: 2000,
    },
    {
      categoryId: 3,
      price: parseEther("29.88"),
      slope: 10000,
    },
    {
      categoryId: 3,
      price: parseEther("44.78"),
      slope: 5000,
    },
    {
      categoryId: 3,
      price: parseEther("58.88"),
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

    console.log(`>> Execute Transaction to set governance role to ${SELLER_ADDR}`);
    estimatedGas = await ogNftOffering.estimateGas.grantRole(await ogNftOffering.GOVERNANCE_ROLE(), SELLER_ADDR);
    tx = await ogNftOffering.grantRole(await ogNftOffering.GOVERNANCE_ROLE(), SELLER_ADDR, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

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
