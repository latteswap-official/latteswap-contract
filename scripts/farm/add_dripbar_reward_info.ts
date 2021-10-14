import { ethers, network } from "hardhat";
import { DripBar, DripBar__factory } from "../../typechain";
import { withNetworkFile, getConfig } from "../../utils";

interface IAddDripBarRewardInfoParam {
  PHASE_NAME: string;
  CAMPAIGN_ID: string;
  ENDBLOCK: string;
  REWARD_PER_BLOCK: string;
}

type IAddDripBarRewardInfoParamList = Array<IAddDripBarRewardInfoParam>;

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
  const REWARDINFO: IAddDripBarRewardInfoParamList = [
    {
      PHASE_NAME: "Phase 1 (8 weeks)",
      CAMPAIGN_ID: "0",
      ENDBLOCK: "13378400",
      REWARD_PER_BLOCK: ethers.utils.parseEther("0.02976").toString(),
    },
  ];

  for (let i = 0; i < REWARDINFO.length; i++) {
    const rewardInfo = REWARDINFO[i];
    const dripbar = DripBar__factory.connect(config.DripBar, (await ethers.getSigners())[0]) as DripBar;

    console.log(
      `>> Execute Transaction to add reward info for campaign#${rewardInfo.CAMPAIGN_ID} ${rewardInfo.PHASE_NAME}`
    );
    const tx = await dripbar.addRewardInfo(rewardInfo.CAMPAIGN_ID, rewardInfo.ENDBLOCK, rewardInfo.REWARD_PER_BLOCK, {
      gasLimit: 10000000,
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
