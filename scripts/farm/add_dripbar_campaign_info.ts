import { constants } from "ethers";
import { ethers, network } from "hardhat";
import { DripBar, DripBar__factory, SimpleToken__factory } from "../../typechain";
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
  const deployer = (await ethers.getSigners())[0];
  const CAMPAIGNS: IAddDripBarCampaignParamList = [
    {
      NAME: "Elastic BNB Dripbar",
      STAKING_TOKEN: config.BeanBagV2,
      REWARD_TOKEN: config.Tokens.XBN,
      START_BLOCK: "11765600",
    },
  ];

  for (let i = 0; i < CAMPAIGNS.length; i++) {
    const campaign = CAMPAIGNS[i];
    const tokenAsDeployer = SimpleToken__factory.connect(campaign.REWARD_TOKEN, deployer);
    if ((await tokenAsDeployer.allowance(await deployer.getAddress(), config.DripBar)).lte(constants.Zero)) {
      console.log(
        `>> Execute approve tx to let the deployer (as a token holder) approve Dripbar to transfer the money`
      );
      const tx = await tokenAsDeployer.approve(config.DripBar, constants.MaxUint256);
      await tx.wait();
      console.log("✅ Done");
    }
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
