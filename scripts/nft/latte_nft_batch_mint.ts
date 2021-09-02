import { ethers, network } from "hardhat";
import { LatteNFT__factory, LatteNFT } from "../../typechain";
import { getConfig, withNetworkFile } from "../../utils";

interface IMintBatchParam {
  TO: string;
  CATEGORY_ID: string;
  SIZE: number;
  TOKEN_URI: "";
}

type IMintBatchParams = Array<IMintBatchParam>;

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
  const PARAMS: IMintBatchParams = [
    {
      TO: "0x06A7322cDDCBe5b714b712688331015790240547",
      CATEGORY_ID: "0",
      SIZE: 1,
      TOKEN_URI: "",
    },
  ];

  const config = getConfig();
  const latteNFT = LatteNFT__factory.connect(config.LatteNFT, (await ethers.getSigners())[0]) as LatteNFT;
  for (const PARAM of PARAMS) {
    console.log(
      `>> Execute Transaction to batch mint ${PARAM.CATEGORY_ID} to ${PARAM.TO} size ${PARAM.SIZE} with tokenURI ${PARAM.TOKEN_URI}`
    );
    const estimatedGas = await latteNFT.estimateGas.mintBatch(PARAM.TO, PARAM.CATEGORY_ID, PARAM.TOKEN_URI, PARAM.SIZE);
    const tx = await latteNFT.mintBatch(PARAM.TO, PARAM.CATEGORY_ID, PARAM.TOKEN_URI, PARAM.SIZE, {
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
