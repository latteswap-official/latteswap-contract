import { ethers } from 'hardhat'
import { Signer, BigNumber, Wallet, utils } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { LatteSwapFactory, LatteSwapFactory__factory, LatteSwapRouter__factory, LatteSwapRouter, LatteSwapPair__factory, SimpleToken, SimpleToken__factory, WBNB, WBNB__factory, LatteSwapPair } from '../../typechain'
import { AddressZero, MaxUint256, Zero } from '@ethersproject/constants';
import { getApprovalDigest, sortsBefore } from '../helpers';
import { before } from 'mocha';

chai.use(solidity);
const { expect } = chai;

describe('LatteSwapRouter', () => {
  const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3)

  // LatteSwap instances
  let latteSwapFactory: LatteSwapFactory
  let latteSwapRouter: LatteSwapRouter
  let nonNativePair: LatteSwapPair
  let nativePair: LatteSwapPair

  // Token instances
  let wbnb: WBNB
  let token0: SimpleToken
  let token1: SimpleToken
  
  // Accounts
  let deployer: Wallet;
  let funder: Signer;
  let alice: Wallet;

  // Binding
  let latteSwapRouterAsAlice: LatteSwapRouter
  let nonNativePairAsAlice: LatteSwapPair
  let nativePairAsAlice: LatteSwapPair

  before(async() => {
    ;[funder] = await ethers.getSigners()
    // funding a mocked wallet
    alice = ethers.Wallet.createRandom().connect(ethers.provider)
    let sendtx = await funder.sendTransaction({
      to: alice.address,
      value: utils.parseEther('1000')
    })
    await sendtx.wait()

    deployer = ethers.Wallet.createRandom().connect(ethers.provider)
    sendtx = await funder.sendTransaction({
      to: deployer.address,
      value: utils.parseEther('1000')
    })

    await sendtx.wait()
  })

  beforeEach(async() => {
    // contracts creation
    const WBNB = (await ethers.getContractFactory("WBNB", deployer)) as WBNB__factory
    wbnb = await WBNB.deploy()

    const LatteSwapFactory = (await ethers.getContractFactory("LatteSwapFactory", deployer)) as LatteSwapFactory__factory
    latteSwapFactory = await LatteSwapFactory.deploy(await deployer.getAddress())

    const LatteSwapRouter = (await ethers.getContractFactory("LatteSwapRouter", deployer)) as LatteSwapRouter__factory
    latteSwapRouter = await LatteSwapRouter.deploy(latteSwapFactory.address, wbnb.address)

    const SimpleToken = (await ethers.getContractFactory("SimpleToken", deployer)) as SimpleToken__factory
    token0 = await SimpleToken.deploy("TOKEN0", "TOKEN0")
    await token0.mint(await deployer.getAddress(), ethers.utils.parseEther('8888888888'))

    token1 = await SimpleToken.deploy("TOKEN1", "TOKEN1")
    await token1.mint(await deployer.getAddress(), ethers.utils.parseEther('999999999'))

    await latteSwapFactory.createPair(token0.address, token1.address)
    const nonNativePairAddress = await latteSwapFactory.getPair(token0.address, token1.address)
    nonNativePair = LatteSwapPair__factory.connect(nonNativePairAddress, deployer) as LatteSwapPair

    await latteSwapFactory.createPair(token0.address, wbnb.address)
    const nativePairAddress = await latteSwapFactory.getPair(token0.address, wbnb.address)
    nativePair = LatteSwapPair__factory.connect(nativePairAddress, deployer) as LatteSwapPair

    latteSwapRouterAsAlice = LatteSwapRouter__factory.connect(latteSwapRouter.address, alice) as LatteSwapRouter
    nonNativePairAsAlice = LatteSwapPair__factory.connect(nonNativePairAddress, alice) as LatteSwapPair
    nativePairAsAlice = LatteSwapPair__factory.connect(nativePairAddress, alice) as LatteSwapPair

  })

  describe('initialized states', () => {
    it('should contain the correct factory address', async() => {
      expect((await latteSwapRouter.factory()).toLowerCase()).to.be.eq(latteSwapFactory.address.toLowerCase())
    })

    it('should contain the correct wbnb address', async() => {
      expect((await latteSwapRouter.WBNB()).toLowerCase()).to.be.eq(wbnb.address.toLowerCase())
    })
  })

  describe('#addLiquidity()', () => {
    it('should add an initial liquidity', async () => {
        const [sortedToken0, sortedToken1] =  sortsBefore(token0.address, token1.address) ? [token0, token1] : [token1, token0]
        const token0Amount = ethers.utils.parseEther('1')
        const token1Amount = ethers.utils.parseEther('4')
        const aliceAddress = await alice.getAddress()
        const deployerAddress = await deployer.getAddress()
        // sqrt(1*4) - MINIMUM_LIQUIDITY
        // 2*10^18 - 1000
        const expectedLiquidity = ethers.utils.parseEther('2')
        // approve tokens
        await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
        await sortedToken1.approve(latteSwapRouter.address, MaxUint256)

        // add liquidity
        await expect(
            latteSwapRouter.addLiquidity(
            sortedToken0.address,
            sortedToken1.address,
            token0Amount,
            token1Amount,
            0,
            0,
            aliceAddress,
            MaxUint256,
          )
        )
          .to.emit(sortedToken0, 'Transfer')
          .withArgs(deployerAddress, nonNativePair.address, token0Amount)
          .to.emit(sortedToken1, 'Transfer')
          .withArgs(deployerAddress, nonNativePair.address, token1Amount)
          .to.emit(nonNativePair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(nonNativePair, 'Transfer')
          .withArgs(AddressZero, aliceAddress, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(nonNativePair, 'Sync')
          .withArgs(token0Amount, token1Amount)
          .to.emit(nonNativePair, 'Mint')
          .withArgs(latteSwapRouter.address, token0Amount, token1Amount)

        expect(await nonNativePair.balanceOf(aliceAddress)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    })
  })

  describe('#addLiquidityETH()', () => {
    it('should add an initial liquidity', async () => {
        const [sortedToken0, sortedToken1] =  sortsBefore(token0.address, wbnb.address) ? [token0, wbnb] : [wbnb, token0]
        const token0Amount = ethers.utils.parseEther('1')
        const bnbAmount = ethers.utils.parseEther('4')
        const [sortedToken0Amount, sortedToken1Amount] = sortsBefore(token0.address, wbnb.address) ? [token0Amount, bnbAmount] : [bnbAmount, token0Amount]
        const aliceAddress = await alice.getAddress()
        // sqrt(1*4) - MINIMUM_LIQUIDITY
        // 2*10^18 - 1000
        const expectedLiquidity = ethers.utils.parseEther('2')
        // approve tokens
        await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
        await sortedToken1.approve(latteSwapRouter.address, MaxUint256)

        // add liquidity
        await expect(
            latteSwapRouter.addLiquidityETH(
            token0.address,
            token0Amount,
            token0Amount,
            bnbAmount,
            aliceAddress,
            MaxUint256,
            {
              value: bnbAmount,
            }
          )
        )
          .to.emit(nativePair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(nativePair, 'Transfer')
          .withArgs(AddressZero, aliceAddress, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(nativePair, 'Sync')
          .withArgs(sortedToken0Amount, sortedToken1Amount)
          .to.emit(nativePair, 'Mint')
          .withArgs(latteSwapRouter.address, sortedToken0Amount, sortedToken1Amount)

        expect(await nativePair.balanceOf(aliceAddress)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    })
  })

  describe('#removeLiquidity()', () => {
    it('should remove an added liquidity', async () => {
      const [sortedToken0, sortedToken1] =  sortsBefore(token0.address, token1.address) ? [token0, token1] : [token1, token0]
      const token0Amount = ethers.utils.parseEther('1')
      const token1Amount = ethers.utils.parseEther('4')
      const aliceAddress = await alice.getAddress()
      // sqrt(1*4) - MINIMUM_LIQUIDITY
      // 2*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther('2')
      // approve tokens
      await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken1.approve(latteSwapRouter.address, MaxUint256)

      // deployer add their initial liquidity and send to alice
      // thus, her liquidity will be // 2*10^18 - 1000 = 2 BNB - 1000 = expectedLiquidity.sub(MINIMUM_LIQUIDITY)
      await latteSwapRouter.addLiquidity(
        sortedToken0.address,
        sortedToken1.address,
        token0Amount,
        token1Amount,
        0,
        0,
        aliceAddress,
        MaxUint256,
      )

      // alice then remove her liquidity
      // liquidity / totalSupply = 1.999999999999999000 / 2.000000000000000000 =  0.9999999999999995
      // amount0 back = 0.9999999999999995 * 1 = 0.999999999999999500
      // thus, it's 500 WEI lost
      // amount1 back = 0.9999999999999995 * 4 = 3.999999999999998000
      // thus it's 2000 WEI lost
      await nonNativePairAsAlice.approve(latteSwapRouter.address, MaxUint256)
      await expect(
        latteSwapRouterAsAlice.removeLiquidity(
          token0.address,
          token1.address,
          expectedLiquidity.sub(MINIMUM_LIQUIDITY),
          0,
          0,
          aliceAddress,
          MaxUint256,
        )
      )
        .to.emit(nonNativePairAsAlice, 'Transfer')
        .withArgs(aliceAddress, nonNativePairAsAlice.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(nonNativePairAsAlice, 'Transfer')
        .withArgs(nonNativePairAsAlice.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(sortedToken0, 'Transfer')
        .withArgs(nonNativePairAsAlice.address, aliceAddress, token0Amount.sub(500))
        .to.emit(sortedToken1, 'Transfer')
        .withArgs(nonNativePairAsAlice.address, aliceAddress, token1Amount.sub(2000))
        .to.emit(nonNativePairAsAlice, 'Sync')
        .withArgs(500, 2000)
        .to.emit(nonNativePairAsAlice, 'Burn')
        .withArgs(latteSwapRouter.address, token0Amount.sub(500), token1Amount.sub(2000), aliceAddress)
      
      expect(await nonNativePairAsAlice.balanceOf(aliceAddress)).to.eq(0)
      expect(await sortedToken0.balanceOf(aliceAddress)).to.eq(token0Amount.sub(500))
      expect(await sortedToken1.balanceOf(aliceAddress)).to.eq(token1Amount.sub(2000))
    })
  })

  describe('#removeLiquidityETH()', () => {
    it('should remove an added liquidity', async () => {
      const [sortedToken0, sortedToken1] =  sortsBefore(token0.address, wbnb.address) ? [token0, wbnb] : [wbnb, token0]
      const token0Amount = ethers.utils.parseEther('1')
      const bnbAmount = ethers.utils.parseEther('4')
      const [expectedSortedToken0Amount, expectedSortedToken1Amount] = sortsBefore(token0.address, wbnb.address) ? [token0Amount.sub(500), bnbAmount.sub(2000)] : [bnbAmount.sub(2000), token0Amount.sub(500)]
      const aliceAddress = await alice.getAddress()
      const deployerAddress = await deployer.getAddress()
      // sqrt(1*4) - MINIMUM_LIQUIDITY
      // 2*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther('2')
      // approve tokens
      await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken1.approve(latteSwapRouter.address, MaxUint256)

      // deployer add liquidity for the first time
      // thus, her liquidity will be // 2*10^18 - 1000 = 2 BNB - 1000 = expectedLiquidity.sub(MINIMUM_LIQUIDITY)
      await latteSwapRouter.addLiquidityETH(
        token0.address,
        token0Amount,
        token0Amount,
        bnbAmount,
        deployerAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      )

      // deployer then liquidate their liquidity and send to alice (use deployer to do things so that no gasFee is not calculated)
      // liquidity / totalSupply = 1.999999999999999000 / 2.000000000000000000 =  0.9999999999999995
      // amount0 back = 0.9999999999999995 * 1 = 0.999999999999999500
      // thus, it's 500 WEI lost
      // wbnb back = 0.9999999999999995 * 4 = 3.999999999999998000
      // thus it's 2000 WEI lost
      await nativePair.approve(latteSwapRouter.address, MaxUint256)
      const aliceNativeBalanceBefore = await ethers.provider.getBalance(aliceAddress)
      await expect(
        latteSwapRouter.removeLiquidityETH(
          token0.address,
          expectedLiquidity.sub(MINIMUM_LIQUIDITY),
          0,
          0,
          aliceAddress,
          MaxUint256,
        )
      )
        .to.emit(nativePair, 'Transfer')
        .withArgs(deployerAddress, nativePair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(nativePair, 'Transfer')
        .withArgs(nativePair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(wbnb, 'Transfer')
        .withArgs(nativePair.address, latteSwapRouter.address, bnbAmount.sub(2000))
        .to.emit(token0, 'Transfer')
        .withArgs(nativePair.address, latteSwapRouter.address, token0Amount.sub(500))
        .to.emit(token0, 'Transfer')
        .withArgs(latteSwapRouter.address, aliceAddress, token0Amount.sub(500))
        .to.emit(nativePair, 'Sync')
        .withArgs(
          sortedToken0.address.toLowerCase() === token0.address.toLowerCase() ? 500 : 2000,
          sortedToken0.address.toLowerCase() === token0.address.toLowerCase() ? 2000 : 500
        )
        .to.emit(nativePair, 'Burn')
        .withArgs(
          latteSwapRouter.address,
          expectedSortedToken0Amount,
          expectedSortedToken1Amount,
          latteSwapRouter.address
        )
        const aliceNativeBalanceAfter = await ethers.provider.getBalance(aliceAddress)
        expect(await nativePair.balanceOf(aliceAddress)).to.eq(0)
        expect(await token0.balanceOf(aliceAddress)).to.eq(token0Amount.sub(500))
        expect(aliceNativeBalanceAfter.sub(aliceNativeBalanceBefore)).to.eq(bnbAmount.sub(2000))
    })
  })

  describe('#removeLiquidityWithPermit()', () => {
    it('should remove liquidity without any approval', async () => {
      const [sortedToken0, sortedToken1] =  sortsBefore(token0.address, token1.address) ? [token0, token1] : [token1, token0]
      const token0Amount = ethers.utils.parseEther('1')
      const token1Amount = ethers.utils.parseEther('4')
      const aliceAddress = await alice.getAddress()
      // sqrt(1*4) - MINIMUM_LIQUIDITY
      // 2*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther('2')
      // approve tokens
      await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken1.approve(latteSwapRouter.address, MaxUint256)

      // deployer add their liquidity and send their liquidity to alice
      // thus, her liquidity will be // 2*10^18 - 1000 = 2 BNB - 1000 = expectedLiquidity.sub(MINIMUM_LIQUIDITY)
      await latteSwapRouter.addLiquidity(
        sortedToken0.address,
        sortedToken1.address,
        token0Amount,
        token1Amount,
        0,
        0,
        aliceAddress,
        MaxUint256,
      )

      const nonce = await nonNativePair.nonces(aliceAddress)
      const digest = await getApprovalDigest(
        nonNativePair,
        { owner: aliceAddress, spender: latteSwapRouter.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY)},
        nonce,
        MaxUint256,
        await alice.getChainId()
      )
      const signingKey = new ethers.utils.SigningKey(alice.privateKey)
      const {v, r, s} = signingKey.signDigest(digest)
      // now alice will remove a liquidity without pre-approval, since alice sent her signature (v r s elliptic curve format)
      await expect(latteSwapRouterAsAlice.removeLiquidityWithPermit(
        token0.address,
        token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        aliceAddress,
        MaxUint256,
        false,
        v,
        r,
        s,
      )).to.emit(nonNativePairAsAlice, 'Transfer')
      .withArgs(aliceAddress, nonNativePairAsAlice.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(nonNativePairAsAlice, 'Transfer')
      .withArgs(nonNativePairAsAlice.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(sortedToken0, 'Transfer')
      .withArgs(nonNativePairAsAlice.address, aliceAddress, token0Amount.sub(500))
      .to.emit(sortedToken1, 'Transfer')
      .withArgs(nonNativePairAsAlice.address, aliceAddress, token1Amount.sub(2000))
      .to.emit(nonNativePairAsAlice, 'Sync')
      .withArgs(500, 2000)
      .to.emit(nonNativePairAsAlice, 'Burn')
      .withArgs(latteSwapRouter.address, token0Amount.sub(500), token1Amount.sub(2000), aliceAddress)
    
      expect(await nonNativePairAsAlice.balanceOf(aliceAddress)).to.eq(0)
      expect(await sortedToken0.balanceOf(aliceAddress)).to.eq(token0Amount.sub(500))
      expect(await sortedToken1.balanceOf(aliceAddress)).to.eq(token1Amount.sub(2000))
    })
  })

  describe('#removeLiquidityETHWithPermit()', () => {
    it('should remove liquidity without any approval', async () => {
      const [sortedToken0, sortedToken1] =  sortsBefore(token0.address, wbnb.address) ? [token0, wbnb] : [wbnb, token0]
      const token0Amount = ethers.utils.parseEther('1')
      const bnbAmount = ethers.utils.parseEther('4')
      const [expectedSortedToken0Amount, expectedSortedToken1Amount] = sortsBefore(token0.address, wbnb.address) ? [token0Amount.sub(500), bnbAmount.sub(2000)] : [bnbAmount.sub(2000), token0Amount.sub(500)]
      const aliceAddress = await alice.getAddress()
      const deployerAddress = await deployer.getAddress()
      // sqrt(1*4) - MINIMUM_LIQUIDITY
      // 2*10^18 - 1000
      const expectedLiquidity = ethers.utils.parseEther('2')
      // approve tokens
      await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken1.approve(latteSwapRouter.address, MaxUint256)
      // deployer add liquidity for the first time
      // thus, her liquidity will be // 2*10^18 - 1000 = 2 BNB - 1000 = expectedLiquidity.sub(MINIMUM_LIQUIDITY)
      await latteSwapRouter.addLiquidityETH(
        token0.address,
        token0Amount,
        token0Amount,
        bnbAmount,
        deployerAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      )
      // deployer then liquidate their liquidity and send to alice
      // liquidity / totalSupply = 1.999999999999999000 / 2.000000000000000000 =  0.9999999999999995
      // amount0 back = 0.9999999999999995 * 1 = 0.999999999999999500
      // thus, it's 500 WEI lost
      // wbnb back = 0.9999999999999995 * 4 = 3.999999999999998000
      // thus it's 2000 WEI lost

      const nonce = await nativePair.nonces(deployerAddress)
      const digest = await getApprovalDigest(
        nativePair,
        { owner: deployerAddress, spender: latteSwapRouter.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY)},
        nonce,
        MaxUint256,
        await deployer.getChainId()
      )
      const signingKey = new ethers.utils.SigningKey(deployer.privateKey)
      const {v, r, s} = signingKey.signDigest(digest)
      const aliceNativeBalanceBefore = await ethers.provider.getBalance(aliceAddress)
      // now deployer will remove a liquidity without pre-approval and send to alice address
      await expect(latteSwapRouter.removeLiquidityETHWithPermit(
        token0.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        aliceAddress,
        MaxUint256,
        false,
        v,
        r,
        s,
      )).to.emit(nativePair, 'Transfer')
      .withArgs(deployerAddress, nativePair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(nativePair, 'Transfer')
      .withArgs(nativePair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(wbnb, 'Transfer')
      .withArgs(nativePair.address, latteSwapRouter.address, bnbAmount.sub(2000))
      .to.emit(token0, 'Transfer')
      .withArgs(nativePair.address, latteSwapRouter.address, token0Amount.sub(500))
      .to.emit(token0, 'Transfer')
      .withArgs(latteSwapRouter.address, aliceAddress, token0Amount.sub(500))
      .to.emit(nativePair, 'Sync')
      .withArgs(
        sortedToken0.address.toLowerCase() === token0.address.toLowerCase() ? 500 : 2000,
        sortedToken0.address.toLowerCase() === token0.address.toLowerCase() ? 2000 : 500
      )
      .to.emit(nativePair, 'Burn')
      .withArgs(
        latteSwapRouter.address,
        expectedSortedToken0Amount,
        expectedSortedToken1Amount,
        latteSwapRouter.address
      )
      const aliceNativeBalanceAfter = await ethers.provider.getBalance(aliceAddress)
      expect(await nativePair.balanceOf(aliceAddress)).to.eq(0)
      expect(await token0.balanceOf(aliceAddress)).to.eq(token0Amount.sub(500))
      expect(aliceNativeBalanceAfter.sub(aliceNativeBalanceBefore)).to.eq(bnbAmount.sub(2000))
    })
  })

  describe("#swapExactTokensForTokens()", () => {
    const token0Amount = ethers.utils.parseEther('5')
    const token1Amount = ethers.utils.parseEther('10')
    const swapAmount = ethers.utils.parseEther('1')
    // getAmountOut =  (1 * 0.9975 * 10) / (5 + 1 * 0.9975) = 1.663192997082117548
    const expectedOutputAmount = BigNumber.from('1663192997082117548')
    let aliceAddress: string, sortedToken0: SimpleToken, sortedToken1: SimpleToken, sortedToken0AsAlice: SimpleToken

    beforeEach(async () => {
      ;[sortedToken0, sortedToken1] =  sortsBefore(token0.address, token1.address) ? [token0, token1] : [token1, token0]
      sortedToken0AsAlice = SimpleToken__factory.connect(sortedToken0.address, alice) as SimpleToken
      aliceAddress = await alice.getAddress()
      // approve tokens
      await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken1.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken0.mint(aliceAddress, ethers.utils.parseEther('10000'))
      await sortedToken0AsAlice.approve(latteSwapRouter.address, MaxUint256)

      // add initial liquidity
      await latteSwapRouter.addLiquidity(
        sortedToken0.address,
        sortedToken1.address,
        token0Amount,
        token1Amount,
        0,
        0,
        aliceAddress,
        MaxUint256,
      )
    })

    it('should emit expected event', async () => {
      await expect(latteSwapRouterAsAlice.swapExactTokensForTokens(
        swapAmount,
        0,
        [sortedToken0.address, sortedToken1.address],
        aliceAddress,
        MaxUint256,
      )).to.emit(sortedToken0, 'Transfer')
      .withArgs(aliceAddress, nonNativePair.address, swapAmount)
      .to.emit(sortedToken1, 'Transfer')
      .withArgs(nonNativePair.address, aliceAddress, expectedOutputAmount)
      .to.emit(nonNativePair, 'Sync')
      .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
      .to.emit(nonNativePair, 'Swap')
      .withArgs(latteSwapRouter.address, swapAmount, 0, 0, expectedOutputAmount, aliceAddress)
    })

    it('should swap a correct amount based on getAmountOut', async() => {
      const balanceBefore = await sortedToken1.balanceOf(aliceAddress)
      await latteSwapRouterAsAlice.swapExactTokensForTokens(
        swapAmount,
        0,
        [sortedToken0.address, sortedToken1.address],
        aliceAddress,
        MaxUint256,
      )
      
      const balanceAfter = await sortedToken1.balanceOf(aliceAddress)
      expect(balanceAfter.sub(balanceBefore)).to.eq(expectedOutputAmount)
    })
  })

  describe("#swapTokensForExactTokens()", () => {
    const token0Amount = ethers.utils.parseEther('5')
    const token1Amount = ethers.utils.parseEther('10')
    const outputAmount = ethers.utils.parseEther('1')
    // getAmountIn =  ((5 * 1) / ((10 - 1) * 0.9975)) + 1 * 1*10 ^-18 = 556947925368978001
    const expectedSwapAmount = BigNumber.from('556947925368978001')
    let aliceAddress: string, sortedToken0: SimpleToken, sortedToken1: SimpleToken, sortedToken0AsAlice: SimpleToken

    beforeEach(async () => {
      ;[sortedToken0, sortedToken1] =  sortsBefore(token0.address, token1.address) ? [token0, token1] : [token1, token0]
      sortedToken0AsAlice = SimpleToken__factory.connect(sortedToken0.address, alice) as SimpleToken
      aliceAddress = await alice.getAddress()
      // approve tokens
      await sortedToken0.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken1.approve(latteSwapRouter.address, MaxUint256)
      await sortedToken0.mint(aliceAddress, ethers.utils.parseEther('10000'))
      await sortedToken0AsAlice.approve(latteSwapRouter.address, MaxUint256)

      // add initial liquidity
      await latteSwapRouter.addLiquidity(
        sortedToken0.address,
        sortedToken1.address,
        token0Amount,
        token1Amount,
        0,
        0,
        aliceAddress,
        MaxUint256,
      )
    })
    it('should emit expected event', async () => {
      await expect(latteSwapRouterAsAlice.swapTokensForExactTokens(
        outputAmount,
        MaxUint256,
        [sortedToken0.address, sortedToken1.address],
        aliceAddress,
        MaxUint256,
      )).to.emit(sortedToken0, 'Transfer')
      .withArgs(aliceAddress, nonNativePair.address, expectedSwapAmount)
      .to.emit(sortedToken1, 'Transfer')
      .withArgs(nonNativePair.address, aliceAddress, outputAmount)
      .to.emit(nonNativePair, 'Sync')
      .withArgs(token0Amount.add(expectedSwapAmount), token1Amount.sub(outputAmount))
      .to.emit(nonNativePair, 'Swap')
      .withArgs(latteSwapRouter.address, expectedSwapAmount, 0, 0, outputAmount, aliceAddress)
    })

    it('should swap a correct amount based on getAmountIn', async() => {
      const balanceBefore = await sortedToken0.balanceOf(aliceAddress)
      await latteSwapRouterAsAlice.swapTokensForExactTokens(
        outputAmount,
        MaxUint256,
        [sortedToken0.address, sortedToken1.address],
        aliceAddress,
        MaxUint256,
      )

      const balanceAfter = await sortedToken0.balanceOf(aliceAddress)
      expect(balanceBefore.sub(balanceAfter)).to.eq(expectedSwapAmount)
    })
  })

  describe("#swapExactETHForTokens()", () => {
    const bnbAmount = ethers.utils.parseEther('5')
    const token0Amount = ethers.utils.parseEther('10')
    const swapAmount = ethers.utils.parseEther('1')
    // getAmountOut =  (1 * 0.9975 * 10) / (5 + 1 * 0.9975) = 1.663192997082117548
    const expectedOutputAmount = BigNumber.from('1663192997082117548')
    let aliceAddress: string, wbnbAsAlice: WBNB, nativePairToken0: string

    beforeEach(async() => {
      wbnbAsAlice = WBNB__factory.connect(wbnb.address, alice) as WBNB
      aliceAddress = await alice.getAddress()
      // approve tokens
      await token0.approve(latteSwapRouter.address, MaxUint256)
      await token0.mint(aliceAddress, ethers.utils.parseEther('10000'))
      await wbnbAsAlice.approve(latteSwapRouter.address, MaxUint256)
      nativePairToken0 = await nativePair.token0()

      // add initial liquidity ETH
      await latteSwapRouter.addLiquidityETH(
        token0.address,
        token0Amount,
        token0Amount,
        bnbAmount,
        aliceAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      )
    })
    it('should emit expected event', async () => {
      await expect(latteSwapRouterAsAlice.swapExactETHForTokens(
        0,
        [wbnb.address, token0.address],
        aliceAddress,
        MaxUint256,
        {
          value: swapAmount,
        }
      )) .to.emit(wbnb, 'Transfer')
      .withArgs(latteSwapRouter.address, nativePair.address, swapAmount)
      .to.emit(token0, 'Transfer')
      .withArgs(nativePair.address, aliceAddress, expectedOutputAmount)
      .to.emit(nativePair, 'Sync')
      .withArgs(
        nativePairToken0 === token0.address
          ? token0Amount.sub(expectedOutputAmount)
          : bnbAmount.add(swapAmount),
        nativePairToken0 === token0.address
          ? bnbAmount.add(swapAmount)
          : token0Amount.sub(expectedOutputAmount)
      )
      .to.emit(nativePair, 'Swap')
      .withArgs(
        latteSwapRouter.address,
        nativePairToken0 === token0.address ? 0 : swapAmount,
        nativePairToken0 === token0.address ? swapAmount : 0,
        nativePairToken0 === token0.address ? expectedOutputAmount : 0,
        nativePairToken0 === token0.address ? 0 : expectedOutputAmount,
        aliceAddress
      )
    })

    it('should swap a correct amount based on getAmountOut', async() => {
      const balanceBefore = await token0.balanceOf(aliceAddress)
      await latteSwapRouterAsAlice.swapExactETHForTokens(
        0,
        [wbnb.address, token0.address],
        aliceAddress,
        MaxUint256,
        {
          value: swapAmount,
        }
      )
      const balanceAfter = await token0.balanceOf(aliceAddress)
      expect(balanceAfter.sub(balanceBefore)).to.eq(expectedOutputAmount)
    })
  })

  describe("#swapETHForExactTokens()", () => {
    const bnbAmount = ethers.utils.parseEther('5')
    const token0Amount = ethers.utils.parseEther('10')
    const expectedSwapAmount = BigNumber.from('556947925368978001')
    // getAmountIn =  (5*1) / ((10 - 1) * 0.9975) + (1 * 10 ^ -18)
    const outputAmount = ethers.utils.parseEther('1')
    let aliceAddress: string, wbnbAsAlice: WBNB, nativePairToken0: string

    beforeEach(async() => {
      wbnbAsAlice = WBNB__factory.connect(wbnb.address, alice) as WBNB
      aliceAddress = await alice.getAddress()
      // approve tokens
      await token0.approve(latteSwapRouter.address, MaxUint256)
      await token0.mint(aliceAddress, ethers.utils.parseEther('10000'))
      await wbnbAsAlice.approve(latteSwapRouter.address, MaxUint256)
      nativePairToken0 = await nativePair.token0()

      // add initial liquidity ETH
      await latteSwapRouter.addLiquidityETH(
        token0.address,
        token0Amount,
        token0Amount,
        bnbAmount,
        aliceAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      )
    })
    it('should emit expected event', async () => {
      await expect(
        latteSwapRouterAsAlice.swapETHForExactTokens(
          outputAmount,
          [wbnb.address, token0.address],
          aliceAddress,
          MaxUint256,
          {
            value: expectedSwapAmount
          }
        )
      )
        .to.emit(wbnb, 'Transfer')
        .withArgs(latteSwapRouter.address, nativePair.address, expectedSwapAmount)
        .to.emit(token0, 'Transfer')
        .withArgs(nativePair.address, aliceAddress, outputAmount)
        .to.emit(nativePair, 'Sync')
        .withArgs(
          nativePairToken0 === token0.address
            ? token0Amount.sub(outputAmount)
            : bnbAmount.add(expectedSwapAmount),
          nativePairToken0 === token0.address
            ? bnbAmount.add(expectedSwapAmount)
            : token0Amount.sub(outputAmount)
        )
        .to.emit(nativePair, 'Swap')
        .withArgs(
          latteSwapRouter.address,
          nativePairToken0 === token0.address ? 0 : expectedSwapAmount,
          nativePairToken0 === token0.address ? expectedSwapAmount : 0,
          nativePairToken0 === token0.address ? outputAmount : 0,
          nativePairToken0 === token0.address ? 0 : outputAmount,
          aliceAddress
        )
    })

    it('should swap a correct amount based on getAmountIn', async() => {
      const balanceBefore = await ethers.provider.getBalance(alice.address)
      const tx = await latteSwapRouterAsAlice.swapETHForExactTokens(
        outputAmount,
        [wbnb.address, token0.address],
        aliceAddress,
        MaxUint256,
        {
          value: expectedSwapAmount
        }
      )
      const receipt = await tx.wait()
      const balanceAfter = await ethers.provider.getBalance(alice.address)
      expect(balanceBefore.sub(balanceAfter)).to.eq(expectedSwapAmount.add((await ethers.provider.getGasPrice()).mul(receipt.cumulativeGasUsed)))
    })
  })

  describe("#swapTokensForExactETH()", () => {
    const token0Amount = ethers.utils.parseEther('5')
    const bnbAmount = ethers.utils.parseEther('10')
    const expectedSwapAmount = BigNumber.from('556947925368978001')
    // getAmountIn = ((5 * 1) / ((10 - 1) * 0.9975)) + 1 * 1 * 10^-18 = 556947925368978001
    const outputAmount = ethers.utils.parseEther('1')
    let aliceAddress: string, token0AsAlice: SimpleToken, nativePairToken0: string

    beforeEach(async() => {
      token0AsAlice = SimpleToken__factory.connect(token0.address, alice) as SimpleToken
      aliceAddress = await alice.getAddress()
      // approve tokens
      await token0.approve(latteSwapRouter.address, MaxUint256)
      await token0.mint(aliceAddress, ethers.utils.parseEther('10000'))
      await token0AsAlice.approve(latteSwapRouter.address, MaxUint256)
      nativePairToken0 = await nativePair.token0()

      // add initial liquidity ETH
      await latteSwapRouter.addLiquidityETH(
        token0.address,
        token0Amount,
        token0Amount,
        bnbAmount,
        aliceAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      )
    })

    it('should emit expected event', async () => {
      await expect(
        latteSwapRouterAsAlice.swapTokensForExactETH(
          outputAmount,
          MaxUint256,
          [token0.address, wbnb.address],
          aliceAddress,
          MaxUint256,
        )
      )
        .to.emit(token0, 'Transfer')
        .withArgs(aliceAddress, nativePair.address, expectedSwapAmount)
        .to.emit(wbnb, 'Transfer')
        .withArgs(nativePair.address, latteSwapRouter.address, outputAmount)
        .to.emit(nativePair, 'Sync')
        .withArgs(
          nativePairToken0 === token0.address
            ? token0Amount.add(expectedSwapAmount)
            : bnbAmount.sub(outputAmount),
          nativePairToken0 === token0.address
            ? bnbAmount.sub(outputAmount)
            : token0Amount.add(expectedSwapAmount)
        )
        .to.emit(nativePair, 'Swap')
        .withArgs(
          latteSwapRouter.address,
          nativePairToken0 === token0.address ? expectedSwapAmount : 0,
          nativePairToken0 === token0.address ? 0 : expectedSwapAmount,
          nativePairToken0 === token0.address ? 0 : outputAmount,
          nativePairToken0 === token0.address ? outputAmount : 0,
          latteSwapRouter.address
        )
    })

    it('should swap a correct amount based on getAmountIn', async() => {
      const balanceBefore = await token0.balanceOf(aliceAddress)
      await latteSwapRouterAsAlice.swapTokensForExactETH(
        outputAmount,
        MaxUint256,
        [token0.address, wbnb.address],
        aliceAddress,
        MaxUint256,
      )
      const balanceAfter = await token0.balanceOf(aliceAddress)
      expect(balanceBefore.sub(balanceAfter)).to.eq(expectedSwapAmount)
    })
  })

  describe("#swapExactTokensForETH()", () => {
    const token0Amount = ethers.utils.parseEther('5')
    const bnbAmount = ethers.utils.parseEther('10')
    const expectedOutputAmount = BigNumber.from('1663192997082117548')
    // getAmountOut =  (1 * 0.9975 * 10) / (5 + 1 * 0.9975) = 1.663192997082117548
    const swapAmount = ethers.utils.parseEther('1')
    let aliceAddress: string, token0AsAlice: SimpleToken, nativePairToken0: string

    beforeEach(async() => {
      token0AsAlice = SimpleToken__factory.connect(token0.address, alice) as SimpleToken
      aliceAddress = await alice.getAddress()
      // approve tokens
      await token0.approve(latteSwapRouter.address, MaxUint256)
      await token0.mint(aliceAddress, ethers.utils.parseEther('10000'))
      await token0AsAlice.approve(latteSwapRouter.address, MaxUint256)
      nativePairToken0 = await nativePair.token0()

      // add initial liquidity ETH
      await latteSwapRouter.addLiquidityETH(
        token0.address,
        token0Amount,
        token0Amount,
        bnbAmount,
        aliceAddress,
        MaxUint256,
        {
          value: bnbAmount,
        }
      )
    })
    it('should emit expected event', async () => {
      await expect(
        latteSwapRouterAsAlice.swapExactTokensForETH(
          swapAmount,
          0,
          [token0.address, wbnb.address],
          aliceAddress,
          MaxUint256,
        )
      )
        .to.emit(token0, 'Transfer')
        .withArgs(aliceAddress, nativePair.address, swapAmount)
        .to.emit(wbnb, 'Transfer')
        .withArgs(nativePair.address, latteSwapRouter.address, expectedOutputAmount)
        .to.emit(nativePair, 'Sync')
        .withArgs(
          nativePairToken0 === token0.address
            ? token0Amount.add(swapAmount)
            : bnbAmount.sub(expectedOutputAmount),
          nativePairToken0 === token0.address
            ? bnbAmount.sub(expectedOutputAmount)
            : token0Amount.add(swapAmount)
        )
        .to.emit(nativePair, 'Swap')
        .withArgs(
          latteSwapRouter.address,
          nativePairToken0 === token0.address ? swapAmount : 0,
          nativePairToken0 === token0.address ? 0 : swapAmount,
          nativePairToken0 === token0.address ? 0 : expectedOutputAmount,
          nativePairToken0 === token0.address ? expectedOutputAmount : 0,
          latteSwapRouter.address
        )
    })

    it('should swap a correct amount based on getAmountOut', async() => {
      const balanceBefore = await ethers.provider.getBalance(alice.address)
      const tx = await latteSwapRouterAsAlice.swapExactTokensForETH(
        swapAmount,
        0,
        [token0.address, wbnb.address],
        aliceAddress,
        MaxUint256,
      )
      const receipt = await tx.wait()
      const balanceAfter = await ethers.provider.getBalance(alice.address)
      expect(balanceAfter.sub(balanceBefore)).to.eq(expectedOutputAmount.sub((await ethers.provider.getGasPrice()).mul(receipt.cumulativeGasUsed)))
    })
  })
})

