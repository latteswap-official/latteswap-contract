import { ethers } from 'hardhat';
import fs from 'fs'


function copyContent(fileName: string, dest: string) {
  fs.copyFileSync(fileName, dest);
  console.log(dest);
}


export async function generateNetworkFile() {
    const chainId = (await ethers.provider.getNetwork()).chainId
    const srcFile = `${__dirname}/../.openzeppelinz/${process.env.DEPLOYMENT_ENV}-unknown-${chainId}.json`
    const destFile = `${__dirname}/../.openzeppelinz/unknown-${chainId}.json`
    try {
      fs.renameSync(srcFile, destFile)
      console.log(`✅ successfully rename to a file ${destFile}`)
    } catch (err) {
      console.error(`❌ failed to create a file ${destFile}: ${err}`)
    }
}

export async function updateNetworkFile() {
  const chainId = (await ethers.provider.getNetwork()).chainId
  const srcFile = `${__dirname}/../.openzeppelinz/unknown-${chainId}.json`
  const destFile = `${__dirname}/../.openzeppelinz/${process.env.DEPLOYMENT_ENV}-unknown-${chainId}.json`
  try {
    fs.renameSync(srcFile, destFile)
    console.log(`✅ successfully rename back to a file ${destFile}`)
  } catch(err) {
    console.error(err)
  }
}

export async function withNetworkFile(mainFn: () => Promise<void>) {
  await generateNetworkFile()
  await mainFn()
  await updateNetworkFile()
}