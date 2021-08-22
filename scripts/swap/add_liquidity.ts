import { ethers } from "hardhat";
import { ERC20__factory, LatteSwapRouter, LatteSwapRouter__factory } from "../../typechain";
import ProdConfig from "../../prod.json";
import DevelopConfig from "../../develop.json";
import { BigNumber, constants } from "ethers";
import hre from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { withNetworkFile } from "../../utils";

const FOREVER = 20000000000;

interface IPair {
  NAME: string;
  TOKEN0: string;
  TOKEN1: string;
  QUOTE_PRICE: BigNumber; // quotePrice (if you have 1 token0 how much you can sell it for token1 (in WEI))
}

export class Pair {
  public props: IPair;
  public multiplier: BigNumber;

  constructor(props: IPair) {
    this.props = props;
    this.multiplier = parseEther("0.5");
  }

  get NAME() {
    return this.props.NAME;
  }

  get TOKEN0() {
    return this.props.TOKEN0;
  }

  get TOKEN1() {
    return this.props.TOKEN1;
  }

  get TOKEN0_PRICE() {
    return constants.WeiPerEther.mul(this.multiplier).div(constants.WeiPerEther);
  }

  get TOKEN1_PRICE() {
    return this.props.QUOTE_PRICE.mul(this.multiplier).div(constants.WeiPerEther);
  }
}

async function main() {
  const { network } = hre;

  const config = process.env.DEPLOYMENT_ENV === "prod" ? ProdConfig : DevelopConfig;

  const ROUTER_ADDRESS = config.Router;

  const PAIRS: Array<Pair> = [
    new Pair({
      NAME: "WBNB-BUSD", // name
      TOKEN0: config.Tokens.WBNB, // token0
      TOKEN1: config.Tokens.BUSD, // token1
      QUOTE_PRICE: ethers.utils.parseEther("318.909"), // quotePrice (if you have 1 token0 how much you can sell it for token1 (in WEI))
    }),
  ];

  const deployer = (await ethers.getSigners())[0];

  const router: LatteSwapRouter = LatteSwapRouter__factory.connect(ROUTER_ADDRESS, deployer);
  const wbnbAddress = await router.WBNB();

  for (const pair of PAIRS) {
    const token0 = ERC20__factory.connect(pair.TOKEN0, deployer);
    const token1 = ERC20__factory.connect(pair.TOKEN1, deployer);

    if (pair.TOKEN0 !== wbnbAddress) {
      await token0.approve(router.address, pair.TOKEN0_PRICE);
      console.log(`>> ${pair.NAME} approved ${pair.TOKEN0} for ${ethers.utils.commify(pair.TOKEN0_PRICE.toString())}`);
    }

    if (pair.TOKEN1 !== wbnbAddress) {
      await token1.approve(router.address, pair.TOKEN1_PRICE);
      console.log(`>> ${pair.NAME} approved ${pair.TOKEN1} for ${ethers.utils.commify(pair.TOKEN1_PRICE.toString())}`);
    }
    if (pair.TOKEN0 === wbnbAddress) {
      const tx = await router.addLiquidityETH(token1.address, pair.TOKEN1_PRICE, "0", "0", deployer.address, FOREVER, {
        value: pair.TOKEN0_PRICE,
        gasLimit: 5000000,
      });
      console.log(`>> tx hash addLiquidityETH ${tx.hash}`);
    } else if (pair.TOKEN1 === wbnbAddress) {
      const tx = await router.addLiquidityETH(token0.address, pair.TOKEN0_PRICE, "0", "0", deployer.address, FOREVER, {
        value: pair.TOKEN1_PRICE,
        gasLimit: 5000000,
      });
      console.log(`>> tx hash addLiquidityETH ${tx.hash}`);
    } else {
      const tx = await router.addLiquidity(
        token0.address,
        token1.address,
        pair.TOKEN0_PRICE,
        pair.TOKEN1_PRICE,
        "0",
        "0",
        deployer.address,
        FOREVER,
        { gasLimit: 5000000 }
      );
      console.log(`>> tx hash addLiquidity ${tx.hash}`);
    }

    console.log(`>> ${pair.NAME} liquidity added`);
  }
  console.log("✅ Done");
}

withNetworkFile(main)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
