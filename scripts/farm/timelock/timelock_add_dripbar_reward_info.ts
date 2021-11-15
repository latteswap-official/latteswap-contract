import { ethers } from "ethers";
import { DripBar__factory } from "../../../typechain";
import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from "../../../utils";

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
      CAMPAIGN_ID: "4",
      ENDBLOCK: "14139300",
      REWARD_PER_BLOCK: ethers.utils.parseEther("0.49603").toString(),
    },
  ];
  const EXACT_ETA = "1636524000";

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const rewardInfo of REWARDINFO) {
    console.log(
      `>> Queue Transaction to add reward info for campaign#${rewardInfo.CAMPAIGN_ID} ${rewardInfo.PHASE_NAME}`
    );
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `add reward info for campaign#${rewardInfo.CAMPAIGN_ID} ${rewardInfo.PHASE_NAME}`,
        config.DripBar,
        "0",
        "addRewardInfo(uint256,uint256,uint256)",
        ["uint256", "uint256", "uint256"],
        [rewardInfo.CAMPAIGN_ID, rewardInfo.ENDBLOCK, rewardInfo.REWARD_PER_BLOCK],
        EXACT_ETA
      )
    );
    console.log("✅ Done");
  }

  await FileService.write("add-dripbar-reward-info", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
