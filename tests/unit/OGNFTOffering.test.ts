import { ethers, waffle } from "hardhat";
import { BigNumber, Signer, constants } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { MockWBNB, OGNFT, SimpleToken, SimpleToken__factory, WNativeRelayer } from "../../typechain";
import { ModifiableContract } from "@eth-optimism/smock";
import { ogOfferingUnitTestFixture } from "../helpers";
import { parseEther } from "ethers/lib/utils";
import { advanceBlockTo } from "../helpers/time";
import { OGNFTOffering } from "../../typechain/OGNFTOffering";
import { OGNFTOffering__factory } from "../../typechain/factories/OGNFTOffering__factory";
import { TripleSlopePriceModel } from "../../typechain";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";

chai.use(solidity);
const { expect } = chai;

describe("OGNFTOffering", () => {
  // from the fixture
  let FEE_ADDR: string;
  let FEE_BPS: number;
  let stakingTokens: Array<SimpleToken>;
  let wbnb: MockWBNB;
  let wNativeRelayer: WNativeRelayer;
  let ogNFT: ModifiableContract;
  let ogOffering: OGNFTOffering;
  let startingBlock: BigNumber;
  let priceModel: ModifiableContract;

  // actors
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let dev: Signer;

  // binding
  let ogOfferingAsAlice: OGNFTOffering;
  let ogOfferingAsABob: OGNFTOffering;

  // Lambdas
  let signatureFn: (signer: Signer, msg?: string) => Promise<string>;
  let signatureAsDeployer: string;
  let signatureAsAlice: string;
  let signatureAsBob: string;

  beforeEach(async () => {
    ({ stakingTokens, signatureFn, wbnb, wNativeRelayer, ogNFT, ogOffering, startingBlock, priceModel } =
      await waffle.loadFixture(ogOfferingUnitTestFixture));
    [deployer, alice, bob, dev] = await ethers.getSigners();

    // binding
    ogOfferingAsAlice = OGNFTOffering__factory.connect(ogOffering.address, alice);
    ogOfferingAsABob = OGNFTOffering__factory.connect(ogOffering.address, bob);
    signatureAsDeployer = await signatureFn(deployer);
    signatureAsAlice = await signatureFn(alice);
    signatureAsBob = await signatureFn(bob);
  });

  describe("#readyToSellNFT()", () => {
    context("if the seller is not a governance", () => {
      it("should revert", async () => {
        await expect(
          ogOfferingAsAlice.readyToSellNFT(
            0,
            1,
            startingBlock.add(100),
            startingBlock.add(101),
            stakingTokens[0].address
          )
        ).to.revertedWith("OGNFTOffering::onlyGovernance::only GOVERNANCE role");
      });
    });

    context("when the quoteToken is address(0)", () => {
      it("should revert", async () => {
        await expect(
          ogOffering.readyToSellNFT(0, 1, startingBlock.add(100), startingBlock.add(101), constants.AddressZero)
        ).to.revertedWith("OGNFTOffering::_setQuoteBep20::invalid quote token");
      });
    });

    context("when invalid block", () => {
      context("when starting < current block", () => {
        it("should revert", async () => {
          await expect(ogOffering.readyToSellNFT(0, 1, 0, 1, stakingTokens[0].address)).to.revertedWith(
            "OGNFTOffering::_setOGNFTMetadata::invalid start or end block"
          );
        });
      });

      context("when starting >= end block", () => {
        it("should revert", async () => {
          await expect(
            ogOffering.readyToSellNFT(0, 1, startingBlock.add(100), startingBlock.add(99), stakingTokens[0].address)
          ).to.revertedWith("OGNFTOffering::_setOGNFTMetadata::invalid start or end block");
        });
      });
    });

    context("when duplicate sell", () => {
      it("should revert", async () => {
        await expect(
          ogOffering.readyToSellNFT(0, 1, startingBlock.add(100), startingBlock.add(101), stakingTokens[0].address)
        )
          .to.emit(ogOffering, "SetQuoteBep20")
          .withArgs(await deployer.getAddress(), 0, stakingTokens[0].address)
          .to.emit(ogOffering, "SetOGNFTMetadata")
          .withArgs(0, 1, startingBlock.add(100), startingBlock.add(101));
        const metadata = await ogOffering.ogNFTMetadata(0);
        expect(metadata.isBidding).to.eq(false);
        expect(metadata.quoteBep20).to.eq(stakingTokens[0].address);
        expect(metadata.cap).to.eq(1);
        expect(metadata.startBlock).to.eq(startingBlock.add(100));
        expect(metadata.endBlock).to.eq(startingBlock.add(101));

        await expect(
          ogOffering.readyToSellNFT(0, 1, startingBlock.add(100), startingBlock.add(101), stakingTokens[0].address)
        ).to.revertedWith("OGNFTOffering::_readyToSellNFTTo::duplicated entry");
      });
    });

    it("should create a correct ogNFTMetadata", async () => {
      await expect(
        ogOffering.readyToSellNFT(0, 1, startingBlock.add(100), startingBlock.add(101), stakingTokens[0].address)
      )
        .to.emit(ogOffering, "SetQuoteBep20")
        .withArgs(await deployer.getAddress(), 0, stakingTokens[0].address)
        .to.emit(ogOffering, "SetOGNFTMetadata")
        .withArgs(0, 1, startingBlock.add(100), startingBlock.add(101));
      const metadata = await ogOffering.ogNFTMetadata(0);
      expect(metadata.isBidding).to.eq(false);
      expect(metadata.quoteBep20).to.eq(stakingTokens[0].address);
      expect(metadata.cap).to.eq(1);
      expect(metadata.startBlock).to.eq(startingBlock.add(100));
      expect(metadata.endBlock).to.eq(startingBlock.add(101));
    });
  });

  describe("#buyNFT", () => {
    context("when the selling nft is not within the blockrange", () => {
      it("should revert", async () => {
        // selling phase
        await ogOffering.readyToSellNFT(
          ogNFT.address,
          0,
          startingBlock.add(100),
          startingBlock.add(101),
          stakingTokens[0].address
        );

        // buying phase
        await expect(ogOfferingAsAlice.buyNFT(0, signatureAsAlice)).to.revertedWith(
          "OGNFTOffering::withinBlockRange:: invalid block number"
        );
      });
    });

    context("when invalid signature", () => {
      it("should revert", async () => {
        await ogOffering.readyToSellNFT(0, 1, startingBlock.add(2), startingBlock.add(10), stakingTokens[0].address);
        await expect(ogOfferingAsAlice.buyNFT(0, signatureAsDeployer)).to.revertedWith(
          "OGNFTOffering::permit::INVALID_SIGNATURE"
        );
      });
    });

    context("when reaching a maximum cap", () => {
      it("should revert", async () => {
        await ogOffering.readyToSellNFT(0, 0, startingBlock.add(2), startingBlock.add(10), stakingTokens[0].address);
        await expect(ogOfferingAsAlice.buyNFT(0, signatureAsAlice)).to.revertedWith(
          "OGNFTOffering::_decreaseCap::maximum mint cap reached"
        );
      });
    });

    context("when a token is a native", () => {
      context("with msg.value", () => {
        context("when amount != msg.value", () => {
          it("should revert", async () => {
            // sell phase
            await ogOffering.readyToSellNFT(0, 1, startingBlock.add(2), startingBlock.add(10), wbnb.address);

            // buy phase
            await expect(
              ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
                value: parseEther("11"),
              })
            ).to.revertedWith("OGNFTOffering::_safeWrap:: value != msg.value");
          });
        });
      });
      context("when the user reach a buy limit", () => {
        it("should revert", async () => {
          const seller = await deployer.getAddress();
          // preparation for buy limit
          await ogOffering.setBuyLimitPeriod(20);
          await ogOffering.setBuyLimitCount(2);
          // sell phase
          await ogOffering.readyToSellNFT(0, 100, startingBlock.add(4), startingBlock.add(100), wbnb.address);
          const value = await (priceModel as unknown as TripleSlopePriceModel).getPrice(100, 97, 0);
          // buy phase

          const nonce = await alice.getTransactionCount();
          await Promise.all([
            ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
              value: value,
              nonce: nonce,
            }),
            ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
              value: value,
              nonce: nonce + 1,
            }),
          ]);
          let ogMetadata = await ogOffering.ogNFTMetadata(0);
          let ogBuyLimit = await ogOffering.buyLimitMetadata(await alice.getAddress(), 0);
          await expect(ogMetadata.cap).to.eq(98);
          await expect(ogBuyLimit.cooldownStartBlock).to.eq(startingBlock.add(4));
          await expect(ogBuyLimit.counter).to.eq(2);
          // shouldn't buy because limit count is 2
          await expect(
            ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
              value: value,
            })
          ).to.revertedWith("OGNFTOffering::_buyNFTTo::exceed buy limit");

          await advanceBlockTo(startingBlock.add(24).toNumber());
          const balBefore = await alice.getBalance();
          // should be able to buy again
          const tx = await ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
            value: value,
          });
          const receipt = await tx.wait();
          const gasUsed = receipt.gasUsed;
          const balAfter = await alice.getBalance();
          expect(await wbnb.balanceOf(await dev.getAddress())).to.eq(value.mul(3).div(10));
          expect(await wbnb.balanceOf(seller)).to.eq(value.mul(3).sub(value.mul(3).div(10)));
          expect(balAfter).to.eq(balBefore.sub(value.add((await ethers.provider.getGasPrice()).mul(gasUsed))));
          expect(await ogNFT.ownerOf(0)).to.eq(await alice.getAddress());
          expect(await ogNFT.ownerOf(1)).to.eq(await alice.getAddress());
          expect(await ogNFT.ownerOf(2)).to.eq(await alice.getAddress());
          ogMetadata = await ogOffering.ogNFTMetadata(0);
          ogBuyLimit = await ogOffering.buyLimitMetadata(await alice.getAddress(), 0);
          await expect(ogMetadata.cap).to.eq(97);
          await expect(ogBuyLimit.cooldownStartBlock).to.eq(startingBlock.add(25));
          await expect(ogBuyLimit.counter).to.eq(1);
        });
      });
      context("when cap slope changed", () => {
        it("should be able to mint a with transfer wNative back to the seller", async () => {
          const seller = await deployer.getAddress();
          // sell phase
          await ogOffering.readyToSellNFT(0, 4, startingBlock.add(2), startingBlock.add(10), wbnb.address);

          // buy phase
          const balBefore1 = await alice.getBalance();
          const value1 = await (priceModel as unknown as TripleSlopePriceModel).getPrice(4, 3, 0);
          const tx1 = await ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
            value: value1,
          });
          const gasUsed1 = (await tx1.wait()).gasUsed;
          const balAfter1 = await alice.getBalance();
          const totalPaid1 = value1.add((await ethers.provider.getGasPrice()).mul(gasUsed1));
          expect(await wbnb.balanceOf(await dev.getAddress())).to.eq(value1.div(10));
          expect(await wbnb.balanceOf(seller)).to.eq(value1.sub(value1.div(10)));
          expect(balAfter1).to.eq(balBefore1.sub(totalPaid1));

          const balBefore2 = await alice.getBalance();
          const value2 = await (priceModel as unknown as TripleSlopePriceModel).getPrice(4, 2, 0);
          const tx2 = await ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
            value: value2,
          });
          const gasUsed2 = (await tx2.wait()).gasUsed;
          const balAfter2 = await alice.getBalance();
          const totalPaid2 = value2.add((await ethers.provider.getGasPrice()).mul(gasUsed2));
          expect(await wbnb.balanceOf(await dev.getAddress())).to.eq(value2.add(value1).div(10));
          expect(await wbnb.balanceOf(seller)).to.eq(value2.sub(value2.div(10)).add(value1.sub(value1.div(10))));
          expect(balAfter2).to.eq(balBefore2.sub(totalPaid2));

          const balBefore3 = await alice.getBalance();
          const value3 = await (priceModel as unknown as TripleSlopePriceModel).getPrice(4, 1, 0);
          const tx3 = await ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
            value: value3,
          });
          const gasUsed3 = (await tx3.wait()).gasUsed;
          const balAfter3 = await alice.getBalance();
          const totalPaid3 = value3.add((await ethers.provider.getGasPrice()).mul(gasUsed3));
          expect(await wbnb.balanceOf(await dev.getAddress())).to.eq(value3.add(value2).add(value1).div(10));
          expect(await wbnb.balanceOf(seller)).to.eq(
            value3.sub(value3.div(10)).add(value2.sub(value2.div(10)).add(value1.sub(value1.div(10))))
          );
          expect(balAfter3).to.eq(balBefore3.sub(totalPaid3));
          expect(await ogNFT.ownerOf(0)).to.eq(await alice.getAddress());
          expect(await ogNFT.ownerOf(1)).to.eq(await alice.getAddress());
          expect(await ogNFT.ownerOf(2)).to.eq(await alice.getAddress());
        });
      });
      it("should be able to mint a token with transfer wNative back to the seller", async () => {
        const seller = await deployer.getAddress();
        // sell phase
        await ogOffering.readyToSellNFT(0, 1, startingBlock.add(2), startingBlock.add(10), wbnb.address);
        const value = await (priceModel as unknown as TripleSlopePriceModel).getPrice(1, 0, 0);
        // buy phase
        const balBefore = await alice.getBalance();
        const tx = await ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
          value: value,
        });
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed;
        const balAfter = await alice.getBalance();
        expect(await wbnb.balanceOf(await dev.getAddress())).to.eq(value.div(10));
        expect(await wbnb.balanceOf(seller)).to.eq(value.sub(value.div(10)));
        expect(balAfter).to.eq(balBefore.sub(value.add((await ethers.provider.getGasPrice()).mul(gasUsed))));
        expect(await ogNFT.ownerOf(0)).to.eq(await alice.getAddress());
        // should be failed since cap is limited
        await expect(ogOfferingAsAlice.buyNFT(0, signatureAsAlice)).to.revertedWith(
          "OGNFTOffering::_decreaseCap::maximum mint cap reached"
        );
      });
    });

    context("when a token is not a native", () => {
      context("with msg.value", () => {
        it("should revert", async () => {
          const seller = await deployer.getAddress();
          // sell phase
          await ogOffering.readyToSellNFT(0, 1, startingBlock.add(2), startingBlock.add(10), stakingTokens[0].address);

          // buy phase
          await expect(
            ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
              value: await (priceModel as unknown as TripleSlopePriceModel).getPrice(1, 1, 0),
            })
          ).to.revertedWith("OGNFTOffering::_safeWrap:: baseToken is not wNative");
        });
      });

      context("when the user reach a buy limit", () => {
        it("should revert", async () => {
          const seller = await deployer.getAddress();
          // preparation for buy limit
          await ogOffering.setBuyLimitPeriod(20);
          await ogOffering.setBuyLimitCount(2);
          // sell phase
          await ogOffering.readyToSellNFT(
            0,
            100,
            startingBlock.add(6),
            startingBlock.add(100),
            stakingTokens[0].address
          );
          const value = await (priceModel as unknown as TripleSlopePriceModel).getPrice(100, 97, 0);
          // buy phase
          const stakingTokenAsAlice = SimpleToken__factory.connect(stakingTokens[0].address, alice);
          await stakingTokens[0].mint(await alice.getAddress(), value.mul(3));
          await stakingTokenAsAlice.approve(ogOffering.address, value.mul(3));
          const nonce = await alice.getTransactionCount();
          await Promise.all([
            ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
              nonce: nonce,
            }),
            ogOfferingAsAlice.buyNFT(0, signatureAsAlice, {
              nonce: nonce + 1,
            }),
          ]);
          let ogMetadata = await ogOffering.ogNFTMetadata(0);
          let ogBuyLimit = await ogOffering.buyLimitMetadata(await alice.getAddress(), 0);
          await expect(ogMetadata.cap).to.eq(98);
          await expect(ogBuyLimit.cooldownStartBlock).to.eq(startingBlock.add(6));
          await expect(ogBuyLimit.counter).to.eq(2);
          // shouldn't buy because limit count is 2
          await expect(ogOfferingAsAlice.buyNFT(0, signatureAsAlice)).to.revertedWith(
            "OGNFTOffering::_buyNFTTo::exceed buy limit"
          );

          await advanceBlockTo(startingBlock.add(26).toNumber());
          // should be able to buy again
          await ogOfferingAsAlice.buyNFT(0, signatureAsAlice);
          expect(await stakingTokens[0].balanceOf(await dev.getAddress())).to.eq(value.mul(3).div(10));
          expect(await stakingTokens[0].balanceOf(seller)).to.eq(value.mul(3).sub(value.mul(3).div(10)));
          expect(await ogNFT.ownerOf(0)).to.eq(await alice.getAddress());
          expect(await ogNFT.ownerOf(1)).to.eq(await alice.getAddress());
          expect(await ogNFT.ownerOf(2)).to.eq(await alice.getAddress());
          ogMetadata = await ogOffering.ogNFTMetadata(0);
          ogBuyLimit = await ogOffering.buyLimitMetadata(await alice.getAddress(), 0);
          await expect(ogMetadata.cap).to.eq(97);
          await expect(ogBuyLimit.cooldownStartBlock).to.eq(startingBlock.add(27));
          await expect(ogBuyLimit.counter).to.eq(1);
        });
      });

      context("when cancel", () => {
        it("should revert with within block range", async () => {
          const seller = await deployer.getAddress();
          // sell phase
          await ogOffering.readyToSellNFT(0, 1, startingBlock.add(3), startingBlock.add(10), stakingTokens[0].address);

          await ogOffering.cancelSellNFT(0);
          expect(await ogOffering.tokenCategorySellers(0)).to.eq(constants.AddressZero);
          const metadata = await ogOffering.ogNFTMetadata(0);
          expect(metadata.isBidding).to.eq(false);
          expect(metadata.quoteBep20).to.eq(constants.AddressZero);
          expect(metadata.cap).to.eq(0);
          expect(metadata.startBlock).to.eq(0);
          expect(metadata.endBlock).to.eq(0);

          // buy phase
          await expect(ogOfferingAsAlice.buyNFT(0, signatureAsAlice)).to.revertedWith(
            "OGNFTOffering::withinBlockRange:: invalid block number"
          );
        });
      });
      it("should be able to mint a token with transfer a token back to the seller", async () => {
        const seller = await deployer.getAddress();
        // sell phase
        await ogOffering.readyToSellNFT(0, 1, startingBlock.add(3), startingBlock.add(10), stakingTokens[0].address);

        // buy phase
        const value = await (priceModel as unknown as TripleSlopePriceModel).getPrice(1, 0, 0);
        const stakingTokenAsAlice = SimpleToken__factory.connect(stakingTokens[0].address, alice);
        await stakingTokens[0].mint(await alice.getAddress(), value);
        await stakingTokenAsAlice.approve(ogOffering.address, value);
        await ogOfferingAsAlice.buyNFT(0, signatureAsAlice);
        expect(await stakingTokens[0].balanceOf(await dev.getAddress())).to.eq(value.div(10));
        expect(await stakingTokens[0].balanceOf(seller)).to.eq(value.sub(value.div(10)));
        expect(await ogNFT.ownerOf(0)).to.eq(await alice.getAddress());
        expect(await stakingTokens[0].balanceOf(await alice.getAddress())).to.eq(0);
      });
    });
  });

  describe("#setOGNFTMetadata", () => {
    it("should set a correct param", async () => {
      await ogOffering.setOGNFTMetadata([
        {
          nftCategoryId: 0,
          cap: 1,
          startBlock: startingBlock.add(100),
          endBlock: startingBlock.add(101),
        },
        {
          nftCategoryId: 1,
          cap: 2,
          startBlock: startingBlock.add(102),
          endBlock: startingBlock.add(103),
        },
      ]);
      const category0Metadata = await ogOffering.ogNFTMetadata(0);
      const category1Metadata = await ogOffering.ogNFTMetadata(1);
      expect(category0Metadata.isBidding).to.eq(false);
      expect(category0Metadata.quoteBep20).to.eq(constants.AddressZero);
      expect(category0Metadata.cap).to.eq(1);
      expect(category0Metadata.startBlock).to.eq(startingBlock.add(100));
      expect(category0Metadata.endBlock).to.eq(startingBlock.add(101));

      expect(category1Metadata.isBidding).to.eq(false);
      expect(category1Metadata.quoteBep20).to.eq(constants.AddressZero);
      expect(category1Metadata.cap).to.eq(2);
      expect(category1Metadata.startBlock).to.eq(startingBlock.add(102));
      expect(category1Metadata.endBlock).to.eq(startingBlock.add(103));
    });
  });

  describe("#setBuyLimitPeriod", () => {
    it("should be able to set a limit period with a correct event emitted", async () => {
      await expect(ogOffering.setBuyLimitPeriod(199)).to.emit(ogOffering, "SetBuyLimitPeriod").withArgs(199);
    });
  });

  describe("#setBuyLimitCount", () => {
    it("should be able to set a limit count with a correct event emitted", async () => {
      await expect(ogOffering.setBuyLimitCount(50)).to.emit(ogOffering, "SetBuyLimitCount").withArgs(50);
    });
  });

  describe("#setPriceModel", () => {
    context("when setting a zero address as a price model argument", () => {
      it("should revert", async () => {
        await expect(ogOffering.setPriceModel(constants.AddressZero)).to.revertedWith(
          "OGNFTOffering::permit::price model cannot be address(0)"
        );
      });
    });

    it("should successfully set a new price model with an event emitted", async () => {
      // presume that dev address is a new price model
      await expect(ogOffering.setPriceModel(await dev.getAddress()))
        .to.emit(ogOffering, "SetPriceModel")
        .withArgs(await dev.getAddress());
    });
  });

  describe("#setQuoteBep20", () => {
    context("when setting a zero address as a price model argument", () => {
      it("should revert", async () => {
        await expect(ogOffering.setQuoteBep20(0, constants.AddressZero)).to.revertedWith(
          "OGNFTOffering::_setQuoteBep20::invalid quote token"
        );
      });
    });

    it("should successfully set a new price model with an event emitted", async () => {
      // presume that dev address is a new price model
      await expect(ogOffering.setQuoteBep20(0, await dev.getAddress()))
        .to.emit(ogOffering, "SetQuoteBep20")
        .withArgs(await deployer.getAddress(), 0, await dev.getAddress());
    });
  });
});
