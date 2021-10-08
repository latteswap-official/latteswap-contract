/* eslint-disable no-console */
import { expect } from "chai";
import { BigNumber, constants, providers, Signer } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import {
  Timelock__factory,
  Timelock,
  MasterBarista__factory,
  LATTEV2__factory,
  BeanBagV2__factory,
  LATTE__factory,
  BeanBag__factory,
  BoosterConfig__factory,
  OGNFT__factory,
  LatteSwapRouter__factory,
  Booster__factory,
  LatteSwapPair__factory,
  LatteSwapFactory__factory,
} from "../../../typechain";
import { getConfig } from "../../../utils";
import { commify, formatEther, parseEther } from "ethers/lib/utils";
import { duration, increase } from "../../../tests/helpers/time";

const userAddress = "";

const impersonate = async (userAddress: string): Promise<providers.JsonRpcSigner> => {
  console.log(userAddress);
  console.log(`===== Impersonating ${userAddress} =====`);
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  await provider.send("hardhat_impersonateAccount", [userAddress]);
  console.log(`===== Finished Impersonating ${userAddress} =====`);

  const signer = await provider.getSigner(userAddress);

  console.log(`===== Set Bal ${userAddress} =====`);
  const newBalance = ethers.utils.parseEther("100000");

  // this is necessary because hex quantities with leading zeros are not valid at the JSON-RPC layer
  const newBalanceHex = newBalance.toHexString().replace(/0x0+/, "0x");
  await network.provider.send("hardhat_setBalance", [userAddress, newBalanceHex]);
  console.log(`===== Finished Set Bal ${userAddress} ===== `);
  console.log(await signer.getAddress());
  console.log(commify(formatEther(await signer.getBalance())));

  return signer;
};

async function main() {
  if (network.name !== "mainnetfork") throw new Error("gosh... not a mainnetfork");
  const config = getConfig();
  const signer = (await ethers.getSigners())[0];
  const user = signer;
  const timelock = Timelock__factory.connect(config.Timelock, signer);
  const masterBarista = MasterBarista__factory.connect(config.MasterBarista, signer);
  const latteV2 = LATTEV2__factory.connect(config.Tokens.LATTEV2, signer);
  const beanV2 = BeanBagV2__factory.connect(config.BeanBagV2, signer);
  const latteV1 = LATTE__factory.connect(config.Tokens.LATTE, signer);
  const beanV1 = BeanBag__factory.connect(config.BeanBag, signer);
  const ogNFTAsUser = OGNFT__factory.connect(config.OGNFT, user);
  const boosterConfig = BoosterConfig__factory.connect(config.BoosterConfig, signer);

  let tx;
  await increase(duration.hours(BigNumber.from(8)));

  // 1. Turn off emission to be 0
  console.log(">> Turn off emission to be 0");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setLattePerBlock(uint256)",
    ethers.utils.defaultAbiCoder.encode(["uint256"], ["0"]),
    "1633438806"
  );
  await tx.wait();
  expect(await masterBarista.lattePerBlock(), "latte per block should be 0").to.eq(0);
  console.log(">> ✅ DONE Turn off emission to be 0");

  // 2. Set alloc bps of LATTE to be 0
  console.log(">> Set alloc bps of LATTE to be 0");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setPoolAllocBps(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0x8D78C2ff1fB4FBA08c7691Dfeac7bB425a91c81A", "0"]),
    "1633438806"
  );
  await tx.wait();
  expect(
    (await masterBarista.poolInfo("0x8d78c2ff1fb4fba08c7691dfeac7bb425a91c81a")).allocBps,
    "LATTEv1 allocBps should be 0"
  ).to.eq(0);
  expect(
    (await masterBarista.poolInfo("0x8d78c2ff1fb4fba08c7691dfeac7bb425a91c81a")).allocPoint,
    "LATTEv1 alloc point should be 0"
  ).to.eq(0);
  console.log(">> ✅ DONE Set alloc bps of LATTE to be 0");

  // 3. Set LATTE-BUSD PCS AllocPoint to be 0
  console.log(">> Set LATTE-BUSD PCS AllocPoint to be 0");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setPool(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0xc019ca579efa75be917f38afb1113030c06ba035", "0"]),
    "1633438806"
  );
  await tx.wait();
  expect(
    (await masterBarista.poolInfo("0xc019ca579efa75be917f38afb1113030c06ba035")).allocPoint,
    "LATTE-BUSD pcs alloc point should be 0"
  ).to.eq(0);
  console.log(">> ✅ DONE Set LATTE-BUSD PCS AllocPoint to be 0");

  // 4. Set LATTE-BUSD AllocPoint to be 0
  console.log(">> Set LATTE-BUSD AllocPoint to be 0");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setPool(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0xB4BC3F991aec9c54B489d5a5db818487db42857D", "0"]),
    "1633438806"
  );
  await tx.wait();
  expect(
    (await masterBarista.poolInfo("0x8d78c2ff1fb4fba08c7691dfeac7bb425a91c81a")).allocPoint,
    "LATTE-BUSD alloc point should be 0"
  ).to.eq(0);
  console.log(">> ✅ DONE Set LATTE-BUSD AllocPoint to be 0");

  // 5. Execute MasterBarista to migrate a reward
  console.log(">> Execute MasterBarista to migrate a reward");
  const balanceToRedeem = await beanV1.balanceOf(latteV1.address);
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "migrate(address,address)",
    ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      ["0xa269A9942086f5F87930499dC8317ccC9dF2b6CB", "0x498A9a097291852eDbfed7dFfFf807356BA7aEbe"]
    ),
    "1633539606"
  );
  await tx.wait();
  expect(await masterBarista.activeLatte()).to.eq(config.Tokens.LATTEV2);
  expect(await masterBarista.activeBean()).to.eq(config.BeanBagV2);
  expect(await beanV1.balanceOf(latteV1.address)).to.eq(0);
  expect(await beanV2.balanceOf(latteV2.address)).to.eq(balanceToRedeem);
  console.log(">> ✅ DONE Execute MasterBarista to migrate a reward");

  // 5.1 user try to harvest his pending latte in OG lil rose pool
  console.log(">> user try to harvest his pending latte in OG lil rose pool");
  let v2Before = await latteV2.balanceOf(await user.getAddress());
  console.log(`>> bal before ${commify(formatEther(v2Before))}`);
  let userPendingReward = await masterBarista.pendingLatte(
    "0x1fb7089764286259857d56ff54ac98620Dbc3Cac",
    await user.getAddress()
  );
  tx = await ogNFTAsUser["harvest(uint256)"](1);
  await tx.wait();
  console.log(`>> bal after ${commify(formatEther(await latteV2.balanceOf(await user.getAddress())))}`);
  expect(
    await masterBarista.pendingLatte("0x1fb7089764286259857d56ff54ac98620Dbc3Cac", await user.getAddress()),
    "pending reward of OG lil rose should be 0"
  ).to.eq(0);
  expect(
    (await latteV2.balanceOf(await user.getAddress())).sub(v2Before),
    "user should get v2 as a pending reward of OG lil rose"
  ).to.eq(userPendingReward);
  console.log(">> ✅ DONE user try to harvest his pending latte in OG lil rose pool");

  // 6. Execute MasterBarista to add LATTEV2 pool
  console.log(">> Execute MasterBarista to add LATTEV2 pool");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "addPool(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0xa269A9942086f5F87930499dC8317ccC9dF2b6CB", "0"]),
    "1633539606"
  );
  await tx.wait();
  console.log(">> ✅ DONE Execute MasterBarista to add LATTEV2 pool");

  // 7. Execute MasterBarista to set allocBps of LATTEV2 to 1500 BPS
  console.log(">> Execute MasterBarista to set allocBps of LATTEV2 to 1500 BPS");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setPoolAllocBps(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0xa269A9942086f5F87930499dC8317ccC9dF2b6CB", "1500"]),
    "1633539606"
  );
  console.log(
    (await masterBarista.poolInfo("0xa269A9942086f5F87930499dC8317ccC9dF2b6CB")).allocPoint
      .mul(10000)
      .div(await masterBarista.totalAllocPoint())
      .toString()
  );
  await tx.wait();

  expect((await masterBarista.poolInfo("0xa269A9942086f5F87930499dC8317ccC9dF2b6CB")).allocBps).to.eq(1500);
  console.log(">> ✅ DONE Execute MasterBarista to set allocBps of LATTEV2 to 1500 BPS");

  // 8. Set stake tokens to be boosted for LATTEv2-BUSD and PCS LATTEv2-BUSD
  // 8.1 LATTEv2-BUSD
  // 8.1.1 set stake token allowance for booster to allow LATTEv2-BUSD to be boosted
  console.log(">> set stake token allowance for booster to allow LATTEv2-BUSD to be boosted");
  tx = await timelock.executeTransaction(
    "0xdeAaFFD54d11B3dfa50E7A4b178E045ab750e4eA",
    "0",
    "setStakeTokenAllowance(address,bool)",
    ethers.utils.defaultAbiCoder.encode(["address", "bool"], ["0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", true]),
    "1633626000"
  );
  await tx.wait();
  expect(await boosterConfig.stakeTokenAllowance("0x1524c3380257ef5d556afeb6056c35defa9db8b6"), "should be allowed").to
    .be.true;

  // 8.1.2 set stake token caller allowance for LATTEv2-BUSD which allow booster to be a funder (caller)
  console.log(">> set stake token caller allowance for LATTEv2-BUSD which allow booster to be a funder (caller)");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setStakeTokenCallerAllowancePool(address,bool)",
    ethers.utils.defaultAbiCoder.encode(["address", "bool"], ["0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", true]),
    "1633626000"
  );
  await tx.wait();
  expect(
    await masterBarista.stakeTokenCallerAllowancePool("0x1524c3380257ef5d556afeb6056c35defa9db8b6"),
    "should be allowed"
  ).to.be.true;

  // 8.1.3 add booster as LATTEv2-BUSD caller
  console.log(">> add booster as LATTEv2-BUSD caller");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "addStakeTokenCallerContract(address,address)",
    ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      ["0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", "0xfE663C8C580832A916F8D9e9fF8e13Cb814Ec14d"]
    ),
    "1633626000"
  );
  await tx.wait();

  // 8.2 LATTEv2-BUSD PCS
  // 8.2.1 set stake token allowance for booster to allow LATTEv2-BUSD PCS to be boosted
  console.log(">> set stake token allowance for booster to allow LATTEv2-BUSD PCS to be boosted");
  tx = await timelock.executeTransaction(
    "0xdeAaFFD54d11B3dfa50E7A4b178E045ab750e4eA",
    "0",
    "setStakeTokenAllowance(address,bool)",
    ethers.utils.defaultAbiCoder.encode(["address", "bool"], ["0xa82a0b7bacf3fde41802b1ec32065e518958c715", true]),
    "1633626000"
  );
  await tx.wait();
  expect(await boosterConfig.stakeTokenAllowance("0xa82a0b7bacf3fde41802b1ec32065e518958c715"), "should be allowed").to
    .be.true;

  // 8.2.2 set stake token caller allowance for LATTEv2-BUSD PCS which allow booster to be a funder (caller)
  console.log(">> set stake token caller allowance for LATTEv2-BUSD PCS which allow booster to be a funder (caller)");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setStakeTokenCallerAllowancePool(address,bool)",
    ethers.utils.defaultAbiCoder.encode(["address", "bool"], ["0xa82a0b7bacf3fde41802b1ec32065e518958c715", true]),
    "1633626000"
  );
  await tx.wait();
  expect(
    await masterBarista.stakeTokenCallerAllowancePool("0xa82a0b7bacf3fde41802b1ec32065e518958c715"),
    "should be allowed"
  ).to.be.true;

  // 8.2.3 add booster as LATTEv2-BUSD PCS caller
  console.log(">> add booster as LATTEv2-BUSD PCS caller");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "addStakeTokenCallerContract(address,address)",
    ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      ["0xa82a0b7bacf3fde41802b1ec32065e518958c715", "0xfE663C8C580832A916F8D9e9fF8e13Cb814Ec14d"]
    ),
    "1633626000"
  );
  await tx.wait();

  // 9. Add Category Allowance for LATTEv2-BUSD and LATTEv2-BUSD PCS
  console.log(">> Add Category Allowance for LATTEv2-BUSD");
  tx = await timelock.executeTransaction(
    "0xdeAaFFD54d11B3dfa50E7A4b178E045ab750e4eA",
    "0",
    "setStakingTokenCategoryAllowance((address,(address,uint256,bool)[]))",
    ethers.utils.defaultAbiCoder.encode(
      ["(address stakingToken,(address nftAddress,uint256 nftCategoryId,bool allowance)[] allowance)"],
      [
        {
          stakingToken: "0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6",
          allowance: [
            {
              nftAddress: "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
              nftCategoryId: 1,
              allowance: false,
            },
            {
              nftAddress: "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
              nftCategoryId: 2,
              allowance: false,
            },
            {
              nftAddress: "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
              nftCategoryId: 3,
              allowance: true,
            },
          ],
        },
      ]
    ),
    "1633626000"
  );
  await tx.wait();

  await Promise.all(
    [1, 2].map(async (i) => {
      expect(
        await boosterConfig.categoryNftAllowanceConfig(
          "0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6",
          "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
          i
        )
      ).to.be.false;
    })
  );
  expect(
    await boosterConfig.categoryNftAllowanceConfig(
      "0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6",
      "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
      3
    )
  ).to.be.true;

  console.log(">> Add Category Allowance for LATTEv2-BUSD PCS");
  tx = await await timelock.executeTransaction(
    "0xdeAaFFD54d11B3dfa50E7A4b178E045ab750e4eA",
    "0",
    "setStakingTokenCategoryAllowance((address,(address,uint256,bool)[]))",
    ethers.utils.defaultAbiCoder.encode(
      ["(address stakingToken,(address nftAddress,uint256 nftCategoryId,bool allowance)[] allowance)"],
      [
        {
          stakingToken: "0xa82a0b7bacf3fde41802b1ec32065e518958c715",
          allowance: [
            {
              nftAddress: "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
              nftCategoryId: 1,
              allowance: false,
            },
            {
              nftAddress: "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
              nftCategoryId: 2,
              allowance: false,
            },
            {
              nftAddress: "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
              nftCategoryId: 3,
              allowance: true,
            },
          ],
        },
      ]
    ),
    "1633626000"
  );
  await tx.wait();
  await Promise.all(
    [1, 2].map(async (i) => {
      expect(
        await boosterConfig.categoryNftAllowanceConfig(
          "0xa82a0b7bacf3fde41802b1ec32065e518958c715",
          "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
          i
        )
      ).to.be.false;
    })
  );
  expect(
    await boosterConfig.categoryNftAllowanceConfig(
      "0xa82a0b7bacf3fde41802b1ec32065e518958c715",
      "0xB5A835b9E4aE76AEA930831B84eB74293309e059",
      3
    )
  ).to.be.true;

  // 10. Execute MasterBarista to add allocpoint of LATTEV2-BUSD to 5000
  console.log(">> Execute MasterBarista to add allocpoint of LATTEV2-BUSD to 5000");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "addPool(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", "5000"]),
    "1633607417"
  );
  await tx.wait();

  expect(
    (await masterBarista.poolInfo("0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6")).allocPoint,
    "LATTEv2-BUSD alloc point should be 5000"
  ).to.eq(5000);
  console.log(">> ✅ DONE Execute MasterBarista to add allocpoint of LATTEV2-BUSD to 5000");

  // 11. Execute MasterBarista to add allocpoint of LATTEV2-BUSD PCS to 500
  console.log(">> Execute MasterBarista to add allocpoint of LATTEV2-BUSD PCS to 500");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "addPool(address,uint256)",
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], ["0xa82a0b7bacf3fde41802b1ec32065e518958c715", "500"]),
    "1633607417"
  );
  await tx.wait();

  expect(
    (await masterBarista.poolInfo("0xa82a0b7bacf3fde41802b1ec32065e518958c715")).allocPoint,
    "LATTEv2-BUSD PCS alloc point should be 500"
  ).to.eq(500);
  console.log(">> ✅ DONE Execute MasterBarista to add allocpoint of LATTEV2-BUSD PCS to 500");

  console.log(
    (await masterBarista.poolInfo("0xa269A9942086f5F87930499dC8317ccC9dF2b6CB")).allocPoint
      .mul(10000)
      .div(await masterBarista.totalAllocPoint())
      .toString()
  );

  // 12. Turn on emission back to 10 bnb
  console.log(">> Turn on emission back to 10 bnb");
  tx = await timelock.executeTransaction(
    "0xbCeE0d15a4402C9Cc894D52cc5E9982F60C463d6",
    "0",
    "setLattePerBlock(uint256)",
    ethers.utils.defaultAbiCoder.encode(["uint256"], ["10000000000000000000"]),
    "1633438806"
  );
  await tx.wait();
  expect(await masterBarista.lattePerBlock(), "latte per block should be 10 latte").to.eq(parseEther("10"));
  console.log(">> ✅ DONE Turn on emission back to 10 bnb");

  // 13 try staking/unstaking LatteV2-BUSD pair
  console.log(">> try staking LatteV2-BUSD pair");
  const lpHolder = await impersonate("");
  const factory = await LatteSwapFactory__factory.connect(config.Factory, signer);
  const pair = await factory.getPair(config.Tokens.BUSD, config.Tokens.LATTEV2);
  const LPHolderPair = LatteSwapPair__factory.connect("0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", lpHolder);
  expect(pair, "pair should be equal to the result from factory").to.eq(LPHolderPair.address);
  const boosterAsLPHolder = Booster__factory.connect(config.Booster, lpHolder);
  const stakeAmount = await LPHolderPair.balanceOf(await lpHolder.getAddress());
  console.log(`>> stake amount (LP) amount of an LP holder ${commify(formatEther(stakeAmount))}`);
  tx = await LPHolderPair.approve(config.Booster, stakeAmount);
  await tx.wait();
  await boosterAsLPHolder.stake("0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", stakeAmount);
  expect(
    (await masterBarista.userInfo("0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", await lpHolder.getAddress())).amount,
    "stake amount should be equal to lp holder balance"
  ).to.eq(stakeAmount);
  await boosterAsLPHolder.unstake("0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", stakeAmount);
  expect(
    (await masterBarista.userInfo("0x1524C3380257eF5D556AFeB6056c35DeFA9db8b6", await lpHolder.getAddress())).amount,
    "stake amount should be equal to 0"
  ).to.eq(0);
  expect(await LPHolderPair.balanceOf(await lpHolder.getAddress()), "withdraw amount should be back to the user").to.eq(
    stakeAmount
  );
  console.log(">> DONE try staking LatteV2-BUSD pair");

  // 14. try withdraw latte v1
  console.log(">> Try withdraw LATTEv1");

  const v1Before = await latteV1.balanceOf(userAddress);
  console.log(`>> V1 bal before ${commify(formatEther(v1Before))}`);
  v2Before = await latteV2.balanceOf(userAddress);
  console.log(`>> V2 bal before ${commify(formatEther(v2Before))}`);

  const latteStakingAccount = await impersonate(userAddress);
  const masterBaristaAsLatteStakingAccount = MasterBarista__factory.connect(config.MasterBarista, latteStakingAccount);
  const stakedV1 = (await masterBaristaAsLatteStakingAccount.userInfo(config.Tokens.LATTE, userAddress)).amount;
  userPendingReward = await masterBarista.pendingLatte(config.Tokens.LATTE, userAddress);
  tx = await masterBaristaAsLatteStakingAccount.withdrawLatte(userAddress, stakedV1);
  await tx.wait();

  expect(
    await masterBarista.pendingLatte(config.Tokens.LATTE, userAddress),
    "pending reward of LATTEv1 should be 0"
  ).to.eq(0);
  expect((await latteV2.balanceOf(userAddress)).sub(v2Before), "user should get v2 as a pending LATTEv2").to.eq(
    userPendingReward
  );
  expect((await latteV1.balanceOf(userAddress)).sub(v1Before), "user should get their v1 back").to.eq(stakedV1);
  console.log(">> ✅ DONE Try withdraw LATTEv1");

  console.log(">> 🏁 ALL CLEARED! <<");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
