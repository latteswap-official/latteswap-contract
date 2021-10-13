import { DripBar__factory } from "../../../typechain";
import { FileService, TimelockService, ITimelockResponse, getConfig, withNetworkFile } from "../../../utils";

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
      NAME: "LuckyLion Dripbar",
      STAKING_TOKEN: config.BeanBagV2,
      REWARD_TOKEN: config.Tokens.LUCKY,
      START_BLOCK: "11708000",
    },
  ];
  const EXACT_ETA = "";

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const campaign of CAMPAIGNS) {
    console.log(`>> Queue Transaction to to add ${campaign.NAME} to Dripbar`);
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `add ${campaign.NAME} to Dripbar`,
        config.DripBar,
        "0",
        "addCampaignInfo(address,address,uint256)",
        ["address", "address", "uint256"],
        [campaign.STAKING_TOKEN, campaign.REWARD_TOKEN, campaign.START_BLOCK],
        EXACT_ETA
      )
    );
    console.log("✅ Done");
  }

  await FileService.write("add-dripbar-campaign-info", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });