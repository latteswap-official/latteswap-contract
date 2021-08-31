import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import {
  BeanBag,
  Booster,
  LATTE,
  MockMasterBarista,
  MockOGOwnerToken,
  MockWBNB,
  OGNFT,
  OGNFT__factory,
  OGOwnerToken,
  SimpleToken,
  WNativeRelayer,
} from "../../typechain";
import { solidity } from "ethereum-waffle";
import { BigNumber, constants, Signer } from "ethers";
import { ogNFTUnitTestFixture } from "../helpers/fixtures/OGNFT";
import exp from "constants";
import { getAddress } from "@ethersproject/address";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { ModifiableContract } from "@eth-optimism/smock";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { latestBlockNumber } from "../helpers/time";

chai.use(solidity);
const { expect } = chai;

describe("OGNFT", () => {
  // OGNFT instances
  let ogNFT: OGNFT;
  let ogNFTAsBob: OGNFT;
  let ogNFTAsAlice: OGNFT;

  // Contracts
  let latteToken: LATTE;
  let masterBarista: ModifiableContract;
  let boosterConfig: ModifiableContract;
  let nftToken: ModifiableContract;
  let stakingTokens: SimpleToken[];
  let booster: Booster;
  let beanBag: BeanBag;
  let wbnb: MockWBNB;
  let wNativeRelayer: WNativeRelayer;
  let ogOwnerToken: ModifiableContract;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;
  let dev: Signer;

  beforeEach(async () => {
    [deployer, alice, bob, dev] = await ethers.getSigners();
    ({ ogNFT, wNativeRelayer, wbnb, stakingTokens, masterBarista, beanBag, latteToken, ogOwnerToken } =
      await waffle.loadFixture(ogNFTUnitTestFixture));
    expect(await ogNFT.masterBarista()).to.eq(masterBarista.address);
    expect(await ogNFT.latte()).to.eq(latteToken.address);
    ogNFTAsBob = OGNFT__factory.connect(ogNFT.address, bob);
    ogNFTAsAlice = OGNFT__factory.connect(ogNFT.address, alice);
  });

  describe("#currentTokenId", () => {
    it("should update current token id", async () => {
      // MOCK that master barista has enough LATTE
      await latteToken.transfer(beanBag.address, parseEther("100"));

      expect(await ogNFT.currentTokenId()).to.eq(0);
      await ogNFT.mint(await bob.getAddress(), 0, "tokenURI");
      expect(await ogNFT.currentTokenId()).to.eq(1);
    });
  });

  describe("#currentCategoryId", () => {
    it("should update current token id", async () => {
      expect(await ogNFT.currentCategoryId()).to.eq(0);
      await ogNFT.addCategoryInfo("first cat", "");
      expect(await ogNFT.currentCategoryId()).to.eq(1);
      await ogNFT.addCategoryInfo("second cat", "");
      expect(await ogNFT.currentCategoryId()).to.eq(2);
    });
  });

  describe("#categoryToLatteNFTList()", () => {
    it("should return a list of tokenIds", async () => {
      // mock this so that mintBatch of category #1 can pass the master barista
      await ogNFT.setCategoryOGOwnerToken(1, ogOwnerToken.address);

      await ogNFT.mintBatch(await deployer.getAddress(), 0, "", 5);
      await ogNFT.addCategoryInfo("foo0", "bar0"); //add category info 0, now current is 1
      await ogNFT.addCategoryInfo("foo1", "bar1"); //add category info 1, now current is 2
      await ogNFT.mintBatch(await deployer.getAddress(), 1, "", 1);
      await ogNFT.mintBatch(await deployer.getAddress(), 0, "", 5);

      expect(
        (await ogNFT.categoryToLatteNFTList(0)).map((tokenId: BigNumber) => {
          return tokenId.toNumber();
        })
      ).to.deep.eq([0, 1, 2, 3, 4, 6, 7, 8, 9, 10]);

      expect(
        (await ogNFT.categoryToLatteNFTList(1)).map((tokenId: BigNumber) => {
          return tokenId.toNumber();
        })
      ).to.deep.eq([5]);

      expect(
        (await ogNFT.categoryToLatteNFTList(2)).map((tokenId: BigNumber) => {
          return tokenId.toNumber();
        })
      ).to.deep.eq([]);
    });
  });

  describe("#categoryURI()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(ogNFT.categoryURI(99)).to.revertedWith("LatteNFT::onlyExistingCategoryId::categoryId not existed");
      });
    });
    context("when there is no baseURI", () => {
      it("should only return categoryURI", async () => {
        await ogNFT.setBaseURI("");
        await ogNFT.addCategoryInfo("foo", "bar");
        expect(await ogNFT.categoryURI(0)).to.eq("bar");
      });
    });

    context("when there are baseURI and categoryURI", () => {
      it("should only return baseURI + categoryURI", async () => {
        await ogNFT.addCategoryInfo("foo", "bar");
        expect(await ogNFT.categoryURI(0)).to.eq(`${await ogNFT.baseURI()}bar`);
      });
    });

    context("when there is baseURI but no categoryURI", () => {
      it("should return baseURI + categoryID", async () => {
        expect(await ogNFT.categoryURI(0)).to.eq(`${await ogNFT.baseURI()}0`);
      });
    });
  });

  describe("#tokenURI()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(ogNFT.tokenURI(99)).to.revertedWith("LatteNFT::tokenURI:: token not existed");
      });
    });
    context("when there is no baseURI", () => {
      it("should only return tokenURI", async () => {
        await ogNFT.setBaseURI("");
        await ogNFT.mint(await deployer.getAddress(), 0, "bar");
        expect(await ogNFT.tokenURI(0)).to.eq("bar");
      });
    });

    context("when there are baseURI and tokenURI", () => {
      it("should only return baseURI + tokenURI", async () => {
        await ogNFT.mint(await deployer.getAddress(), 0, "bar");
        expect(await ogNFT.tokenURI(0)).to.eq(`${await ogNFT.baseURI()}bar`);
      });
    });

    context("when there are baseURI, categoryURI, but no tokenURI", () => {
      it("should only return baseURI + categoryURI", async () => {
        await ogNFT.mint(await deployer.getAddress(), 0, "");
        await ogNFT.addCategoryInfo("foo", "baz");
        expect(await ogNFT.tokenURI(0)).to.eq(`${await ogNFT.baseURI()}baz`);
      });
    });

    context("when there is baseURI but no categoryURI and tokenURI", () => {
      it("should return baseURI + tokenID", async () => {
        await ogNFT.mint(await deployer.getAddress(), 0, "");
        expect(await ogNFT.tokenURI(0)).to.eq(`${await ogNFT.baseURI()}0`);
      });
    });
  });

  describe("#addCategoryInfo()", () => {
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(ogNFTAsBob.addCategoryInfo("NewCatagoryInfo", "/foo/bar")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when add catagory info", async () => {
      it("should added category info", async () => {
        expect(await ogNFT.addCategoryInfo("NewCatagoryInfo", "/foo/bar"));
        const { name, timestamp } = await ogNFT.categoryInfo(0);
        expect(name).to.be.eq("NewCatagoryInfo");
      });
    });
  });

  describe("#updateCategoryInfo()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(ogNFT.updateCategoryInfo(99, "updatedCategoryName", "/foo/bar")).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(ogNFTAsBob.updateCategoryInfo(0, "updatedCategoryName", "/foo/bar")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when update category info", async () => {
      it("should updated category info", async () => {
        expect(await ogNFT.updateCategoryInfo(0, "updatedCategoryName", "/foo/bar"));
        const { name, timestamp } = await ogNFT.categoryInfo(0);
        expect(name).to.be.eq("updatedCategoryName");
      });

      it("should updated category with some category has been set", async () => {
        expect(await ogNFT.updateCategoryInfo(0, "beforeCategoryName", "/foo/bar"));
        let name = await (await ogNFT.categoryInfo(0)).name;
        expect(name).to.be.eq("beforeCategoryName");

        expect(await ogNFT.updateCategoryInfo(0, "afterCategoryName", "/foo/bar"));
        name = await (await ogNFT.categoryInfo(0)).name;
        expect(name).to.be.eq("afterCategoryName");
      });
    });
  });

  describe("#updateTokenCategory()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(ogNFT.updateTokenCategory(0, 99)).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(ogNFTAsBob.updateTokenCategory(0, 0)).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when update token category", async () => {
      it("should update token category", async () => {
        await ogNFT.mint(await alice.getAddress(), 0, "tokenURI");
        await ogNFT.addCategoryInfo("foo", "bar");
        expect(await ogNFT.updateTokenCategory(0, 1));
        const tokenCategory = await ogNFT.latteNFTToCategory(0);
        expect(tokenCategory).to.be.eq(1);
      });
    });
  });

  describe("#getLatteNameOfTokenId()", () => {
    context("when get latte name of token id", async () => {
      it("should get latte name", async () => {
        expect(await ogNFT.getLatteNameOfTokenId(0)).to.be.eq("");
      });
    });
  });

  describe("#mint()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(ogNFT.mint(await alice.getAddress(), 99, "tokenUrl")).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(ogNFTAsBob.mint(await alice.getAddress(), 1, "tokenUrl")).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when caller used to be minter", async () => {
      it("should reverted", async () => {
        await ogNFT.revokeRole(await ogNFT.MINTER_ROLE(), await deployer.getAddress());
        await expect(ogNFT.mint(await alice.getAddress(), 1, "tokenUrl")).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when paused", async () => {
      it("should reverted", async () => {
        await ogNFT.pause();
        await expect(ogNFT.mint(await alice.getAddress(), 0, "tokenUrl")).to.be.revertedWith(
          "revert ERC721Pausable: token transfer while paused"
        );
      });
    });

    context("when parameters are valid", async () => {
      context("without rewards to be harvest()", () => {
        context("when category 0", () => {
          it("should mint", async () => {
            const _masterBarista = masterBarista as unknown as MockMasterBarista;
            await ogNFT.mint(await alice.getAddress(), 0, "tokenUrl");
            const categoryId = await ogNFT.latteNFTToCategory(0);
            expect(categoryId).to.be.eq(0);
            const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, await alice.getAddress());
            expect(userInfo.fundedBy).to.eq(ogNFT.address);
            expect(userInfo.amount).to.eq(parseEther("1"));
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(
              parseEther("1")
            );
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);
          });
        });

        context("when category > 0", () => {
          it("should mint", async () => {
            const _masterBarista = masterBarista as unknown as MockMasterBarista;
            // mock this so that mintBatch of category #1 can pass the master barista
            await ogNFT.setCategoryOGOwnerToken(1, ogOwnerToken.address);
            await ogNFT.addCategoryInfo("foo", "bar");
            await ogNFT.mint(await alice.getAddress(), 1, "tokenUrl");
            const categoryId = await ogNFT.latteNFTToCategory(0);
            expect(categoryId).to.be.eq(1);
            const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, await alice.getAddress());
            expect(userInfo.fundedBy).to.eq(ogNFT.address);
            expect(userInfo.amount).to.eq(parseEther("1"));
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(
              parseEther("1")
            );
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);
          });
        });
      });
      context("with rewards to be harvest()", () => {
        context("when category 0", () => {
          it("should mint along with claiming a reward", async () => {
            const ogNftOwnerAddress = await alice.getAddress();
            const snapshotBlock = await latestBlockNumber();
            await masterBarista.smodify.put({
              poolInfo: {
                [ogOwnerToken.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits("10", 12).toString(),
                },
              },
              userInfo: {
                [ogOwnerToken.address]: {
                  [ogNftOwnerAddress]: {
                    amount: parseEther("10").toString(),
                    fundedBy: ogNFT.address,
                  },
                },
              },
            });
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther("100"));
            const _masterBarista = masterBarista as unknown as MockMasterBarista;
            await ogNFT.mint(ogNftOwnerAddress, 0, "tokenUrl");
            const categoryId = await ogNFT.latteNFTToCategory(0);
            expect(categoryId).to.be.eq(0);
            const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, ogNftOwnerAddress);
            expect(userInfo.fundedBy).to.eq(ogNFT.address);
            expect(userInfo.amount).to.eq(parseEther("11"));
            // owner is expected to get 100 reward
            expect(await latteToken.balanceOf(ogNftOwnerAddress)).to.eq(parseEther("100"));
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(
              parseEther("1")
            );
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);
          });
        });

        context("when category > 0", () => {
          it("should mint", async () => {
            const ogNftOwnerAddress = await alice.getAddress();
            const snapshotBlock = await latestBlockNumber();
            await masterBarista.smodify.put({
              poolInfo: {
                [ogOwnerToken.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits("10", 12).toString(),
                },
              },
              userInfo: {
                [ogOwnerToken.address]: {
                  [ogNftOwnerAddress]: {
                    amount: parseEther("10").toString(),
                    fundedBy: ogNFT.address,
                  },
                },
              },
            });
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther("100"));
            const _masterBarista = masterBarista as unknown as MockMasterBarista;
            // mock this so that mintBatch of category #1 can pass the master barista
            await ogNFT.setCategoryOGOwnerToken(1, ogOwnerToken.address);
            await ogNFT.addCategoryInfo("foo", "bar");
            await ogNFT.mint(ogNftOwnerAddress, 1, "tokenUrl");
            const categoryId = await ogNFT.latteNFTToCategory(0);
            expect(categoryId).to.be.eq(1);
            const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, ogNftOwnerAddress);
            expect(userInfo.fundedBy).to.eq(ogNFT.address);
            expect(userInfo.amount).to.eq(parseEther("11"));
            // owner is expected to get 100 reward
            expect(await latteToken.balanceOf(ogNftOwnerAddress)).to.eq(parseEther("100"));
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(
              parseEther("1")
            );
            expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);
          });
        });
      });
    });
  });

  describe("#mintBatch()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(ogNFT.mintBatch(await alice.getAddress(), 99, "tokenURI", 100)).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(ogNFTAsBob.mintBatch(await alice.getAddress(), 0, "tokenURI", 100)).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when caller used to be minter", async () => {
      it("should reverted", async () => {
        await ogNFT.revokeRole(await ogNFT.MINTER_ROLE(), await deployer.getAddress());
        await expect(ogNFT.mintBatch(await alice.getAddress(), 0, "tokenURI", 100)).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when paused", async () => {
      it("should reverted", async () => {
        await ogNFT.pause();
        await expect(ogNFT.mintBatch(await alice.getAddress(), 0, "tokenURI", 100)).to.be.revertedWith(
          "revert ERC721Pausable: token transfer while paused"
        );
      });
    });

    context("when size is zero", async () => {
      it("should reverted", async () => {
        await expect(ogNFT.mintBatch(await alice.getAddress(), 0, "tokenURI", 0)).to.be.revertedWith(
          "LatteNFT::mintBatch::size must be granter than zero"
        );
      });
    });

    context("when parameters are valid", async () => {
      context("without rewards to be harvested", () => {
        it("should mint batch", async () => {
          const _masterBarista = masterBarista as unknown as MockMasterBarista;
          await ogNFT.mintBatch(await alice.getAddress(), 0, "tokenURI", 3);
          expect((await ogNFT.categoryToLatteNFTList(0)).length).to.be.eq(3);
          expect(
            (await ogNFT.categoryToLatteNFTList(0)).reduce((accum: boolean, tokenId: BigNumber, index: number) => {
              return accum && tokenId.eq(BigNumber.from(index));
            }, true)
          ).to.be.true;
          expect(await ogNFT.latteNFTToCategory(0)).to.be.eq(0);
          expect(await ogNFT.latteNFTToCategory(1)).to.be.eq(0);
          expect(await ogNFT.latteNFTToCategory(2)).to.be.eq(0);
          const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, await alice.getAddress());
          expect(userInfo.fundedBy).to.eq(ogNFT.address);
          expect(userInfo.amount).to.eq(parseEther("3"));
        });
      });

      context("with rewards to be harvested", () => {
        it("should mint batch", async () => {
          const ogNftOwnerAddress = await alice.getAddress();
          const snapshotBlock = await latestBlockNumber();
          await masterBarista.smodify.put({
            poolInfo: {
              [ogOwnerToken.address]: {
                lastRewardBlock: snapshotBlock,
                accLattePerShare: parseUnits("10", 12).toString(),
              },
            },
            userInfo: {
              [ogOwnerToken.address]: {
                [ogNftOwnerAddress]: {
                  amount: parseEther("10").toString(),
                  fundedBy: ogNFT.address,
                },
              },
            },
          });
          // MOCK that master barista has enough LATTE
          await latteToken.transfer(beanBag.address, parseEther("100"));
          const _masterBarista = masterBarista as unknown as MockMasterBarista;
          await ogNFT.mintBatch(ogNftOwnerAddress, 0, "tokenURI", 3);
          expect((await ogNFT.categoryToLatteNFTList(0)).length).to.be.eq(3);
          expect(
            (await ogNFT.categoryToLatteNFTList(0)).reduce((accum: boolean, tokenId: BigNumber, index: number) => {
              return accum && tokenId.eq(BigNumber.from(index));
            }, true)
          ).to.be.true;
          expect(await ogNFT.latteNFTToCategory(0)).to.be.eq(0);
          expect(await ogNFT.latteNFTToCategory(1)).to.be.eq(0);
          expect(await ogNFT.latteNFTToCategory(2)).to.be.eq(0);
          const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, ogNftOwnerAddress);
          expect(userInfo.fundedBy).to.eq(ogNFT.address);
          expect(userInfo.amount).to.eq(parseEther("13"));
          // owner is expected to get 100 reward
          expect(await latteToken.balanceOf(ogNftOwnerAddress)).to.eq(parseEther("100"));
        });
      });
    });
  });

  describe("#unstake()", () => {
    context("when without og owner token", () => {
      it("should revert", async () => {
        await ogNFT.setCategoryOGOwnerToken(0, constants.AddressZero);
        await expect(ogNFT.unstake(0)).to.revertedWith("OGNFT::withOGOwnerToken:: og owner token not set");
      });
    });

    context("when unstake a non-staking nft", () => {
      it("should revert", async () => {
        await expect(ogNFT.unstake(0)).to.revertedWith("OGNFT::_unstake:: invalid token to be unstaked");
      });
    });

    context("with rewards to be harvest", () => {
      it("should burn an og owner token with a reward harvested", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        // #block 0
        const snapshotBlock = await latestBlockNumber();
        // to avoid "OGNFT::_unstake:: invalid token to be unstaked"
        await ogNFT.mint(ownerAddress, 0, "tokenUrl");
        expect(await ogNFT.ownerOf(0)).to.eq(ogNFT.address);

        // MOCK master barista storages
        await masterBarista.smodify.put({
          totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
          poolInfo: {
            [ogOwnerToken.address]: {
              lastRewardBlock: snapshotBlock.sub(7).toString(), // want to have a gap between last reward block and unstake block
            },
          },
        });

        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther("100"));
        const _masterBarista = masterBarista as unknown as MockMasterBarista;
        await ogNFTAsAlice.unstake(0);
        let userInfo = await _masterBarista.userInfo(ogOwnerToken.address, ownerAddress);
        expect(userInfo.fundedBy).to.eq(constants.AddressZero);
        expect(userInfo.amount).to.eq(parseEther("0"));
        // owner is expected to get 100 reward
        expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther("100"));
        expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(0);
        expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);

        await ogNFTAsAlice.approve(ogNFT.address, 0);
        await ogNFTAsAlice.stake(0);
        const categoryId = await ogNFT.latteNFTToCategory(0);
        expect(categoryId).to.be.eq(0);
        userInfo = await _masterBarista.userInfo(ogOwnerToken.address, ownerAddress);
        expect(userInfo.fundedBy).to.eq(ogNFT.address);
        expect(userInfo.amount).to.eq(parseEther("1"));
        expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(
          parseEther("1")
        );
        expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);
      });
    });

    context("without rewards to be harvest", () => {
      it("should burn an og owner token", async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress();
        // #block 0
        const snapshotBlock = await latestBlockNumber();
        // to avoid "OGNFT::_unstake:: invalid token to be unstaked"
        await ogNFT.mint(ownerAddress, 0, "tokenUrl");
        expect(await ogNFT.ownerOf(0)).to.eq(ogNFT.address);

        // MOCK master barista storages
        await masterBarista.smodify.put({
          totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
          poolInfo: {
            [ogOwnerToken.address]: {
              lastRewardBlock: snapshotBlock.add(2).toString(), // want to have ZERO a gap between last reward block and unstake block
            },
          },
        });

        // MOCK that master barista has enough LATTE
        const _masterBarista = masterBarista as unknown as MockMasterBarista;
        await ogNFTAsAlice.unstake(0);
        const userInfo = await _masterBarista.userInfo(ogOwnerToken.address, ownerAddress);
        expect(userInfo.fundedBy).to.eq(constants.AddressZero);
        expect(userInfo.amount).to.eq(parseEther("0"));
        // owner is expected to get 100 reward
        expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther("0"));
        expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(masterBarista.address)).to.eq(0);
        expect(await (ogOwnerToken as unknown as MockOGOwnerToken).balanceOf(ogNFT.address)).to.eq(0);
      });
    });
  });

  describe("#setLatteName()", () => {
    context("when caller is not a governance", async () => {
      it("should reverted", async () => {
        await expect(ogNFTAsBob.setLatteName(0, "settedName")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when caller used to be governance", async () => {
      it("should reverted", async () => {
        await ogNFT.revokeRole(await ogNFT.GOVERNANCE_ROLE(), await deployer.getAddress());
        await expect(ogNFT.setLatteName(0, "settedName")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when set latte name", async () => {
      it("should setted latte name", async () => {
        expect(await ogNFT.setLatteName(0, "settedName"));
        expect(await ogNFT.latteNames(0)).to.be.eq("settedName");
      });
    });
  });

  describe("#pause()", () => {
    context("when paused", async () => {
      it("should reverted", async () => {
        await ogNFT.pause();
        await expect(ogNFT.pause()).to.be.revertedWith("revert Pausable: paused");
      });
    });
    context("when not paused", async () => {
      it("should paused", async () => {
        await ogNFT.pause();
        expect(await ogNFT.paused()).to.be.true;
      });
    });
  });

  describe("#unpause()", () => {
    context("when the owner is a governance", () => {
      context("when paused", async () => {
        it("should unpause", async () => {
          await ogNFT.pause();
          expect(await ogNFT.unpause());
          expect(await ogNFT.paused()).to.be.false;
        });
      });

      context("when not paused", async () => {
        it("should reverted", async () => {
          await expect(ogNFT.unpause()).to.be.revertedWith("revert Pausable: not paused");
        });
      });
    });
    context("when the own is not a governance", () => {
      it("should not be able to unpause or pause", async () => {
        await ogNFT.renounceRole(await ogNFT.GOVERNANCE_ROLE(), await deployer.getAddress());
        await expect(ogNFT.pause()).to.revertedWith("LatteNFT::onlyGovernance::only GOVERNANCE role");
        await expect(ogNFT.unpause()).to.revertedWith("LatteNFT::onlyGovernance::only GOVERNANCE role");
      });
    });
  });
});
