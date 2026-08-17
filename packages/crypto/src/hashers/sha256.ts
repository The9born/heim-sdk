import { sha256 } from "ethers/lib/utils";

import { Hasher } from "./types";

export const sha256Hasher: Hasher = {
  hash: (message: Buffer): Buffer => {
    const hash = sha256(message).substring(2);

    return Buffer.from(hash, "hex");
  },
};
