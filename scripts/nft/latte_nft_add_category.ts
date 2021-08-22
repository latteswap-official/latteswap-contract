import { ethers, network } from "hardhat";
import { LatteNFT, LatteNFT__factory } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface ICategory {
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
      NAME: "Soy Milk",
      URI: "/soymilk.json",
    },
    {
      NAME: "Milk Tea",
      URI: "/milktea.json",
    },
  ];

  const config = getConfig();
  const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
  for (let CATEGORY of CATEGORIES) {
    console.log(`>> Execute Transaction to add category info ${CATEGORY.NAME} with URI ${CATEGORY.URI}`);
    const estimatedGas = await latteNFT.estimateGas.addCategoryInfo(CATEGORY.NAME, CATEGORY.URI);
    const tx = await latteNFT.addCategoryInfo(CATEGORY.NAME, CATEGORY.URI, {
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
