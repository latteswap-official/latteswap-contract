import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

export * from "./fixtures";

const PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
);

export function sortsBefore(addr1: string, addr2: string): boolean {
  return addr1.toLowerCase() < addr2.toLowerCase();
}

function getDomainSeparator(name: string, tokenAddress: string, chainId: number) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
        ),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
        chainId,
        tokenAddress,
      ]
    )
  );
}

export function getCreate2Address(
  factoryAddress: string,
  [tokenA, tokenB]: [string, string],
  bytecode: string
): string {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const create2Inputs = [
    "0xff",
    factoryAddress,
    ethers.utils.keccak256(ethers.utils.solidityPack(["address", "address"], [token0, token1])),
    ethers.utils.keccak256(bytecode),
  ];
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join("")}`;
  return ethers.utils.getAddress(`0x${ethers.utils.keccak256(sanitizedInputs).slice(-40)}`);
}

export async function getApprovalDigest(
  token: Contract,
  approve: {
    owner: string;
    spender: string;
    value: BigNumber;
  },
  nonce: BigNumber,
  deadline: BigNumber,
  chainId: number
): Promise<string> {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, chainId);
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      [
        "0x19",
        "0x01",
        DOMAIN_SEPARATOR,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        ),
      ]
    )
  );
}
