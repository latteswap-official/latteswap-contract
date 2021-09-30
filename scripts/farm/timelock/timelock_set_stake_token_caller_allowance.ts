import { getConfig, ITimelockResponse, withNetworkFile, FileService, TimelockService } from "../../../utils";

interface ISetStakeTokenCallerAllowanceParam {
  STAKE_TOKEN: string;
  IS_ALLOWED: boolean;
}

type ISetStakeTokenCallerAllowanceParams = Array<ISetStakeTokenCallerAllowanceParam>;

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
  const PARAMS: ISetStakeTokenCallerAllowanceParams = [
    {
      STAKE_TOKEN: config.Tokens.LATTE,
      IS_ALLOWED: false,
    },
  ];
  const EXACT_ETA = "1632994200";

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const PARAM of PARAMS) {
    console.log(
      `>> Queue Transaction to set allowance of a staking token pool ${PARAM.STAKE_TOKEN} using an external funder ${PARAM.IS_ALLOWED} through Timelock`
    );
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `setting allowance of a staking token pool ${PARAM.STAKE_TOKEN} using an external funder ${PARAM.IS_ALLOWED} through Timelock`,
        config.MasterBarista,
        "0",
        "setStakeTokenCallerAllowancePool(address,bool)",
        ["address", "bool"],
        [PARAM.STAKE_TOKEN, PARAM.IS_ALLOWED],
        EXACT_ETA
      )
    );
    console.log("✅ Done");
  }
  await FileService.write("remove-stake-token-caller-allowance", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
