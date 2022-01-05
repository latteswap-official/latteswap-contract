import { ITimelockResponse, withNetworkFile } from "../../utils";
import TimelockTransactions from "../results/prod/1640153998_set-staking-token-category-allowance.json";
import { FileService, TimelockService } from "../../utils";
import { ethers } from "hardhat";

async function main() {
  const deployer = (await ethers.getSigners())[0];
  let nonce = await deployer.getTransactionCount();
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
          timelockTransaction.eta,
          nonce++
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
