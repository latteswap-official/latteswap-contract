import { ethers, waffle } from "hardhat";
import { Signer, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SimpleToken, SimpleToken__factory, SquidGame__factory, SquidGame } from "../../typechain";
import { latest } from "../../compiled-typechain/tests/helpers/time";
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";

chai.use(solidity);
const { expect } = chai;

describe("SquidGame", () => {
  const TICKET_PRICE = ethers.BigNumber.from(888);
  const HOUR = ethers.BigNumber.from(3600);

  // Contract Instances
  let startTime: BigNumber;

  let squidGame: SquidGame;
  let token: SimpleToken;
  let latte: SimpleToken;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;

  let deployerAddress: string;
  let aliceAddress: string;
  let bobAddress: string;
  let eveAddress: string;

  async function fixture() {
    [deployer, alice, bob, eve] = await ethers.getSigners();
    [deployerAddress, aliceAddress, bobAddress, eveAddress] = await Promise.all([
      deployer.getAddress(),
      alice.getAddress(),
      bob.getAddress(),
      eve.getAddress(),
    ]);

    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory;
    latte = await SimpleToken.deploy("LATTE", "LATTE");
    token = await SimpleToken.deploy("TOKEN", "TOKEN");

    startTime = (await latest()).add(HOUR.mul(25));
    const SquidGame = (await ethers.getContractFactory("SquidGame", deployer)) as SquidGame__factory;
    squidGame = await SquidGame.deploy(startTime, latte.address, TICKET_PRICE, token.address, [
      { entropy: formatBytes32String("R0uNd1"), minKill: 20, difficulty: 100000, killAt: 0 },
    ]);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  describe("#initialized", async () => {
    context("when squid game is initialized", async () => {
      it("should has the right parameters", async () => {
        expect(await squidGame.startHour()).to.be.eq(startTime.div(HOUR).mul(HOUR));
      });
    });
  });
});
