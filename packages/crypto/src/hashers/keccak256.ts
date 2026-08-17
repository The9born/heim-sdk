import { Hasher } from "./types";
import { keccak256 } from "ethers/lib/utils";

export const keccak256Hasher: Hasher = {
  hash: (message: Buffer): Buffer => {
    const hash = keccak256(message);

    return Buffer.from(hash.substring(2), "hex");
  },
};
