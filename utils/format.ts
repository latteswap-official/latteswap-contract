import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";

export function formatBigNumber(n: BigNumber, format: "hex" | "purehex" | "wei"): string {
  if (format === "hex") {
    return n.toHexString();
  }
  if (format === "purehex") {
    return n.toHexString().split("0x")[1];
  }
  if (format === "wei") {
    return n.toString();
  }
  return formatUnits(n, format);
}
