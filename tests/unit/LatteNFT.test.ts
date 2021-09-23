import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";
import { LatteNFT, LatteNFT__factory } from "../../typechain";
import { solidity } from "ethereum-waffle";
import { BigNumber, Signer } from "ethers";
import { latteNFTUnitTestFixture } from "../helpers/fixtures/LatteNFT";
import { countReset } from "console";
import exp from "constants";
import { getAddress } from "@ethersproject/address";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";

chai.use(solidity);
const { expect } = chai;

describe("LatteNFT", () => {
  // LatteNFT instances
  let latteNFT: LatteNFT;
  let latteNFTAsBob: LatteNFT;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;

  beforeEach(async () => {
    [deployer, alice, bob, eve] = await ethers.getSigners();
    ({ latteNFT } = await waffle.loadFixture(latteNFTUnitTestFixture));

    latteNFTAsBob = LatteNFT__factory.connect(latteNFT.address, bob);
  });

  describe("#currentTokenId", () => {
    it("should update current token id", async () => {
      expect(await latteNFT.currentTokenId()).to.eq(0);
      await latteNFT.mint(await eve.getAddress(), 0, "tokenURI");
      expect(await latteNFT.currentTokenId()).to.eq(1);
    });
  });

  describe("#currentTokenId", () => {
    it("should update current token id", async () => {
      expect(await latteNFT.currentCategoryId()).to.eq(0);
      await latteNFT.addCategoryInfo("first cat", "");
      expect(await latteNFT.currentCategoryId()).to.eq(1);
      await latteNFT.addCategoryInfo("second cat", "");
      expect(await latteNFT.currentCategoryId()).to.eq(2);
    });
  });

  describe("#categoryToLatteNFTList()", () => {
    it("should return a list of tokenIds", async () => {
      await latteNFT.mintBatch(await deployer.getAddress(), 0, "", 5);
      await latteNFT.addCategoryInfo("foo0", "bar0"); //add category info 0, now current is 1
      await latteNFT.addCategoryInfo("foo1", "bar1"); //add category info 1, now current is 2
      await latteNFT.mintBatch(await deployer.getAddress(), 1, "", 1);
      await latteNFT.mintBatch(await deployer.getAddress(), 0, "", 5);

      expect(
        (await latteNFT.categoryToLatteNFTList(0)).map((tokenId: BigNumber) => {
          return tokenId.toNumber();
        })
      ).to.deep.eq([0, 1, 2, 3, 4, 6, 7, 8, 9, 10]);

      expect(
        (await latteNFT.categoryToLatteNFTList(1)).map((tokenId: BigNumber) => {
          return tokenId.toNumber();
        })
      ).to.deep.eq([5]);

      expect(
        (await latteNFT.categoryToLatteNFTList(2)).map((tokenId: BigNumber) => {
          return tokenId.toNumber();
        })
      ).to.deep.eq([]);
    });
  });

  describe("#categoryURI()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(latteNFT.categoryURI(99)).to.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when there is no baseURI", () => {
      it("should only return categoryURI", async () => {
        await latteNFT.setBaseURI("");
        await latteNFT.addCategoryInfo("foo", "bar");
        expect(await latteNFT.categoryURI(0)).to.eq("bar");
      });
    });

    context("when there are baseURI and categoryURI", () => {
      it("should only return baseURI + categoryURI", async () => {
        await latteNFT.addCategoryInfo("foo", "bar");
        expect(await latteNFT.categoryURI(0)).to.eq(`${await latteNFT.baseURI()}bar`);
      });
    });

    context("when there is baseURI but no categoryURI", () => {
      it("should return baseURI + categoryID", async () => {
        expect(await latteNFT.categoryURI(0)).to.eq(`${await latteNFT.baseURI()}0`);
      });
    });
  });

  describe("#tokenURI()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(latteNFT.tokenURI(99)).to.revertedWith("LatteNFT::tokenURI:: token not existed");
      });
    });
    context("when there is no baseURI", () => {
      it("should only return tokenURI", async () => {
        await latteNFT.setBaseURI("");
        await latteNFT.mint(await deployer.getAddress(), 0, "bar");
        expect(await latteNFT.tokenURI(0)).to.eq("bar");
      });
    });

    context("when there are baseURI and tokenURI", () => {
      it("should only return baseURI + tokenURI", async () => {
        await latteNFT.mint(await deployer.getAddress(), 0, "bar");
        expect(await latteNFT.tokenURI(0)).to.eq(`${await latteNFT.baseURI()}bar`);
      });
    });

    context("when there are baseURI, categoryURI, but no tokenURI", () => {
      it("should only return baseURI + categoryURI", async () => {
        await latteNFT.mint(await deployer.getAddress(), 0, "");
        await latteNFT.addCategoryInfo("foo", "baz");
        expect(await latteNFT.tokenURI(0)).to.eq(`${await latteNFT.baseURI()}baz`);
      });
    });

    context("when there is baseURI but no categoryURI and tokenURI", () => {
      it("should return baseURI + tokenID", async () => {
        await latteNFT.mint(await deployer.getAddress(), 0, "");
        expect(await latteNFT.tokenURI(0)).to.eq(`${await latteNFT.baseURI()}0`);
      });
    });
  });

  describe("#addCategoryInfo()", () => {
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(latteNFTAsBob.addCategoryInfo("NewCatagoryInfo", "/foo/bar")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when add catagory info", async () => {
      it("should added category info", async () => {
        expect(await latteNFT.addCategoryInfo("NewCatagoryInfo", "/foo/bar"));
        const { name, timestamp } = await latteNFT.categoryInfo(0);
        expect(name).to.be.eq("NewCatagoryInfo");
      });
    });
  });

  describe("#updateCategoryInfo()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(latteNFT.updateCategoryInfo(99, "updatedCategoryName", "/foo/bar")).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(latteNFTAsBob.updateCategoryInfo(0, "updatedCategoryName", "/foo/bar")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when update category info", async () => {
      it("should updated category info", async () => {
        expect(await latteNFT.updateCategoryInfo(0, "updatedCategoryName", "/foo/bar"));
        const { name, timestamp } = await latteNFT.categoryInfo(0);
        expect(name).to.be.eq("updatedCategoryName");
      });

      it("should updated category with some category has been set", async () => {
        expect(await latteNFT.updateCategoryInfo(0, "beforeCategoryName", "/foo/bar"));
        let name = await (await latteNFT.categoryInfo(0)).name;
        expect(name).to.be.eq("beforeCategoryName");

        expect(await latteNFT.updateCategoryInfo(0, "afterCategoryName", "/foo/bar"));
        name = await (await latteNFT.categoryInfo(0)).name;
        expect(name).to.be.eq("afterCategoryName");
      });
    });
  });

  describe("#updateTokenCategory()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(latteNFT.updateTokenCategory(0, 99)).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(latteNFTAsBob.updateTokenCategory(0, 0)).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when update token category", async () => {
      it("should update token category", async () => {
        await latteNFT.mint(await eve.getAddress(), 0, "tokenURI");
        await latteNFT.addCategoryInfo("foo", "bar");
        expect(await latteNFT.updateTokenCategory(0, 1));
        const tokenCategory = await latteNFT.latteNFTToCategory(0);
        expect(tokenCategory).to.be.eq(1);
      });
    });
  });

  describe("#getLatteNameOfTokenId()", () => {
    context("when get latte name of token id", async () => {
      it("should get latte name", async () => {
        expect(await latteNFT.getLatteNameOfTokenId(0)).to.be.eq("");
      });
    });
  });

  describe("#mint()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(latteNFT.mint(await eve.getAddress(), 99, "tokenUrl")).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(latteNFTAsBob.mint(await eve.getAddress(), 1, "tokenUrl")).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when caller used to be minter", async () => {
      it("should reverted", async () => {
        await latteNFT.revokeRole(await latteNFT.MINTER_ROLE(), await deployer.getAddress());
        await expect(latteNFT.mint(await eve.getAddress(), 1, "tokenUrl")).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when paused", async () => {
      it("should reverted", async () => {
        await latteNFT.pause();
        await expect(latteNFT.mint(await eve.getAddress(), 0, "tokenUrl")).to.be.revertedWith(
          "ERC721Pausable: token transfer while paused"
        );
      });
    });

    context("when mint", async () => {
      context("when category 0", () => {
        it("should mint", async () => {
          expect(await latteNFT.mint(await eve.getAddress(), 0, "tokenUrl"));
          const categoryId = await latteNFT.latteNFTToCategory(0);
          expect(categoryId).to.be.eq(0);
        });
      });

      context("when category > 0", () => {
        it("should mint", async () => {
          await latteNFT.addCategoryInfo("foo", "bar");
          expect(await latteNFT.mint(await eve.getAddress(), 1, "tokenUrl"));
          const categoryId = await latteNFT.latteNFTToCategory(0);
          expect(categoryId).to.be.eq(1);
        });
      });
    });
  });

  describe("#mintBatch()", () => {
    context("when category is yet to be existed", () => {
      it("should revert", async () => {
        await expect(latteNFT.mintBatch(await eve.getAddress(), 99, "tokenURI", 100)).to.be.revertedWith(
          "LatteNFT::onlyExistingCategoryId::categoryId not existed"
        );
      });
    });
    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(latteNFTAsBob.mintBatch(await eve.getAddress(), 0, "tokenURI", 100)).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when caller used to be minter", async () => {
      it("should reverted", async () => {
        await latteNFT.revokeRole(await latteNFT.MINTER_ROLE(), await deployer.getAddress());
        await expect(latteNFT.mintBatch(await eve.getAddress(), 0, "tokenURI", 100)).to.be.revertedWith(
          "LatteNFT::onlyMinter::only MINTER role"
        );
      });
    });

    context("when paused", async () => {
      it("should reverted", async () => {
        await latteNFT.pause();
        await expect(latteNFT.mintBatch(await eve.getAddress(), 0, "tokenURI", 100)).to.be.revertedWith(
          "ERC721Pausable: token transfer while paused"
        );
      });
    });

    context("when size is zero", async () => {
      it("should reverted", async () => {
        await expect(latteNFT.mintBatch(await eve.getAddress(), 0, "tokenURI", 0)).to.be.revertedWith(
          "LatteNFT::mintBatch::size must be granter than zero"
        );
      });
    });

    context("when mint batch", async () => {
      it("should mint batch", async () => {
        await expect(latteNFT.mintBatch(await eve.getAddress(), 0, "tokenURI", 3));

        expect((await latteNFT.categoryToLatteNFTList(0)).length).to.be.eq(3);
        expect(
          (await latteNFT.categoryToLatteNFTList(0)).reduce((accum: boolean, tokenId: BigNumber, index: number) => {
            return accum && tokenId.eq(BigNumber.from(index));
          }, true)
        ).to.be.true;
        expect(await latteNFT.latteNFTToCategory(0)).to.be.eq(0);
        expect(await latteNFT.latteNFTToCategory(1)).to.be.eq(0);
        expect(await latteNFT.latteNFTToCategory(2)).to.be.eq(0);
      });
    });
  });

  describe("#setLatteName()", () => {
    context("when caller is not a governance", async () => {
      it("should reverted", async () => {
        await expect(latteNFTAsBob.setLatteName(0, "settedName")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when caller used to be governance", async () => {
      it("should reverted", async () => {
        await latteNFT.revokeRole(await latteNFT.GOVERNANCE_ROLE(), await deployer.getAddress());
        await expect(latteNFT.setLatteName(0, "settedName")).to.be.revertedWith(
          "LatteNFT::onlyGovernance::only GOVERNANCE role"
        );
      });
    });

    context("when set latte name", async () => {
      it("should setted latte name", async () => {
        expect(await latteNFT.setLatteName(0, "settedName"));
        expect(await latteNFT.latteNames(0)).to.be.eq("settedName");
      });
    });
  });

  describe("#pause()", () => {
    context("when paused", async () => {
      it("should reverted", async () => {
        await latteNFT.pause();
        await expect(latteNFT.pause()).to.be.revertedWith("Pausable: paused");
      });
    });
    context("when not paused", async () => {
      it("should paused", async () => {
        await latteNFT.pause();
        expect(await latteNFT.paused()).to.be.true;
      });
    });
  });

  describe("#unpause()", () => {
    context("when the owner is a governance", () => {
      context("when paused", async () => {
        it("should unpause", async () => {
          await latteNFT.pause();
          expect(await latteNFT.unpause());
          expect(await latteNFT.paused()).to.be.false;
        });
      });

      context("when not paused", async () => {
        it("should reverted", async () => {
          await expect(latteNFT.unpause()).to.be.revertedWith("Pausable: not paused");
        });
      });
    });
    context("when the own is not a governance", () => {
      it("should not be able to unpause or pause", async () => {
        await latteNFT.renounceRole(await latteNFT.GOVERNANCE_ROLE(), await deployer.getAddress());
        await expect(latteNFT.pause()).to.revertedWith("LatteNFT::onlyGovernance::only GOVERNANCE role");
        await expect(latteNFT.unpause()).to.revertedWith("LatteNFT::onlyGovernance::only GOVERNANCE role");
      });
    });
  });
});
