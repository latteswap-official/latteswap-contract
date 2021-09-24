import { ethers, network } from "hardhat";
import { DripBar, DripBar__factory } from "../../typechain";
import { withNetworkFile, getConfig } from "../../utils";

interface IAddDripBarCampaignParam {
  NAME: string;
  STAKING_TOKEN: string;
  REWARD_TOKEN: string;
  START_BLOCK: string;
}

type IAddDripBarCampaignParamList = Array<IAddDripBarCampaignParam>;

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
  const CAMPAIGNS: IAddDripBarCampaignParamList = [
    {
      NAME: "Mock Token #1",
      STAKING_TOKEN: "0xcD855F77f939B626dBe3dAdB6bE7aab961fC8977",
      REWARD_TOKEN: "0x117f7C7e629f2C097dC2897FfECcaFdf8c202117",
      START_BLOCK: "11274650",
    },
  ];

  for (let i = 0; i < CAMPAIGNS.length; i++) {
    const campaign = CAMPAIGNS[i];
    console.log(`>> Execute Transaction to add ${campaign.NAME} to Dripbar`);
    const dripbar = DripBar__factory.connect(
      "0xe26067221a286EC1D3A914E192641513883A4b36",
      (await ethers.getSigners())[0]
    ) as DripBar;
    const tx = await dripbar.addCampaignInfo(campaign.STAKING_TOKEN, campaign.REWARD_TOKEN, campaign.START_BLOCK);
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
