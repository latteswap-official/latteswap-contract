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
      NAME: "Mock Token #3",
      STAKING_TOKEN: config.BeanBagV2,
      REWARD_TOKEN: "0x360C50c8da3288FD7f875d4e93cf03038878fF85",
      START_BLOCK: "11565163",
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
