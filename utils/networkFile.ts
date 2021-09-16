import { ethers } from "hardhat";
import fs from "fs";

function copyContent(fileName: string, dest: string) {
  fs.copyFileSync(fileName, dest);
  console.log(dest);
}

export async function generateNetworkFile(): Promise<void> {
  try {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const srcFile = `${__dirname}/../.openzeppelin/${process.env.DEPLOYMENT_ENV}-unknown-${chainId}.json`;
    const destFile = `${__dirname}/../.openzeppelin/unknown-${chainId}.json`;
    if (!fs.existsSync(srcFile)) return;
    fs.renameSync(srcFile, destFile);
    console.log(`✅ successfully rename to a file ${destFile}`);
  } catch (err) {
    console.error(`❌ failed to rename to a file: ${err}`);
    throw err;
  }
}

export async function updateNetworkFile(): Promise<void> {
  try {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const srcFile = `${__dirname}/../.openzeppelin/unknown-${chainId}.json`;
    const destFile = `${__dirname}/../.openzeppelin/${process.env.DEPLOYMENT_ENV}-unknown-${chainId}.json`;
    fs.renameSync(srcFile, destFile);
    console.log(`✅ successfully rename back to a file ${destFile}`);
  } catch (err) {
    console.error(`❌ failed to rename back a file: ${err}`);
    throw err;
  }
}

export async function withNetworkFile(mainFn: () => Promise<void>): Promise<void> {
  await generateNetworkFile();
  try {
    await mainFn();
  } catch (err) {
    console.error(`❌ failed to execute function: ${err}`);
  }
  await updateNetworkFile();
}
