import { ethers, network } from "hardhat";
import { LatteNFT, LatteNFT__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface ICategory {
  ID: number;
  NAME: string;
  URI: string;
}

type ICategories = Array<ICategory>;

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
  const CATEGORIES: ICategories = [
    {
      ID: 1,
      NAME: "Whole Milk",
      URI: "/wholemilk.json",
    },
  ];

  const config = getConfig();
  const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
  for (const CATEGORY of CATEGORIES) {
    console.log(
      `>> Execute Transaction to update category ${CATEGORY.ID} info ${CATEGORY.NAME} with URI ${CATEGORY.URI}`
    );
    const estimatedGas = await latteNFT.estimateGas.updateCategoryInfo(CATEGORY.ID, CATEGORY.NAME, CATEGORY.URI);
    const tx = await latteNFT.updateCategoryInfo(CATEGORY.ID, CATEGORY.NAME, CATEGORY.URI, {
      gasLimit: estimatedGas.add(100000),
    });
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
