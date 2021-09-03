import { ethers, network, upgrades } from "hardhat";
import {
  MasterBarista,
  MasterBarista__factory,
  OGNFT,
  OGNFT__factory,
  OGOwnerToken,
  OGOwnerToken__factory,
} from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface IOwnerTokenParam {
  CATEGORY_ID: number;
  POOL_ALLOC_BPS: number;
}
type IOwnerTokenParams = Array<IOwnerTokenParam>;

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
  const CATEGORIES: IOwnerTokenParams = [
    // {
    //   CATEGORY_ID: 0,
    //   POOL_ALLOC_BPS: 300,
    // },
    // {
    //   CATEGORY_ID: 1,
    //   POOL_ALLOC_BPS: 300,
    // },
    {
      CATEGORY_ID: 2,
      POOL_ALLOC_BPS: 325,
    },
  ];

  const config = getConfig();
  const ogNFT = OGNFT__factory.connect(config.OGNFT, (await ethers.getSigners())[0]) as OGNFT;
  let tx, estimatedGas;
  for (const CATEGORY of CATEGORIES) {
    console.log(`>> Executing for a category: ${CATEGORY.CATEGORY_ID}`);
    console.log(`>> Deploying ogOwnerToken`);
    const OGOwnerToken = (await ethers.getContractFactory(
      "OGOwnerToken",
      (
        await ethers.getSigners()
      )[0]
    )) as OGOwnerToken__factory;
    const ogOwnerToken = (await upgrades.deployProxy(OGOwnerToken, [
      `og_owner_cat${CATEGORY.CATEGORY_ID}`,
      `og_owner_cat${CATEGORY.CATEGORY_ID}`,
      config.Timelock,
    ])) as OGOwnerToken;
    await ogOwnerToken.deployed();
    console.log(`>> Deployed at ${ogOwnerToken.address}`);
    console.log(`>> ✅ Done Deploying ogOwnerToken`);

    console.log(">> Set okHolders on ogOwnerToken to be be an OG NFT and Master barista");
    tx = await ogOwnerToken.setOkHolders([config.OGNFT, config.MasterBarista], true);
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(">> Transferring ownership of ogOwnerToken to an OGNFT");
    tx = await ogOwnerToken.transferOwnership(config.OGNFT);
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(`>> Execute Transaction to set og owner token to og nft category ${CATEGORY.CATEGORY_ID}`);
    estimatedGas = await ogNFT.estimateGas.setCategoryOGOwnerToken(CATEGORY.CATEGORY_ID, ogOwnerToken.address);
    tx = await ogNFT.setCategoryOGOwnerToken(CATEGORY.CATEGORY_ID, ogOwnerToken.address, {
      gasLimit: estimatedGas.add(100000),
    });
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    const masterBarista = MasterBarista__factory.connect(
      config.MasterBarista,
      (await ethers.getSigners())[0]
    ) as MasterBarista;

    console.log(`>> Execute Transaction to add pool ${ogOwnerToken.address} to a MasterBarista`);
    estimatedGas = await masterBarista.estimateGas.addPool(ogOwnerToken.address, 0);
    tx = await masterBarista.addPool(ogOwnerToken.address, 0, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(`>> Execute Transaction to set stakeTokenCallerAllowance to ${ogOwnerToken.address}`);
    estimatedGas = await masterBarista.estimateGas.setStakeTokenCallerAllowancePool(ogOwnerToken.address, true);
    tx = await masterBarista.setStakeTokenCallerAllowancePool(ogOwnerToken.address, true, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(
      `>> Execute Transaction to allow a contract og nft ${ogNFT.address} to be able to fund a ${ogOwnerToken.address}`
    );
    estimatedGas = await masterBarista.estimateGas.addStakeTokenCallerContract(ogOwnerToken.address, ogNFT.address);
    tx = await masterBarista.addStakeTokenCallerContract(ogOwnerToken.address, ogNFT.address, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");

    console.log(
      `>> Execute Transaction to set poolAllocBps for ${ogOwnerToken.address} to ${CATEGORY.POOL_ALLOC_BPS} BPS`
    );
    estimatedGas = await masterBarista.estimateGas.setPoolAllocBps(ogOwnerToken.address, CATEGORY.POOL_ALLOC_BPS);
    tx = await masterBarista.setPoolAllocBps(ogOwnerToken.address, CATEGORY.POOL_ALLOC_BPS, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    console.log(`>> returned tx hash: ${tx.hash}`);
    console.log("✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
