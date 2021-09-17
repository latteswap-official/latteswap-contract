import { ITimelockResponse, withNetworkFile } from "../../utils";
import TimelockTransactions from "../results/develop/1631858047_set-staking-token-bps.json";
import { FileService, TimelockService } from "../../utils";

async function main() {
  const timelockTransactions: Array<ITimelockResponse> = [];
  try {
    for (const timelockTransaction of TimelockTransactions) {
      timelockTransactions.push(
        await TimelockService.executeTransaction(
          timelockTransaction.info,
          timelockTransaction.queuedAt,
          timelockTransaction.executionTransaction,
          timelockTransaction.target,
          timelockTransaction.value,
          timelockTransaction.signature,
          timelockTransaction.paramTypes,
          timelockTransaction.params,
          timelockTransaction.eta
        )
      );
    }
  } catch (e) {
    console.log(e);
  }

  FileService.write("timelock-execution", timelockTransactions);
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
