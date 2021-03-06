import { constants } from "ethers";
import { ethers } from "hardhat";
import { DripBar__factory, SimpleToken__factory } from "../../../typechain";
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
  const deployer = (await ethers.getSigners())[0];
  let nonce = await deployer.getTransactionCount();
  const CAMPAIGNS: IAddDripBarCampaignParamList = [
    {
      NAME: "PlayMining(Dep) Dripbar",
      STAKING_TOKEN: config.BeanBagV2,
      REWARD_TOKEN: config.Tokens.DEP,
      START_BLOCK: "13097500",
    },
  ];
  const EXACT_ETA = "1638338400";

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const campaign of CAMPAIGNS) {
    const tokenAsDeployer = SimpleToken__factory.connect(campaign.REWARD_TOKEN, deployer);
    if ((await tokenAsDeployer.allowance(await deployer.getAddress(), config.DripBar)).lte(constants.Zero)) {
      console.log(
        `>> Execute approve tx to let the deployer (as a token holder) approve Dripbar to transfer the money`
      );
      const tx = await tokenAsDeployer.approve(config.DripBar, constants.MaxUint256, {
        nonce: nonce++,
        gasPrice: ethers.utils.parseUnits("15", "gwei"),
      });
      await tx.wait();
      console.log("✅ Done");
    }

    console.log(`>> Queue Transaction to to add ${campaign.NAME} to Dripbar`);
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `add ${campaign.NAME} to Dripbar`,
        config.DripBar,
        "0",
        "addCampaignInfo(address,address,uint256)",
        ["address", "address", "uint256"],
        [campaign.STAKING_TOKEN, campaign.REWARD_TOKEN, campaign.START_BLOCK],
        EXACT_ETA,
        nonce++
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
