import { getConfig, ITimelockResponse, withNetworkFile, FileService, TimelockService } from "../../../utils";

interface IRemoveStakeTokenCallerParam {
  STAKE_TOKEN: string;
  CALLER: string;
}

type IRemoveStakeTokenCallerParams = Array<IRemoveStakeTokenCallerParam>;

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
  const PARAMS: IRemoveStakeTokenCallerParams = [
    {
      STAKE_TOKEN: config.Tokens.LATTE,
      CALLER: "0x11A250AE3b15Bab026B03b97b0e4d01F3aC03477",
    },
    {
      STAKE_TOKEN: config.Tokens.LATTE,
      CALLER: "0x62A51129E59c85a391baC8f392440E70d70e6c92",
    },
    {
      STAKE_TOKEN: config.Tokens.LATTE,
      CALLER: "0xbe4c5db18bc7e3ccbf83ec1732b79ec170b7a1e0",
    },
  ];
  const EXACT_ETA = "1632993000";

  const timelockTransactions: Array<ITimelockResponse> = [];

  for (const PARAM of PARAMS) {
    console.log(
      `>> Queue Transaction to remove a stake token caller ${PARAM.CALLER} from a staking token pool ${PARAM.STAKE_TOKEN} through Timelock`
    );
    timelockTransactions.push(
      await TimelockService.queueTransaction(
        `removing a stake token caller ${PARAM.CALLER} from a staking token pool ${PARAM.STAKE_TOKEN} through Timelock`,
        config.MasterBarista,
        "0",
        "removeStakeTokenCallerContract(address,address)",
        ["address", "address"],
        [PARAM.STAKE_TOKEN, PARAM.CALLER],
        EXACT_ETA
      )
    );
    console.log("✅ Done");
  }
  await FileService.write("remove-stake-token-caller", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
