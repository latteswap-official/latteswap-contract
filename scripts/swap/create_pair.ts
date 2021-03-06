import { getCreate2Address } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { LatteSwapFactory__factory } from "../../typechain";
import { withNetworkFile, getConfig } from "../../utils";

interface IPairAddress {
  TOKEN0: string;
  TOKEN1: string;
}

type IPairAddresses = Array<IPairAddress>;

async function main() {
  const config = getConfig();
  const PAIR_ADDRESSES: IPairAddresses = [
    {
      TOKEN0: config.Tokens.LATTE,
      TOKEN1: config.Tokens.BUSD,
    },
    {
      TOKEN0: config.Tokens.BTCB,
      TOKEN1: config.Tokens.BUSD,
    },
    {
      TOKEN0: config.Tokens.WBNB,
      TOKEN1: config.Tokens.BUSD,
    },
    {
      TOKEN0: config.Tokens.ETH,
      TOKEN1: config.Tokens.BUSD,
    },
    {
      TOKEN0: config.Tokens.ETH,
      TOKEN1: config.Tokens.WBNB,
    },
    {
      TOKEN0: config.Tokens.BTCB,
      TOKEN1: config.Tokens.WBNB,
    },
    {
      TOKEN0: config.Tokens.ETH,
      TOKEN1: config.Tokens.BTCB,
    },
    {
      TOKEN0: config.Tokens.USDT,
      TOKEN1: config.Tokens.BUSD,
    },
    {
      TOKEN0: config.Tokens.USDC,
      TOKEN1: config.Tokens.BUSD,
    },
    {
      TOKEN0: config.Tokens.ALPACA,
      TOKEN1: config.Tokens.BUSD,
    },
  ];

  const deployer = (await ethers.getSigners())[0];
  const FACTORY_ADDRESS = config.Factory;
  const factory = LatteSwapFactory__factory.connect(FACTORY_ADDRESS, deployer);
  for (const PAIR_ADDRESS of PAIR_ADDRESSES) {
    const estimatedGas = await factory.estimateGas.createPair(PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1);
    console.log(`>> Creating Pair ${PAIR_ADDRESS.TOKEN1} - ${PAIR_ADDRESS.TOKEN0}`);
    const tx = await factory.createPair(PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1, {
      gasLimit: estimatedGas.add(100000),
    });
    await tx.wait();
    const lpAddress = await factory.getPair(PAIR_ADDRESS.TOKEN0, PAIR_ADDRESS.TOKEN1);
    console.log(`create pair ${PAIR_ADDRESS.TOKEN1} - ${PAIR_ADDRESS.TOKEN0} at ${tx.hash} lp address ${lpAddress}`);
    console.log(">> ✅ Done");
  }
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
