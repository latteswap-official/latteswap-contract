import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import { LatteNFT, LatteNFT__factory, TripleSlopePriceModel } from "../../typechain";
import { solidity } from "ethereum-waffle";
import { BigNumber, Signer } from "ethers";
import { tripleSlopePriceModelUnitTestFixture } from "../helpers/fixtures";
import { parseEther } from "@ethersproject/units";

chai.use(solidity);
const { expect } = chai;

describe("TripleSlopePriceModel", () => {
  // PriceModel instances
  let priceModel: TripleSlopePriceModel;

  beforeEach(async () => {
    ({ priceModel } = await waffle.loadFixture(tripleSlopePriceModelUnitTestFixture));
  });

  describe("#getPrice", () => {
    context("if get price of max cap = 0", () => {
      it("should return 0", async () => {
        expect(await priceModel.getPrice(0, 0, 0)).to.eq(0);
      });
    });

    context("when cap is > 50%", () => {
      it("should return the price of the first slope (CEIL_SLOPE_1_BPS)", async () => {
        expect(await priceModel.getPrice(1888, 944, 0)).to.eq(parseEther("1.61"));
        expect(await priceModel.getPrice(888, 444, 1)).to.eq(parseEther("2.82"));
      });
    });

    context("when cap is > 20% and <= 50%", () => {
      it("should return the price of the first slope (CEIL_SLOPE_1_BPS)", async () => {
        expect(await priceModel.getPrice(1888, 378, 0)).to.eq(parseEther("2.69"));
        expect(await priceModel.getPrice(888, 178, 1)).to.eq(parseEther("4.93"));
      });
    });

    context("when cap is <= 20%", () => {
      it("should return the price of the first slope (CEIL_SLOPE_1_BPS)", async () => {
        expect(await priceModel.getPrice(1888, 377, 0)).to.eq(parseEther("3.59"));
        expect(await priceModel.getPrice(888, 177, 1)).to.eq(parseEther("6.69"));
      });
    });
  });
});
