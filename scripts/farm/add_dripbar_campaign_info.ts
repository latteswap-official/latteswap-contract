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
      NAME: "Mock Token #2",
      STAKING_TOKEN: config.BeanBag,
      REWARD_TOKEN: "0x128EEB898Db09784262E346900EDA06815873065",
      START_BLOCK: "11329540",
    },
  ];

  for (let i = 0; i < CAMPAIGNS.length; i++) {
    const campaign = CAMPAIGNS[i];
    console.log(`>> Execute Transaction to add ${campaign.NAME} to Dripbar`);
    const dripbar = DripBar__factory.connect(config.DripBar, (await ethers.getSigners())[0]) as DripBar;
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
