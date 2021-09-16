import { ethers, network } from "hardhat";
import { OGNFT, OGNFT__factory } from "../../typechain";
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
      NAME: "DEFAULT CATEGORY",
      URI: "",
    },
    {
      NAME: "Light Roast",
      URI: "lightroast.json",
    },
    {
      NAME: "Medium Roast",
      URI: "mediumroast.json",
    },
    {
      NAME: "Dark Roast",
      URI: "darkroast.json",
    },
  ];

  const config = getConfig();
  const ogNFT = OGNFT__factory.connect(config.OGNFT, (await ethers.getSigners())[0]) as OGNFT;
  for (const CATEGORY of CATEGORIES) {
    console.log(`>> Execute Transaction to add category info ${CATEGORY.NAME} with URI ${CATEGORY.URI}`);
    const estimatedGas = await ogNFT.estimateGas.addCategoryInfo(CATEGORY.NAME, CATEGORY.URI);
    const tx = await ogNFT.addCategoryInfo(CATEGORY.NAME, CATEGORY.URI, {
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
