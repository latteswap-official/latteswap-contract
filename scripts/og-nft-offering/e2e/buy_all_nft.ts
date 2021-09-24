import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import {
  OGNFTOffering,
  OGNFTOffering__factory,
  TripleSlopePriceModel,
  TripleSlopePriceModel__factory,
} from "../../../typechain";
import { getConfig } from "../../../utils";
import { advanceBlockTo, latestBlockNumber } from "../../../tests/helpers/time";
import { commify, formatEther, parseEther } from "ethers/lib/utils";

const signatureFn = async (signer: Signer, msg = "I am an EOA"): Promise<string> => {
  return await signer.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(msg))));
};

const prepareNetwork = async (): Promise<Signer> => {
  if (network.name !== "mainnetfork") throw new Error("not mainnet fork");
  const aliceAddress = await (await ethers.getSigners())[0].getAddress();
  console.log(aliceAddress);
  console.log(`===== Impersonating ${aliceAddress} =====`);
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [aliceAddress],
  });
  console.log(`===== Finished Impersonating ${aliceAddress} ===== `);

  const signer = await ethers.getSigner(aliceAddress);

  console.log(`===== Set Bal ${aliceAddress} =====`);
  const newBalance = ethers.utils.parseEther("10000");

  // this is necessary because hex quantities with leading zeros are not valid at the JSON-RPC layer
  const newBalanceHex = newBalance.toHexString().replace(/0x0+/, "0x");
  await network.provider.send("hardhat_setBalance", [aliceAddress, newBalanceHex]);
  console.log(`===== Finished Set Bal ${aliceAddress} ===== `);
  console.log(await signer.getAddress());
  console.log(commify(formatEther(await signer.getBalance())));
  if ((await ethers.provider.getBlockNumber()) < 11047888) {
    console.log(`===== Advance block to ${11047888} =====`);
    await advanceBlockTo(11047888);
    console.log(`===== Finished advancing block =====`);
  } else {
    await advanceBlockTo((await ethers.provider.getBlockNumber()) + 100);
    console.log(`===== Bypass advancing block =====`);
  }

  return signer;
};

async function main() {
  const config = getConfig();
  const signer = await prepareNetwork();
  const ogOffering = OGNFTOffering__factory.connect(config.OGNFTOffering, signer) as OGNFTOffering;
  const priceModel = TripleSlopePriceModel__factory.connect(config.TripleSlopPriceModel, signer);
  const signature = await signatureFn(signer);
  const buyLimitPeriod = await ogOffering.buyLimitPeriod();
  const buyLimitCount = await ogOffering.buyLimitCount();

  for (let categoryId = 3; categoryId >= 1; categoryId--) {
    console.log(`===== START Category: ${categoryId} =====`);
    const maxCap = (await ogOffering.ogNFTMetadata(categoryId)).maxCap.toNumber();
    let counter = (await ogOffering.ogNFTMetadata(categoryId)).cap.toNumber();
    console.log(`Initial cap, counter: ${maxCap}, ${counter}`);

    while (counter > 0) {
      console.log(`Execute from ${counter} to ${counter - 5}`);
      for (let iter = 0; iter < buyLimitCount.toNumber(); iter++) {
        console.log(`================== start ${iter + 1} ======================`);
        console.log(iter + 1);
        if (counter == 0) continue;
        const amount = await priceModel.getPrice(maxCap, counter - 1, categoryId);
        console.log(
          `Buy ${commify(formatEther(amount))} at cap ${counter} thus the cap for getting price will be ${counter - 1}`
        );
        console.log((await ogOffering.ogNFTMetadata(categoryId)).startBlock.toString());
        await ogOffering.buyNFT(categoryId, signature, {
          value: amount,
        });
        console.table({
          actual: (await ogOffering.ogNFTMetadata(categoryId)).cap.toNumber(),
          expected: counter - 1,
        });
        console.log(`================= end ${iter + 1} =======================`);
        counter--;
      }
      if (counter == 0) continue;
      console.log(`Expect to reverted OGNFTOffering::_buyNFTTo::exceed buy limit `);
      await expect(
        ogOffering.buyNFT(categoryId, signature, {
          value: await priceModel.getPrice(maxCap, counter - 1, categoryId),
        })
      ).to.revertedWith("OGNFTOffering::_buyNFTTo::exceed buy limit");
      console.log(`Pass expected`);
      await advanceBlockTo((await latestBlockNumber()).toNumber() + buyLimitPeriod.toNumber());
    }
    console.log(`===== END Category: ${categoryId} =====`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
