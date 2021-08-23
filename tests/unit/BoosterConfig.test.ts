import { Signer } from "ethers";
import { solidity } from "ethereum-waffle";
import { ethers, upgrades, waffle } from "hardhat";
import { BoosterConfig, BoosterConfig__factory } from "../../typechain";
import chai from "chai";
import exp from "constants";
import { boosterConfigUnitTestFixture } from "../helpers/fixtures/BoosterConfig";

chai.use(solidity);
const { expect } = chai;

describe("BoosterConfig", () => {
  // BoosterConfig instances
  let boosterConfig: BoosterConfig;
  let boosterConfigAsBob: BoosterConfig;
  let boosterConfigAsAlice: BoosterConfig;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;

  beforeEach(async () => {
    [deployer, alice, bob, eve] = await ethers.getSigners();
    ({ boosterConfig } = await waffle.loadFixture(boosterConfigUnitTestFixture));

    boosterConfigAsBob = BoosterConfig__factory.connect(boosterConfig.address, bob);
    boosterConfigAsAlice = BoosterConfig__factory.connect(boosterConfig.address, alice);
  });
  describe("#updateCurrentEnergy()", () => {
    context("when update currency energy", async () => {
      it("should update current energy", async () => {
        await boosterConfig.setCallerAllowance(await bob.getAddress(), true);
        expect(await boosterConfigAsBob.updateCurrentEnergy(await eve.getAddress(), 1, 2));
        const energyInfo = await boosterConfigAsBob.energyInfo(await eve.getAddress(), 1);
        expect(energyInfo.currentEnergy).to.be.eq(2);
      });
    });

    context("when the caller is not allowance", async () => {
      it("should reverted", async () => {
        await expect(boosterConfigAsAlice.updateCurrentEnergy(await eve.getAddress(), 1, 2)).to.be.revertedWith(
          "BoosterConfig::onlyCaller::only eligible caller"
        );
      });
    });
  });

  describe("#setStakeTokenAllowance()", () => {
    context("when set stake token allowance", async () => {
      it("should set stake token allowance", async () => {
        expect(await boosterConfig.setStakeTokenAllowance(await eve.getAddress(), true));
        expect(await boosterConfig.stakeTokenAllowance(await eve.getAddress())).to.be.true;
      });
    });

    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(boosterConfigAsAlice.setStakeTokenAllowance(await eve.getAddress(), true)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    context("when stake token is address zero", async () => {
      it("should reverted", async () => {
        await expect(boosterConfig.setStakeTokenAllowance(ethers.constants.AddressZero, true)).to.be.revertedWith(
          "BoosterConfig::setStakeTokenAllowance::_stakeToken must not be address(0)"
        );
      });
    });
  });

  describe("#setCallerAllowance()", () => {
    context("when set caller allowance", async () => {
      it("should set caller allowance", async () => {
        expect(await boosterConfig.setCallerAllowance(await eve.getAddress(), true));
        expect(await boosterConfig.callerAllowance(await eve.getAddress())).to.be.true;
      });
    });

    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        await expect(boosterConfigAsBob.setCallerAllowance(await eve.getAddress(), true)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    context("when caller is address zero", async () => {
      it("should reverted", async () => {
        await expect(boosterConfig.setCallerAllowance(ethers.constants.AddressZero, true)).to.be.revertedWith(
          "BoosterConfig::setCallerAllowance::_caller must not be address(0)"
        );
      });
    });
  });

  describe("#setBatchBoosterNFTEnergyInfo()", () => {
    context("when set batch booster NFT energy info", async () => {
      it("sould set batch booster NFT energy info", async () => {
        const nft1 = { nftAddress: await eve.getAddress(), nftTokenId: 1, maxEnergy: 2, boostBps: 3 };
        const nft2 = { nftAddress: await eve.getAddress(), nftTokenId: 2, maxEnergy: 4, boostBps: 5 };
        await expect(boosterConfig.setBatchBoosterNFTEnergyInfo([nft1, nft2]));
        const energyInfoNFT1 = await boosterConfig.energyInfo(await eve.getAddress(), 1);
        expect(energyInfoNFT1.maxEnergy).to.be.eq(2);
        expect(energyInfoNFT1.currentEnergy).to.be.eq(2);
        expect(energyInfoNFT1.boostBps).to.be.eq(3);
        const energyInfoNFT2 = await boosterConfig.energyInfo(await eve.getAddress(), 2);
        expect(energyInfoNFT2.maxEnergy).to.be.eq(4);
        expect(energyInfoNFT2.currentEnergy).to.be.eq(4);
        expect(energyInfoNFT2.boostBps).to.be.eq(5);
      });
    });

    context("when caller is not owner", async () => {
      it("should revert", async () => {
        const nft1 = { nftAddress: await eve.getAddress(), nftTokenId: 1, maxEnergy: 5, boostBps: 10 };
        const nft2 = { nftAddress: await eve.getAddress(), nftTokenId: 2, maxEnergy: 5, boostBps: 10 };
        await expect(boosterConfigAsBob.setBatchBoosterNFTEnergyInfo([nft1, nft2])).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });
  });

  describe("#setBoosterNFTEnergyInfo()", () => {
    context("when set booster NFT energy info", async () => {
      it("should set booster NFT energy info", async () => {
        const nft = { nftAddress: await eve.getAddress(), nftTokenId: 1, maxEnergy: 5, boostBps: 10 };
        expect(await boosterConfig.setBoosterNFTEnergyInfo(nft));
        const energyInfo = await boosterConfig.energyInfo(await eve.getAddress(), 1);
        expect(energyInfo.maxEnergy).to.be.eq(5);
        expect(energyInfo.currentEnergy).to.be.eq(5);
        expect(energyInfo.boostBps).to.be.eq(10);
      });
    });

    context("when set booster NFT energy info with some NFTEnergyinfo has been set", async () => {
      it("should set booster NFT energy info", async () => {
        const nft = { nftAddress: await eve.getAddress(), nftTokenId: 1, maxEnergy: 5, boostBps: 10 };
        expect(await boosterConfig.setBoosterNFTEnergyInfo(nft));
        const energyInfo = await boosterConfig.energyInfo(await eve.getAddress(), 1);
        expect(energyInfo.maxEnergy).to.be.eq(5);
        expect(energyInfo.currentEnergy).to.be.eq(5);
        expect(energyInfo.boostBps).to.be.eq(10);

        const newNFGInfo = { nftAddress: await eve.getAddress(), nftTokenId: 1, maxEnergy: 9, boostBps: 12 };
        expect(await boosterConfig.setBoosterNFTEnergyInfo(newNFGInfo));
        const setNewEnergyInfo = await boosterConfig.energyInfo(await eve.getAddress(), 1);
        expect(setNewEnergyInfo.maxEnergy).to.be.eq(9);
        expect(setNewEnergyInfo.currentEnergy).to.be.eq(9);
        expect(setNewEnergyInfo.boostBps).to.be.eq(12);
      });
    });

    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        const nft = { nftAddress: await eve.getAddress(), nftTokenId: 2, maxEnergy: 5, boostBps: 10 };
        await expect(boosterConfigAsBob.setBoosterNFTEnergyInfo(nft)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });
  });

  describe("#setStakingTokenBoosterAllowance()", () => {
    context("when set staking token booster allowance", async () => {
      it("should set staking token booster allowance", async () => {
        await boosterConfig.setStakeTokenAllowance(await alice.getAddress(), true);
        const allowance = [{ nftAddress: await eve.getAddress(), nftTokenId: 1, allowance: true }];
        const boosterAllowanceParams = {
          stakingToken: await alice.getAddress(),
          allowance: allowance,
        };
        expect(await boosterConfig.setStakingTokenBoosterAllowance(boosterAllowanceParams));
        const boosterAllowance = await boosterConfig.boosterNftAllowance(
          await alice.getAddress(),
          allowance[0].nftAddress,
          allowance[0].nftTokenId
        );
        expect(boosterAllowance).to.be.true;
      });
    });

    context("when caller is not owner", async () => {
      it("should reverted", async () => {
        const allowance = [{ nftAddress: await eve.getAddress(), nftTokenId: 1, allowance: true }];
        const boosterAllowanceParams = {
          stakingToken: await alice.getAddress(),
          allowance: allowance,
        };
        await expect(boosterConfigAsBob.setStakingTokenBoosterAllowance(boosterAllowanceParams)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
    });

    context("when staking token booster is not allowance", async () => {
      it("should reverted", async () => {
        const allowance = [{ nftAddress: await eve.getAddress(), nftTokenId: 1, allowance: false }];
        const boosterAllowanceParams = {
          stakingToken: await alice.getAddress(),
          allowance: allowance,
        };
        await expect(boosterConfig.setStakingTokenBoosterAllowance(boosterAllowanceParams)).to.be.revertedWith(
          "BoosterConfig::setStakingTokenBoosterAllowance:: bad staking token"
        );
      });
    });
  });
});
