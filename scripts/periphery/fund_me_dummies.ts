import { ethers, network } from "hardhat";
import DevelopConfig from '../../develop.json'
import { SimpleToken, SimpleToken__factory } from "../../typechain";
import { withNetworkFile } from "../../utils";

const TARGET_ADDRESSES: Array<string> = ["0x235d6c8f7FEe81FdC8e9942d766376095c5db58D", "0xdA7097819F26b44f7879c0c7494661606aF4A381"]
const AMOUNT = ethers.utils.parseEther('10000')

async function main() {
    if (network.name === "mainnet") throw new Error("T000::fund_me_dummies:: Mainnet is not allowed here")
    const config = DevelopConfig
    const mockedERC20Entries: Array<Array<string>> = Object.entries<string>(config.Tokens).filter((entry) => {
      return entry[0] != 'WBNB'
    })

    if (mockedERC20Entries.length == 0) throw new Error('No Mocked ERC20')
    const deployer = (await ethers.getSigners())[0]
    console.log(`deployer: ${(await deployer.getAddress())}`)

    for (let entry of mockedERC20Entries) {
      const [key, erc20Address] = entry
      for (let target of TARGET_ADDRESSES) {
        console.log(`>> sending ${target} a token ${key} address ${erc20Address} amount ${AMOUNT}`)
        const token: SimpleToken = SimpleToken__factory.connect(erc20Address, deployer)
        const tx = await token.mint(target, AMOUNT)
        
        console.log(`>> ✅ Done!, here is the tx ${tx.hash}`)
      }
    }
}


withNetworkFile(main)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })