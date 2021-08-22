import { ethers, waffle } from "hardhat";
import { Overrides, BigNumberish, utils, BigNumber, Signer, constants } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BeanBag,
  BeanBag__factory,
  Booster,
  BoosterConfig,
  Booster__factory,
  LATTE,
  LATTE__factory,
  MasterBarista,
  MasterBarista__factory,
  MockStakeTokenCallerContract,
  MockWBNB,
  SimpleToken,
  SimpleToken__factory,
  WNativeRelayer
} from "../../typechain";
import { assertAlmostEqual } from "../helpers/assert";
import { advanceBlock, advanceBlockTo, latestBlockNumber } from "../helpers/time";
import exp from "constants";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { boosterUnitTestFixture } from "../helpers";
import { ModifiableContract } from "@eth-optimism/smock";
import { MockERC721 } from "../../typechain/MockERC721";
import { MockMasterBarista } from "../../typechain/MockMasterBarista";
import { MockERC721__factory } from "../../typechain/factories/MockERC721__factory";
import { AddressZero, MaxUint256, Zero } from '@ethersproject/constants';
import { Address } from "ethereumjs-util";

chai.use(solidity);
const { expect } = chai;

describe("Booster", () => {
  let LATTE_START_BLOCK: number;
  let LATTE_PER_BLOCK: BigNumber;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let dev: Signer;

  // Lambdas
  let signatureFn: (signer: Signer, msg?: string) => Promise<string>

  // Contracts
  let latteToken: LATTE;
  let masterBarista: ModifiableContract;
  let boosterConfig: ModifiableContract;
  let nftToken: ModifiableContract;
  let stakingTokens: SimpleToken[];
  let booster: Booster
  let beanBag: BeanBag
  let wbnb: MockWBNB

  // Bindings
  let boosterAsAlice: Booster
  let nftTokenAsAlice: MockERC721;
  let signatureAsDeployer: string
  let signatureAsAlice: string

  beforeEach(async () => {
    ;({
        booster,
        masterBarista,
        boosterConfig,
        stakingTokens,
        latteToken,
        nftToken,
        beanBag,
        signatureFn,
        wbnb,
      } = await waffle.loadFixture(boosterUnitTestFixture))
    ;[deployer, alice, bob, dev] = await ethers.getSigners()

    boosterAsAlice = Booster__factory.connect(booster.address, alice) as Booster
    nftTokenAsAlice = MockERC721__factory.connect(nftToken.address, alice) as MockERC721
    
    signatureAsDeployer = await signatureFn(deployer)
    signatureAsAlice = await signatureFn(alice)
  })

  describe('#stakeNFT()', () => {
    context('when stake token is not allowed in the config', () => {
      it('should revert', async() => {
         // set stake token allowance to be true
         await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: false
          }
        }) 
        await expect(booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)).to.be.revertedWith('Booster::isStakeTokenOK::bad stake token')
      })
    })

    context('when nft is not allowed in the config', () => {
      it('should revert', async() => {
        // set stake token allowance to be true
        await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: true
          }
        }) 
        // set booster nft allowance to be false / revert case
        await boosterConfig.smodify.put({
          boosterNftAllowance: {
            [stakingTokens[0].address]: {
              [nftToken.address]: {
                1: false
              }
            }
          }
        })

        await expect(booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)).to.be.revertedWith('Booster::isBoosterNftOK::bad nft')
      })
    })

    context('when invalid signature', () => {
      it('should revert', async () => {
        // set stake token allowance to be true
        await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: true
          }
        }) 
        // set booster nft allowance to be false / revert case
        await boosterConfig.smodify.put({
          boosterNftAllowance: {
            [stakingTokens[0].address]: {
              [nftToken.address]: {
                1: true
              }
            }
          }
        })

        await expect(booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)).to.be.revertedWith('Booster::permit::INVALID_SIGNATURE')
      })
    })

    context('when stake token and nft are allowed', () => {
      context('when nft to stake is identical to the one that already staked', () => {
        context('on the same stakeToken', () => {
          it('should revert', async() => {
            const deployerAddr = await deployer.getAddress()
  
            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(deployerAddr, 1)
            await ((nftToken as unknown) as MockERC721).approve(booster.address, 1)
            
            // set stake token allowance to be true
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true
              }
            }) 
            // set booster nft allowance to be false / revert case
            await boosterConfig.smodify.put({
              boosterNftAllowance: {
                [stakingTokens[0].address]: {
                  [nftToken.address]: {
                    1: true
                  }
                }
              }
            })
            await booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)
            // owner of a booster contract should be changed
            expect(await ((nftToken as unknown) as MockERC721).ownerOf(1)).to.eq(booster.address)
            await expect(booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)).to.be.revertedWith('Booster::stakeNFT:: nft already staked')
          })
        })

        context('when nft to stake has been staked in another pool', () => {
          it('should revert', async() => {
            const deployerAddr = await deployer.getAddress()
  
            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(deployerAddr, 1)
            await ((nftToken as unknown) as MockERC721).approve(booster.address, 1)
            
            // set stake token allowance to be true
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true,
                [stakingTokens[1].address]: true
              }
            }) 
            // set booster nft allowance to be false / revert case
            await boosterConfig.smodify.put({
              boosterNftAllowance: {
                [stakingTokens[0].address]: {
                  [nftToken.address]: {
                    1: true
                  }
                },
                [stakingTokens[1].address]: {
                  [nftToken.address]: {
                    1: true
                  }
                }
              },
            })
            await booster.stakeNFT(stakingTokens[1].address, nftToken.address, 1, signatureAsDeployer)
            // owner of a booster contract should be changed
            expect(await ((nftToken as unknown) as MockERC721).ownerOf(1)).to.eq(booster.address)
            await expect(booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)).to.be.revertedWith('ERC721: transfer of token that is not own')
          })
        })
      })

      context('when there is no reward to harvest', () => {
        it('should successfully stake nft', async () => {
          const deployerAddr = await deployer.getAddress()
  
          // mint and approve nft
          await ((nftToken as unknown) as MockERC721).mint(deployerAddr, 1)
          await ((nftToken as unknown) as MockERC721).approve(booster.address, 1)
          
          // set stake token allowance to be true
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [stakingTokens[0].address]: true
            }
          }) 
          // set booster nft allowance to be false / revert case
          await boosterConfig.smodify.put({
            boosterNftAllowance: {
              [stakingTokens[0].address]: {
                [nftToken.address]: {
                  1: true
                }
              }
            }
          })
          await booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)
          // owner of a booster contract should be changed
          expect(await ((nftToken as unknown) as MockERC721).ownerOf(1)).to.eq(booster.address)
          // should expect some storage changes in a booster
          expect((await booster.userStakingNFT(stakingTokens[0].address, deployerAddr)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
          expect((await booster.userStakingNFT(stakingTokens[0].address, deployerAddr)).nftTokenId).to.eq(1)
        })
      })

      context('when there is a reward to harvest',() => {
        context('with some energy', () => {
          it('should successfully claim a reward along with staking an nft with extra energy minted', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()

            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
            await nftTokenAsAlice.approve(booster.address, 1)
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
            await nftTokenAsAlice.approve(booster.address, 2)
            
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true
              },
              boosterNftAllowance: {
                [stakingTokens[0].address]: {
                  [nftToken.address]: {
                    1: true,
                    2: true
                  }
                }
              },
              energyInfo: {
                [nftToken.address]: {
                  1: {
                    currentEnergy: parseEther('10').toString(),
                    boostBps: '1000'
                  }
                }
              },
              callerAllowance: {
                [booster.address]: true
              },
            })
            // stake for the first time, its' energy will be used to amplify
            await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
            // should expect some storage changes in a booster
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)

            await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')

            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [stakingTokens[0].address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('10', 12).toString()
                }
              },
              userInfo: {
                [stakingTokens[0].address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [stakingTokens[0].address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
            
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('100'))
            await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 2, signatureAsAlice)
            // owner is expected to get 100 reward + 10 extra rewards from staking an nft
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100').add(parseEther('10')))
            // dev is expected to get 15% of 10 extra reward, thus making the dev able to collect 1.5
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
            // since 10 extra rewards has been mint, current energy should be drained to 0
            expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            // should update a user staking nft info
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(2)
          })
        })

        context('without energy', () => {
          it('should successfully claim a reward along with staking an nft with no extra energy minted', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()

            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
            await nftTokenAsAlice.approve(booster.address, 1)
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
            await nftTokenAsAlice.approve(booster.address, 2)
            
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true
              },
              boosterNftAllowance: {
                [stakingTokens[0].address]: {
                  [nftToken.address]: {
                    1: true,
                    2: true
                  }
                }
              },
              callerAllowance: {
                [booster.address]: true
              },
            })
            // stake for the first time, its' energy will be used to amplify
            await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
            // should expect some storage changes in a booster
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)

            await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')

            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [stakingTokens[0].address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('10', 12).toString()
                }
              },
              userInfo: {
                [stakingTokens[0].address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [stakingTokens[0].address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
            
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('100'))
            await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 2, signatureAsAlice)
            // owner is expected to get 100 reward 
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
            // since 10 extra rewards has been mint, current energy should be drained to 0
            expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            // should update a user staking nft info
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(2)
          })
        })
      })
    })
  })

  describe('#unstakeNFT()', () => {
    context('when stake token is not allowed in the config', () => {
      it('should revert', async() => {
         // set stake token allowance to be true
         await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: false
          }
        }) 

        await expect(booster.unstakeNFT(stakingTokens[0].address, signatureAsDeployer)).to.be.revertedWith('Booster::isStakeTokenOK::bad stake token')
      })
    })

    context('when invalid signature', () => {
      it('should revert', async () => {
         // set stake token allowance to be true
         await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: true
          }
        }) 

        await expect(booster.unstakeNFT(stakingTokens[0].address, signatureAsAlice)).to.be.revertedWith('Booster::permit::INVALID_SIGNATURE')
      })
    })

    context('when there is no reward to harvest', () => {
      it('should successfully unstake nft', async () => {
        const deployerAddr = await deployer.getAddress()

        // mint and approve nft
        await ((nftToken as unknown) as MockERC721).mint(deployerAddr, 1)
        await ((nftToken as unknown) as MockERC721).approve(booster.address, 1)
        
        // set stake token allowance to be true
        await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: true
          }
        }) 
        // set booster nft allowance to be false / revert case
        await boosterConfig.smodify.put({
          boosterNftAllowance: {
            [stakingTokens[0].address]: {
              [nftToken.address]: {
                1: true
              }
            }
          }
        })
        await booster.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsDeployer)
        // owner of a booster contract should be changed
        expect(await ((nftToken as unknown) as MockERC721).ownerOf(1)).to.eq(booster.address)
        // should expect some storage changes in a booster
        expect((await booster.userStakingNFT(stakingTokens[0].address, deployerAddr)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
        expect((await booster.userStakingNFT(stakingTokens[0].address, deployerAddr)).nftTokenId).to.eq(1)

        await booster.unstakeNFT(stakingTokens[0].address, signatureAsDeployer)
        // owner of a booster contract should be changed
        expect(await ((nftToken as unknown) as MockERC721).ownerOf(1)).to.eq(deployerAddr)
        // should expect some storage changes in a booster
        expect((await booster.userStakingNFT(stakingTokens[0].address, deployerAddr)).nftAddress.toLowerCase()).to.eq(AddressZero)
        expect((await booster.userStakingNFT(stakingTokens[0].address, deployerAddr)).nftTokenId).to.eq(0)
      })
    })

    context('when there is a reward to harvest', () => {
      context('with some energy', () => {
        it('should successfully claim a reward along with staking an nft with extra energy minted', async() => {
          // mock master barista reward for stakingToken[0]
          const ownerAddress = await alice.getAddress()
          const snapshotBlock = await latestBlockNumber()

          // mint and approve nft
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
          await nftTokenAsAlice.approve(booster.address, 1)
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
          await nftTokenAsAlice.approve(booster.address, 2)
          
          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [stakingTokens[0].address]: true
            },
            boosterNftAllowance: {
              [stakingTokens[0].address]: {
                [nftToken.address]: {
                  1: true,
                }
              }
            },
            energyInfo: {
              [nftToken.address]: {
                1: {
                  currentEnergy: parseEther('10').toString(),
                  boostBps: '1000'
                }
              }
            },
            callerAllowance: {
              [booster.address]: true
            },
          })
          // stake for the first time, its' energy will be used to amplify
          await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
          // should expect some storage changes in a booster
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)

          await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')

          // MOCK master barista storages
          await masterBarista.smodify.put({
            poolInfo: {
              [stakingTokens[0].address]: {
                lastRewardBlock: snapshotBlock,
                accLattePerShare: parseUnits('10', 12).toString()
              }
            },
            userInfo: {
              [stakingTokens[0].address]: {
                [ownerAddress]: {
                  amount: parseEther('10').toString(),
                  fundedBy: booster.address
                }
              }
            },
            stakeTokenCallerAllowancePool: {
              [stakingTokens[0].address]: true
            },
          })
          await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
          
          // MOCK that master barista has enough LATTE
          await latteToken.transfer(beanBag.address, parseEther('100'))
          await boosterAsAlice.unstakeNFT(stakingTokens[0].address, signatureAsAlice)
          // owner is expected to get 100 reward + 10 extra rewards from staking an nft
          expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100').add(parseEther('10')))
          // dev is expected to get 15% of 10 extra reward, thus making the dev able to collect 1.5
          expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
          // since 10 extra rewards has been mint, current energy should be drained to 0
          expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
          // should update a user staking nft info
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(AddressZero)
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(0)
        })
      })

      context('without energy', () => {
        it('should successfully claim a reward along with staking an nft with extra energy minted', async() => {
          // mock master barista reward for stakingToken[0]
          const ownerAddress = await alice.getAddress()
          const snapshotBlock = await latestBlockNumber()

          // mint and approve nft
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
          await nftTokenAsAlice.approve(booster.address, 1)
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
          await nftTokenAsAlice.approve(booster.address, 2)
          
          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [stakingTokens[0].address]: true
            },
            boosterNftAllowance: {
              [stakingTokens[0].address]: {
                [nftToken.address]: {
                  1: true,
                }
              }
            },
            energyInfo: {
              [nftToken.address]: {
                1: {
                  currentEnergy: '0',
                  boostBps: '1000'
                }
              }
            },
            callerAllowance: {
              [booster.address]: true
            },
          })
          // stake for the first time, its' energy will be used to amplify
          await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
          // should expect some storage changes in a booster
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)

          await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')

          // MOCK master barista storages
          await masterBarista.smodify.put({
            poolInfo: {
              [stakingTokens[0].address]: {
                lastRewardBlock: snapshotBlock,
                accLattePerShare: parseUnits('10', 12).toString()
              }
            },
            userInfo: {
              [stakingTokens[0].address]: {
                [ownerAddress]: {
                  amount: parseEther('10').toString(),
                  fundedBy: booster.address
                }
              }
            },
            stakeTokenCallerAllowancePool: {
              [stakingTokens[0].address]: true
            },
          })
          await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
          
          // MOCK that master barista has enough LATTE
          await latteToken.transfer(beanBag.address, parseEther('100'))
          await boosterAsAlice.unstakeNFT(stakingTokens[0].address, signatureAsAlice)
          // owner is expected to get 100 reward
          expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
          expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
          // since 10 extra rewards has been mint, current energy should be drained to 0
          expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
          // should update a user staking nft info
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(AddressZero)
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(0)
        })
      })
    })
  })

  describe('#harvest()', () => {
    context('when sending multiple stake tokens', () => {
      it('should harvest multiple stake tokens', async () => {
        // mock master barista reward for stakingToken[0]
        const ownerAddress = await alice.getAddress()
        const snapshotBlock = await latestBlockNumber()

        // mint and approve nft
        await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
        await nftTokenAsAlice.approve(booster.address, 1)
        await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
        await nftTokenAsAlice.approve(booster.address, 2)
        
        // MOCK a booster config storage
        await boosterConfig.smodify.put({
          stakeTokenAllowance: {
            [stakingTokens[0].address]: true,
            [stakingTokens[1].address]: true
          },
          boosterNftAllowance: {
            [stakingTokens[0].address]: {
              [nftToken.address]: {
                1: true,
              }
            },
            [stakingTokens[1].address]: {
              [nftToken.address]: {
                2: true,
              }
            }
          },
          energyInfo: {
            [nftToken.address]: {
              1: {
                currentEnergy: parseEther('10').toString(),
                boostBps: '1000'
              },
              2: {
                currentEnergy: parseEther('10').toString(),
                boostBps: '1000'
              }
            }
          },
          callerAllowance: {
            [booster.address]: true
          },
        })
        // stake for the first time, its' energy will be used to amplify
        await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
        await boosterAsAlice.stakeNFT(stakingTokens[1].address, nftToken.address, 2, signatureAsAlice)
        // should expect some storage changes in a booster
        expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
        expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)
        expect((await booster.userStakingNFT(stakingTokens[1].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
        expect((await booster.userStakingNFT(stakingTokens[1].address, ownerAddress)).nftTokenId).to.eq(2)

        await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
        await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[1].address, '1000')

        // MOCK master barista storages
        await masterBarista.smodify.put({
          poolInfo: {
            [stakingTokens[0].address]: {
              lastRewardBlock: snapshotBlock,
              accLattePerShare: parseUnits('10', 12).toString()
            },
            [stakingTokens[1].address]: {
              lastRewardBlock: snapshotBlock,
              accLattePerShare: parseUnits('10', 12).toString()
            }
          },
          userInfo: {
            [stakingTokens[0].address]: {
              [ownerAddress]: {
                amount: parseEther('10').toString(),
                fundedBy: booster.address
              }
            },
            [stakingTokens[1].address]: {
              [ownerAddress]: {
                amount: parseEther('10').toString(),
                fundedBy: booster.address
              }
            }
          },
          stakeTokenCallerAllowancePool: {
            [stakingTokens[0].address]: true,
            [stakingTokens[1].address]: true
          },
        })
        await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
        await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[1].address, booster.address)
        
        // MOCK that master barista has enough LATTE
        await latteToken.transfer(beanBag.address, parseEther('200'))
        await expect(boosterAsAlice["harvest(address[])"]([stakingTokens[0].address, stakingTokens[1].address]))
        .to.emit(booster, 'Harvest').withArgs(ownerAddress, stakingTokens[0].address, parseEther('100').add(parseEther('10')))
        .to.emit(booster, 'Harvest').withArgs(ownerAddress, stakingTokens[1].address, parseEther('100').add(parseEther('10')))
        // owner is expected to get 100 reward + 10 extra rewards from staking an nft * 2 for 2 stake tokens
        expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100').add(parseEther('10')).mul(2))
        // dev is expected to get 15% of 10 extra reward, thus making the dev able to collect 1.5 * 2 = 3
        expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('3'))
        
      })
    })

    context("when the pool ain't the same as a reward", () => {
      context('when harvest an disallowed token', () => {
        it('should reverted', async () => {
          await expect(booster["harvest(address)"](stakingTokens[0].address)).to.revertedWith('Booster::isStakeTokenOK::bad stake token')
        })
      })


      context('without energy', () => {
        it ('should emit a Harvest with 0 reward', async () => {
          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [stakingTokens[0].address]: true
            },
          })
          const ownerAddress = await deployer.getAddress()
          await expect(booster["harvest(address)"](stakingTokens[0].address)).to.emit(booster, 'Harvest').withArgs(ownerAddress, stakingTokens[0].address, 0)
        })
      })

      context('with some energy', () => {
        context('with bonus reward',() => {
          it ('should harvest the reward', async () => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()
  
            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
            await nftTokenAsAlice.approve(booster.address, 1)
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
            await nftTokenAsAlice.approve(booster.address, 2)
            
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true
              },
              boosterNftAllowance: {
                [stakingTokens[0].address]: {
                  [nftToken.address]: {
                    1: true,
                  }
                }
              },
              energyInfo: {
                [nftToken.address]: {
                  1: {
                    currentEnergy: parseEther('10').toString(),
                    boostBps: '1000'
                  }
                }
              },
              callerAllowance: {
                [booster.address]: true
              },
            })
            // stake for the first time, its' energy will be used to amplify
            await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
            // should expect some storage changes in a booster
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)
  
            await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
            // MOCK master barista storages
            await masterBarista.smodify.put({
              bonusLockUpBps: 6000,
              poolInfo: {
                [stakingTokens[0].address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('25', 12).toString(),
                  accLattePerShareTilBonusEnd: parseUnits('25', 12).toString()
                }
              },
              userInfo: {
                [stakingTokens[0].address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [stakingTokens[0].address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
            
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('250'))
            await expect(boosterAsAlice["harvest(address)"](stakingTokens[0].address)).to.emit(booster, 'Harvest').withArgs(ownerAddress, stakingTokens[0].address, parseEther('100').add(parseEther('10')))
            // owner is expected to get 100 reward + 10 extra rewards from staking an nft
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100').add(parseEther('10')))
            // dev is expected to get 15% of 10 extra reward, thus making the dev able to collect 1.5
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
          })
        })
        it ('should harvest the reward', async () => {
          // mock master barista reward for stakingToken[0]
          const ownerAddress = await alice.getAddress()
          const snapshotBlock = await latestBlockNumber()

          // mint and approve nft
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
          await nftTokenAsAlice.approve(booster.address, 1)
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
          await nftTokenAsAlice.approve(booster.address, 2)
          
          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [stakingTokens[0].address]: true
            },
            boosterNftAllowance: {
              [stakingTokens[0].address]: {
                [nftToken.address]: {
                  1: true,
                }
              }
            },
            energyInfo: {
              [nftToken.address]: {
                1: {
                  currentEnergy: parseEther('10').toString(),
                  boostBps: '1000'
                }
              }
            },
            callerAllowance: {
              [booster.address]: true
            },
          })
          // stake for the first time, its' energy will be used to amplify
          await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
          // should expect some storage changes in a booster
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
          expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)

          await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')

          // MOCK master barista storages
          await masterBarista.smodify.put({
            poolInfo: {
              [stakingTokens[0].address]: {
                lastRewardBlock: snapshotBlock,
                accLattePerShare: parseUnits('10', 12).toString()
              }
            },
            userInfo: {
              [stakingTokens[0].address]: {
                [ownerAddress]: {
                  amount: parseEther('10').toString(),
                  fundedBy: booster.address
                }
              }
            },
            stakeTokenCallerAllowancePool: {
              [stakingTokens[0].address]: true
            },
          })
          await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
          
          // MOCK that master barista has enough LATTE
          await latteToken.transfer(beanBag.address, parseEther('100'))
          await expect(boosterAsAlice["harvest(address)"](stakingTokens[0].address)).to.emit(booster, 'Harvest').withArgs(ownerAddress, stakingTokens[0].address, parseEther('100').add(parseEther('10')))
          // owner is expected to get 100 reward + 10 extra rewards from staking an nft
          expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100').add(parseEther('10')))
          // dev is expected to get 15% of 10 extra reward, thus making the dev able to collect 1.5
          expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
        })
      })
    })

    context('when the pool is the same as a reward', () => {
      context('when harvest an disallowed token', () => {
        it('should reverted', async () => {
          await expect(booster["harvest(address)"](latteToken.address)).to.revertedWith('Booster::isStakeTokenOK::bad stake token')
        })
      })

      context('without energy', () => {
        it ('should emit a Harvest with 0 reward', async () => {
          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [latteToken.address]: true
            },
          })
          const ownerAddress = await deployer.getAddress()
          await expect(booster["harvest(address)"](latteToken.address)).to.emit(booster, 'Harvest').withArgs(ownerAddress, latteToken.address, 0)
        })
      })

      context('with some energy', () => {
        it ('should harvest the reward', async () => {
          // mock master barista reward for stakingToken[0]
          const ownerAddress = await alice.getAddress()
          const snapshotBlock = await latestBlockNumber()

          // mint and approve nft
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
          await nftTokenAsAlice.approve(booster.address, 1)
          await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
          await nftTokenAsAlice.approve(booster.address, 2)
          
          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [latteToken.address]: true
            },
            boosterNftAllowance: {
              [latteToken.address]: {
                [nftToken.address]: {
                  1: true,
                }
              }
            },
            energyInfo: {
              [nftToken.address]: {
                1: {
                  currentEnergy: parseEther('10').toString(),
                  boostBps: '1000'
                }
              }
            },
            callerAllowance: {
              [booster.address]: true
            },
          })
          // stake for the first time, its' energy will be used to amplify
          await boosterAsAlice.stakeNFT(latteToken.address, nftToken.address, 1, signatureAsAlice)
          // should expect some storage changes in a booster
          expect((await booster.userStakingNFT(latteToken.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
          expect((await booster.userStakingNFT(latteToken.address, ownerAddress)).nftTokenId).to.eq(1)
          // MOCK master barista storages
          await masterBarista.smodify.put({
            poolInfo: {
              [latteToken.address]: {
                lastRewardBlock: snapshotBlock,
                accLattePerShare: parseUnits('10', 12).toString()
              }
            },
            userInfo: {
              [latteToken.address]: {
                [ownerAddress]: {
                  amount: parseEther('10').toString(),
                  fundedBy: booster.address
                }
              }
            },
            stakeTokenCallerAllowancePool: {
              [latteToken.address]: true
            },
          })
          await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(latteToken.address, booster.address)
          // MOCK that master barista has enough LATTE
          await latteToken.transfer(beanBag.address, parseEther('100'))
          // expect to harvest with the reward that is not include the latte portion that is sent in the previous statement
          await expect(boosterAsAlice["harvest(address)"](latteToken.address)).to.emit(booster, 'Harvest').withArgs(ownerAddress, latteToken.address, parseEther('100').add(parseEther('10')))
          // owner is expected to get 100 reward + 10 extra rewards from staking an nft
          expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100').add(parseEther('10')))
          // dev is expected to get 15% of 10 extra reward, thus making the dev able to collect 1.5
          expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
        })
      })
    })
  })

  describe('#stake()', () => {
    context('when stake a disallowed token', () => {
      it('should revert', async() => {
        await expect(booster.stake(stakingTokens[0].address, parseEther('10'))).to.revertedWith('Booster::isStakeTokenOK::bad stake token')
      })
    })

    context("when the pool ain't the same as a reward", () => {
      context('when a stake token is a wrap native', () => {
        context('when msg.value != amount', () => {
          it('should revert', async () => {
            it('should be able to stake', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
              const snapshotBlock = await latestBlockNumber()
    
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
              })
    
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
    
              // MOCK master barista storages
              await masterBarista.smodify.put({
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock,
                    accLattePerShare: parseUnits('10', 12).toString()
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              // Mint some staking token to owner
              await SimpleToken__factory.connect(wbnb.address, alice).approve(booster.address, parseEther('100'))
              await expect(boosterAsAlice.stake(wbnb.address, parseEther('100'), {
                value: parseEther('99')
              })).to.revertedWith('Booster::_safeWrap:: value != msg.value')
            })
          })
        })
        context('when there is no reward to harvest', () => {
          it('should be able to stake', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()
  
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [wbnb.address]: true
              },
            })
  
            await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [wbnb.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('10', 12).toString()
                }
              },
              stakeTokenCallerAllowancePool: {
                [wbnb.address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('100'))
            // Mint some staking token to owner
            await SimpleToken__factory.connect(wbnb.address, alice).approve(booster.address, parseEther('100'))
            await boosterAsAlice.stake(wbnb.address, parseEther('100'), {
              value: parseEther('100')
            })

            // owner is expected have 0 LATTE since no reward before
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('0'))
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
            // expect balance of the owner to be 100 (from stake)
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq(parseEther('100'))
          })
        })
  
        context('when there is a reward to harvest', () => {
          context('with energy', () => {
            it('should stake a token with harvest a reward + some extra energy', async () => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
              const snapshotBlock = await latestBlockNumber()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
                boosterNftAllowance: {
                  [wbnb.address]: {
                    [nftToken.address]: {
                      1: true,
                      2: true
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: parseEther('10').toString(),
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(wbnb.address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock,
                    accLattePerShare: parseUnits('10', 12).toString()
                  }
                },
                userInfo: {
                  [wbnb.address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              await SimpleToken__factory.connect(wbnb.address, alice).approve(booster.address, parseEther('50'))

              await expect(boosterAsAlice.stake(wbnb.address, parseEther('50'), {
                value: parseEther('50')
              }))
              .to.emit(booster, 'MasterBaristaCall').withArgs(ownerAddress, parseEther('10'), wbnb.address,  parseEther('10'), '0')
              .to.emit(booster, 'Stake').withArgs(ownerAddress, wbnb.address, parseEther('50'))
  
              // owner is expected have 10 rewards from 10% (based on boostBps) of 100 + 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('110'))
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq(parseEther('60'))
            })
          })
  
          context('without energy', () => {
            it('should stake a token with harvest a reward', async () => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
              const snapshotBlock = await latestBlockNumber()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
                boosterNftAllowance: {
                  [wbnb.address]: {
                    [nftToken.address]: {
                      1: true,
                      2: true
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: '0',
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(wbnb.address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock,
                    accLattePerShare: parseUnits('10', 12).toString()
                  }
                },
                userInfo: {
                  [wbnb.address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
  
              await SimpleToken__factory.connect(wbnb.address, alice).approve(booster.address, parseEther('50'))
              await expect(boosterAsAlice.stake(wbnb.address, parseEther('50'), {
                value: parseEther('50')
              })).to.emit(booster, 'Stake').withArgs(ownerAddress, wbnb.address, parseEther('50'))
              // owner is expected have 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq(parseEther('60'))
            })
          })
        })
      })

      context('when a stake token is not wrap native', () => {
        context('when sending msg value with non-native stake token', () => {
          it('should revert', async () => {
            it('should be able to stake', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
              const snapshotBlock = await latestBlockNumber()
    
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [stakingTokens[0].address]: true
                },
              })
    
              await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
    
              // MOCK master barista storages
              await masterBarista.smodify.put({
                poolInfo: {
                  [stakingTokens[0].address]: {
                    lastRewardBlock: snapshotBlock,
                    accLattePerShare: parseUnits('10', 12).toString()
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [stakingTokens[0].address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              // Mint some staking token to owner
              await stakingTokens[0].mint(ownerAddress, parseEther('100'))
              await SimpleToken__factory.connect(stakingTokens[0].address, alice).approve(booster.address, parseEther('100'))
              await expect(boosterAsAlice.stake(stakingTokens[0].address, parseEther('100'), {
                value: parseEther('100')
              })).to.revertedWith('Booster::_safeWrap:: baseToken is not wNative')
            })
          })
        })
        context('when there is no reward to harvest', () => {
          it('should be able to stake', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()
  
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true
              },
            })
  
            await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [stakingTokens[0].address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('10', 12).toString()
                }
              },
              stakeTokenCallerAllowancePool: {
                [stakingTokens[0].address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
            
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('100'))
            // Mint some staking token to owner
            await stakingTokens[0].mint(ownerAddress, parseEther('100'))
            await SimpleToken__factory.connect(stakingTokens[0].address, alice).approve(booster.address, parseEther('100'))
  
            await boosterAsAlice.stake(stakingTokens[0].address, parseEther('100'))
            // owner is expected have 0 LATTE since no reward before
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('0'))
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
            // expect balance of the owner to be 100 (from stake)
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(stakingTokens[0].address, ownerAddress)).amount).to.eq(parseEther('100'))
          })
        })
  
        context('when there is a reward to harvest', () => {
          context('with energy', () => {
            it('should stake a token with harvest a reward + some extra energy', async () => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
              const snapshotBlock = await latestBlockNumber()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [stakingTokens[0].address]: true
                },
                boosterNftAllowance: {
                  [stakingTokens[0].address]: {
                    [nftToken.address]: {
                      1: true,
                      2: true
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: parseEther('10').toString(),
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                poolInfo: {
                  [stakingTokens[0].address]: {
                    lastRewardBlock: snapshotBlock,
                    accLattePerShare: parseUnits('10', 12).toString()
                  }
                },
                userInfo: {
                  [stakingTokens[0].address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [stakingTokens[0].address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              await stakingTokens[0].mint(ownerAddress, parseEther('50'))
              await SimpleToken__factory.connect(stakingTokens[0].address, alice).approve(booster.address, parseEther('50'))
  
              await expect(boosterAsAlice.stake(stakingTokens[0].address, parseEther('50')))
              .to.emit(booster, 'MasterBaristaCall').withArgs(ownerAddress, parseEther('10'), stakingTokens[0].address,  parseEther('10'), '0')
              .to.emit(booster, 'Stake').withArgs(ownerAddress, stakingTokens[0].address, parseEther('50'))
  
              // owner is expected have 10 rewards from 10% (based on boostBps) of 100 + 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('110'))
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(stakingTokens[0].address, ownerAddress)).amount).to.eq(parseEther('60'))
            })
          })
  
          context('without energy', () => {
            it('should stake a token with harvest a reward', async () => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
              const snapshotBlock = await latestBlockNumber()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [stakingTokens[0].address]: true
                },
                boosterNftAllowance: {
                  [stakingTokens[0].address]: {
                    [nftToken.address]: {
                      1: true,
                      2: true
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: '0',
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                poolInfo: {
                  [stakingTokens[0].address]: {
                    lastRewardBlock: snapshotBlock,
                    accLattePerShare: parseUnits('10', 12).toString()
                  }
                },
                userInfo: {
                  [stakingTokens[0].address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [stakingTokens[0].address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              await stakingTokens[0].mint(ownerAddress, parseEther('50'))
  
              await SimpleToken__factory.connect(stakingTokens[0].address, alice).approve(booster.address, parseEther('50'))
              await expect(boosterAsAlice.stake(stakingTokens[0].address, parseEther('50'))).to.emit(booster, 'Stake').withArgs(ownerAddress, stakingTokens[0].address, parseEther('50'))
              // owner is expected have 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(stakingTokens[0].address, ownerAddress)).amount).to.eq(parseEther('60'))
            })
          })
        })
      })
    })

    context('when the pool is the same as a reward (LATTE)', () => {
      context('when there is no reward to harvest', () => {
        it('should be able to stake', async() => {
          // mock master barista reward for stakingToken[0]
          const ownerAddress = await alice.getAddress()
          const snapshotBlock = await latestBlockNumber()

          // MOCK a booster config storage
          await boosterConfig.smodify.put({
            stakeTokenAllowance: {
              [latteToken.address]: true
            },
          })

          // MOCK master barista storages
          await masterBarista.smodify.put({
            poolInfo: {
              [latteToken.address]: {
                lastRewardBlock: snapshotBlock,
                accLattePerShare: parseUnits('10', 12).toString()
              }
            },
            stakeTokenCallerAllowancePool: {
              [latteToken.address]: true
            },
          })
          await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(latteToken.address, booster.address)
          
          // MOCK that master barista has enough LATTE
          await latteToken.transfer(beanBag.address, parseEther('100'))
          // Mint some staking token to owner
          await latteToken.transfer(ownerAddress, parseEther('100'))
          await SimpleToken__factory.connect(latteToken.address, alice).approve(booster.address, parseEther('100'))

          await boosterAsAlice.stake(latteToken.address, parseEther('100'))
          // owner is expected have 0 LATTE since no reward before
          expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('0'))
          expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
          // expect balance of the owner to be 100 (from stake)
          expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(latteToken.address, ownerAddress)).amount).to.eq(parseEther('100'))
        })
      })

      context('when there is a reward to harvest', () => {
        context('with energy', () => {
          it('should stake a token with harvest a reward + some extra energy', async () => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()

            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
            await nftTokenAsAlice.approve(booster.address, 1)
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
            await nftTokenAsAlice.approve(booster.address, 2)
            
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [latteToken.address]: true
              },
              boosterNftAllowance: {
                [latteToken.address]: {
                  [nftToken.address]: {
                    1: true,
                    2: true
                  }
                }
              },
              energyInfo: {
                [nftToken.address]: {
                  1: {
                    currentEnergy: parseEther('10').toString(),
                    boostBps: '1000'
                  }
                }
              },
              callerAllowance: {
                [booster.address]: true
              },
            })
            // stake for the first time, its' energy will be used to amplify
            await boosterAsAlice.stakeNFT(latteToken.address, nftToken.address, 1, signatureAsAlice)
            // should expect some storage changes in a booster
            expect((await booster.userStakingNFT(latteToken.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(latteToken.address, ownerAddress)).nftTokenId).to.eq(1)

            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [latteToken.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('10', 12).toString()
                }
              },
              userInfo: {
                [latteToken.address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [latteToken.address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(latteToken.address, booster.address)
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('100'))
            await latteToken.transfer(ownerAddress, parseEther('50'))
            await SimpleToken__factory.connect(latteToken.address, alice).approve(booster.address, parseEther('50'))

            await expect(boosterAsAlice.stake(latteToken.address, parseEther('50')))
            .to.emit(booster, 'MasterBaristaCall').withArgs(ownerAddress, parseEther('10'), latteToken.address, parseEther('10'), '0')
            .to.emit(booster, 'Stake').withArgs(ownerAddress, latteToken.address, parseEther('50'))

            // owner is expected have 10 rewards from 10% (based on boostBps) of 100 + 100 from rewards
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('110'))
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('1.5'))
            // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(latteToken.address, ownerAddress)).amount).to.eq(parseEther('60'))
          })
        })

        context('without energy', () => {
          it('should stake a token with harvest a reward', async () => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()

            // mint and approve nft
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
            await nftTokenAsAlice.approve(booster.address, 1)
            await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
            await nftTokenAsAlice.approve(booster.address, 2)
            
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [latteToken.address]: true
              },
              boosterNftAllowance: {
                [latteToken.address]: {
                  [nftToken.address]: {
                    1: true,
                    2: true
                  }
                }
              },
              energyInfo: {
                [nftToken.address]: {
                  1: {
                    currentEnergy: '0',
                    boostBps: '1000'
                  }
                }
              },
              callerAllowance: {
                [booster.address]: true
              },
            })
            // stake for the first time, its' energy will be used to amplify
            await boosterAsAlice.stakeNFT(latteToken.address, nftToken.address, 1, signatureAsAlice)
            // should expect some storage changes in a booster
            expect((await booster.userStakingNFT(latteToken.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
            expect((await booster.userStakingNFT(latteToken.address, ownerAddress)).nftTokenId).to.eq(1)

            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [latteToken.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: parseUnits('10', 12).toString()
                }
              },
              userInfo: {
                [latteToken.address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [latteToken.address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(latteToken.address, booster.address)
            // MOCK that master barista has enough LATTE
            await latteToken.transfer(beanBag.address, parseEther('100'))
            await latteToken.transfer(ownerAddress, parseEther('50'))

            await SimpleToken__factory.connect(latteToken.address, alice).approve(booster.address, parseEther('50'))
            await expect(boosterAsAlice.stake(latteToken.address, parseEther('50'))).to.emit(booster, 'Stake').withArgs(ownerAddress, latteToken.address, parseEther('50'))
            // owner is expected have 100 from rewards
            expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
            expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('0'))
            // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(latteToken.address, ownerAddress)).amount).to.eq(parseEther('60'))
          })
        })
      })
    })
  })

  describe('#unstake()', () => {
    context('when stake a disallowed token', () => {
      it('should revert', async() => {
        await expect(booster.unstake(stakingTokens[0].address, parseEther('10'))).to.revertedWith('Booster::isStakeTokenOK::bad stake token')
      })
    })

    context("when the pool ain't the same as a reward", () => {
      context('when a stake token is a wrap native', () => {
        context('when there is no reward to harvest', () => {
          it('should be able to unstake with a correct event emitted', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()
  
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [wbnb.address]: true
              },
            })
  
            await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [wbnb.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: '0'
                }
              },
              userInfo: {
                [wbnb.address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [wbnb.address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
            await wbnb.deposit({value: parseEther('10')})
            await wbnb.transfer(masterBarista.address, parseEther('10'))
            await expect(boosterAsAlice.unstake(wbnb.address, parseEther('10'))).to.emit(booster, 'Unstake').withArgs(ownerAddress, wbnb.address, parseEther('10'))
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq('0')
          })
          it('should be able to unstake with a correct return native amount', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()
  
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [wbnb.address]: true
              },
            })
  
            await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [wbnb.address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: '0'
                }
              },
              userInfo: {
                [wbnb.address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [wbnb.address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
            await wbnb.deposit({value: parseEther('10')})
            await wbnb.transfer(masterBarista.address, parseEther('10'))
            const aliceBalanceBefore = await alice.getBalance()
            const tx = await boosterAsAlice.unstake(wbnb.address, parseEther('10'))
            const receipt = await tx.wait()
            const aliceBalanceAfter = await alice.getBalance()
            const totalGas = receipt.gasUsed.mul(await alice.getGasPrice())
            expect(aliceBalanceAfter.sub(parseEther('10').sub(totalGas))).to.eq(aliceBalanceBefore)
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq('0')
          })
        })
  
        context('when there is a reward to harvest', () => {
          context('with energy', () => {
            it('should be able to unstake with reward + extra reward from energy with an event emitted', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
                boosterNftAllowance: {
                  [wbnb.address]: {
                    [nftToken.address]: {
                      1: true,
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: parseEther('10').toString(),
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(wbnb.address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
              // block #0
              const snapshotBlock = await latestBlockNumber()
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock.sub(5).toString(), // want to have a gap between last reward block and unstake block
                  }
                },
                userInfo: {
                  [wbnb.address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              // MOCK staked balance
              await wbnb.deposit({value: parseEther('10')})
              await wbnb.transfer(masterBarista.address, parseEther('10'))
              // block #4
              await expect(boosterAsAlice.unstake(wbnb.address, parseEther('10')))
              .to.emit(booster, 'MasterBaristaCall').withArgs(ownerAddress, parseEther('10'), wbnb.address, parseEther('10'), '0')
              .to.emit(booster, 'Unstake').withArgs(ownerAddress, wbnb.address, parseEther('10'))
              // owner is expected have 10 rewards from 10% (based on boostBps) of 100 + 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('110'))
              // latte token from 15% of 100 (from normal reward) + 15% of 10 (from extra reward) = 16.5
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('16.5'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq('0')
              expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            })

            it('should be able to unstake with reward + extra reward from energy with a correct balance returned' , async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
                boosterNftAllowance: {
                  [wbnb.address]: {
                    [nftToken.address]: {
                      1: true,
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: parseEther('10').toString(),
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(wbnb.address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
              // block #0
              const snapshotBlock = await latestBlockNumber()
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock.sub(5).toString(), // want to have a gap between last reward block and unstake block
                  }
                },
                userInfo: {
                  [wbnb.address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              // MOCK staked balance
              await wbnb.deposit({value: parseEther('10')})
              await wbnb.transfer(masterBarista.address, parseEther('10'))
              // block #4
              const aliceBalanceBefore = await alice.getBalance()
              const tx = await boosterAsAlice.unstake(wbnb.address, parseEther('10'))
              const receipt = await tx.wait()
              const aliceBalanceAfter = await alice.getBalance()
              const totalGas = receipt.gasUsed.mul(await alice.getGasPrice())
              expect(aliceBalanceAfter.sub(parseEther('10').sub(totalGas))).to.eq(aliceBalanceBefore)
              // owner is expected have 10 rewards from 10% (based on boostBps) of 100 + 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('110'))
              // latte token from 15% of 100 (from normal reward) + 15% of 10 (from extra reward) = 16.5
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('16.5'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq('0')
              expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            })
          })
  
          context('without energy', () => {
            it('should be able to unstake with reward with a correct event emitted', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
                boosterNftAllowance: {
                  [wbnb.address]: {
                    [nftToken.address]: {
                      1: true,
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: '0',
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(wbnb.address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
              // block #0
              const snapshotBlock = await latestBlockNumber()
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock.sub(5).toString(), // want to have a gap between last reward block and unstake block
                  }
                },
                userInfo: {
                  [wbnb.address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              // MOCK staked balance
              await wbnb.deposit({value: parseEther('10')})
              await wbnb.transfer(masterBarista.address, parseEther('10'))
              // block #4
              await expect(boosterAsAlice.unstake(wbnb.address, parseEther('10')))
              .to.emit(booster, 'Unstake').withArgs(ownerAddress, wbnb.address, parseEther('10'))
              // owner is expected have 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
              // latte token from 15% of 100 (from normal reward)
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('15'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq('0')
              expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            })

            it('should be able to unstake with reward with a correct balance returned', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [wbnb.address]: true
                },
                boosterNftAllowance: {
                  [wbnb.address]: {
                    [nftToken.address]: {
                      1: true,
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: '0',
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(wbnb.address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(wbnb.address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(wbnb.address, '1000')
  
              // block #0
              const snapshotBlock = await latestBlockNumber()
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
                poolInfo: {
                  [wbnb.address]: {
                    lastRewardBlock: snapshotBlock.sub(5).toString(), // want to have a gap between last reward block and unstake block
                  }
                },
                userInfo: {
                  [wbnb.address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [wbnb.address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(wbnb.address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              // MOCK staked balance
              await wbnb.deposit({value: parseEther('10')})
              await wbnb.transfer(masterBarista.address, parseEther('10'))
              // block #4
              const aliceBalanceBefore = await alice.getBalance()
              const tx = await boosterAsAlice.unstake(wbnb.address, parseEther('10'))
              const receipt = await tx.wait()
              const aliceBalanceAfter = await alice.getBalance()
              const totalGas = receipt.gasUsed.mul(await alice.getGasPrice())
              expect(aliceBalanceAfter.sub(parseEther('10').sub(totalGas))).to.eq(aliceBalanceBefore)
              // owner is expected have 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
              // latte token from 15% of 100 (from normal reward)
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('15'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(wbnb.address, ownerAddress)).amount).to.eq('0')
              expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            })
          })
        })
      })

      context('when a stake token is not a wrap native', () => {
        context('when there is no reward to harvest', () => {
          it('should be able to unstake', async() => {
            // mock master barista reward for stakingToken[0]
            const ownerAddress = await alice.getAddress()
            const snapshotBlock = await latestBlockNumber()
  
            // MOCK a booster config storage
            await boosterConfig.smodify.put({
              stakeTokenAllowance: {
                [stakingTokens[0].address]: true
              },
            })
  
            await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
            // MOCK master barista storages
            await masterBarista.smodify.put({
              poolInfo: {
                [stakingTokens[0].address]: {
                  lastRewardBlock: snapshotBlock,
                  accLattePerShare: '0'
                }
              },
              userInfo: {
                [stakingTokens[0].address]: {
                  [ownerAddress]: {
                    amount: parseEther('10').toString(),
                    fundedBy: booster.address
                  }
                }
              },
              stakeTokenCallerAllowancePool: {
                [stakingTokens[0].address]: true
              },
            })
            await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
            
            // Mint some staking token to a master barista (pretend that this is a staked token)
            await stakingTokens[0].mint(masterBarista.address, parseEther('10'))
  
            await expect(boosterAsAlice.unstake(stakingTokens[0].address, parseEther('10'))).to.emit(booster, 'Unstake').withArgs(ownerAddress, stakingTokens[0].address, parseEther('10'))
            expect(await stakingTokens[0].balanceOf(ownerAddress)).to.eq(parseEther('10'))
            expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(stakingTokens[0].address, ownerAddress)).amount).to.eq('0')
          })
        })
  
        context('when there is a reward to harvest', () => {
          context('with energy', () => {
            it('should be able to unstake with reward + extra reward from energy', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [stakingTokens[0].address]: true
                },
                boosterNftAllowance: {
                  [stakingTokens[0].address]: {
                    [nftToken.address]: {
                      1: true,
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: parseEther('10').toString(),
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
              // block #0
              const snapshotBlock = await latestBlockNumber()
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
                poolInfo: {
                  [stakingTokens[0].address]: {
                    lastRewardBlock: snapshotBlock.sub(6).toString(), // want to have a gap between last reward block and unstake block
                  }
                },
                userInfo: {
                  [stakingTokens[0].address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [stakingTokens[0].address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              await stakingTokens[0].mint(masterBarista.address, parseEther('10'))
              // block #4
              await expect(boosterAsAlice.unstake(stakingTokens[0].address, parseEther('10')))
              .to.emit(booster, 'MasterBaristaCall').withArgs(ownerAddress, parseEther('10'), stakingTokens[0].address, parseEther('10'), '0')
              .to.emit(booster, 'Unstake').withArgs(ownerAddress, stakingTokens[0].address, parseEther('10'))
  
              expect(await stakingTokens[0].balanceOf(ownerAddress)).to.eq(parseEther('10'))
              // owner is expected have 10 rewards from 10% (based on boostBps) of 100 + 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('110'))
              // latte token from 15% of 100 (from normal reward) + 15% of 10 (from extra reward) = 16.5
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('16.5'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(stakingTokens[0].address, ownerAddress)).amount).to.eq('0')
              expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            })
          })
  
          context('without energy', () => {
            it('should be able to unstake with reward', async() => {
              // mock master barista reward for stakingToken[0]
              const ownerAddress = await alice.getAddress()
  
              // mint and approve nft
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 1)
              await nftTokenAsAlice.approve(booster.address, 1)
              await ((nftToken as unknown) as MockERC721).mint(ownerAddress, 2)
              await nftTokenAsAlice.approve(booster.address, 2)
              
              // MOCK a booster config storage
              await boosterConfig.smodify.put({
                stakeTokenAllowance: {
                  [stakingTokens[0].address]: true
                },
                boosterNftAllowance: {
                  [stakingTokens[0].address]: {
                    [nftToken.address]: {
                      1: true,
                    }
                  }
                },
                energyInfo: {
                  [nftToken.address]: {
                    1: {
                      currentEnergy: '0',
                      boostBps: '1000'
                    }
                  }
                },
                callerAllowance: {
                  [booster.address]: true
                },
              })
              // stake for the first time, its' energy will be used to amplify
              await boosterAsAlice.stakeNFT(stakingTokens[0].address, nftToken.address, 1, signatureAsAlice)
              // should expect some storage changes in a booster
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftAddress.toLowerCase()).to.eq(nftToken.address.toLowerCase())
              expect((await booster.userStakingNFT(stakingTokens[0].address, ownerAddress)).nftTokenId).to.eq(1)
  
              await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
  
              // block #0
              const snapshotBlock = await latestBlockNumber()
  
              // MOCK master barista storages
              await masterBarista.smodify.put({
                totalAllocPoint: 1000, // mock that there is only a single pool getting ALL rewards
                poolInfo: {
                  [stakingTokens[0].address]: {
                    lastRewardBlock: snapshotBlock.sub(6).toString(), // want to have a gap between last reward block and unstake block
                  }
                },
                userInfo: {
                  [stakingTokens[0].address]: {
                    [ownerAddress]: {
                      amount: parseEther('10').toString(),
                      fundedBy: booster.address
                    }
                  }
                },
                stakeTokenCallerAllowancePool: {
                  [stakingTokens[0].address]: true
                },
              })
              await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
              // MOCK that master barista has enough LATTE
              await latteToken.transfer(beanBag.address, parseEther('100'))
              await stakingTokens[0].mint(masterBarista.address, parseEther('10'))
              // block #4
              await expect(boosterAsAlice.unstake(stakingTokens[0].address, parseEther('10')))
              .to.emit(booster, 'Unstake').withArgs(ownerAddress, stakingTokens[0].address, parseEther('10'))
  
              expect(await stakingTokens[0].balanceOf(ownerAddress)).to.eq(parseEther('10'))
              // owner is expected have 100 from rewards
              expect(await latteToken.balanceOf(ownerAddress)).to.eq(parseEther('100'))
              // latte token from 15% of 100 (from normal reward)
              expect(await latteToken.balanceOf(await dev.getAddress())).to.eq(parseEther('15'))
              // expect balance of the owner to be 100 (from stake) + 10 from previous staking balance
              expect((await ((masterBarista as unknown) as MockMasterBarista).userInfo(stakingTokens[0].address, ownerAddress)).amount).to.eq('0')
              expect((await ((boosterConfig as unknown) as BoosterConfig).energyInfo(nftToken.address, 1)).currentEnergy).to.eq(0)
            })
          })
        })
      })
    })
  })

  describe('#emergencyWithdraw()', () => {
    context('when stake a disallowed token', () => {
      it('should revert', async() => {
        await expect(booster.emergencyWithdraw(stakingTokens[0].address)).to.revertedWith('Booster::isStakeTokenOK::bad stake token')
      })
    })
    it('should ble able to withdraw the staking token considerless the reward', async () => {
      // mock master barista reward for stakingToken[0]
      const ownerAddress = await alice.getAddress()
      const snapshotBlock = await latestBlockNumber()

      // MOCK a booster config storage
      await boosterConfig.smodify.put({
        stakeTokenAllowance: {
          [stakingTokens[0].address]: true
        },
        boosterNftAllowance: {
          [stakingTokens[0].address]: {
            [nftToken.address]: {
              1: true,
            }
          }
        },
        energyInfo: {
          [nftToken.address]: {
            1: {
              currentEnergy: parseEther('10').toString(),
              boostBps: '1000'
            }
          }
        },
        callerAllowance: {
          [booster.address]: true
        },
      })

      await ((masterBarista as unknown) as MockMasterBarista).addPool(stakingTokens[0].address, '1000')
      // MOCK master barista storages
      await masterBarista.smodify.put({
        poolInfo: {
          [stakingTokens[0].address]: {
            lastRewardBlock: snapshotBlock,
            accLattePerShare: parseUnits('10', 12).toString()
          }
        },
        userInfo: {
          [stakingTokens[0].address]: {
            [ownerAddress]: {
              amount: parseEther('10').toString(),
              fundedBy: booster.address
            }
          }
        },
        stakeTokenCallerAllowancePool: {
          [stakingTokens[0].address]: true
        },
      })
      await ((masterBarista as unknown) as MockMasterBarista).addStakeTokenCallerContract(stakingTokens[0].address, booster.address)
      // MOCK that master barista has enough LATTE
      await latteToken.transfer(beanBag.address, parseEther('100'))
      await stakingTokens[0].mint(masterBarista.address, parseEther('10'))

      await expect(boosterAsAlice.emergencyWithdraw(stakingTokens[0].address)).to.emit(booster, 'EmergencyWithdraw').withArgs(ownerAddress, stakingTokens[0].address, parseEther('10'))
      expect(await(stakingTokens[0].balanceOf(ownerAddress))).to.eq(parseEther('10'))
    })
  })
})