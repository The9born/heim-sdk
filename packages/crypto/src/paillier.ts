import * as bigintModArithmetic from "bigint-mod-arith";

import { PrivateKey, PublicKey } from "paillier-bigint";
import { bytesToBigInt, hexToBigInt } from "@the9born/utils";

type PaillierPrivateKeyParams = {
  lambda: bigint;
  mu: bigint;
  publicKey: PublicKey;
  p?: bigint;
  q?: bigint;
};

export class PaillierPrivateKey extends PrivateKey {
  override publicKey: PaillierPublicKey;

  constructor(params: PaillierPrivateKeyParams) {
    const { lambda, mu, publicKey, p, q } = params;
    super(lambda, mu, publicKey, p, q);

    this.publicKey = new PaillierPublicKey(publicKey.n);
  }

  static fromPQ(p: bigint, q: bigint) {
    const n = p * q;
    const g = n + BigInt(1);
    const lambda = (p - BigInt(1)) * (q - BigInt(1));
    const mu = bigintModArithmetic.modInv(lambda, n);

    const publicKey = new PublicKey(BigInt(n.toString()), BigInt(g.toString()));

    return new PaillierPrivateKey({ p, q, lambda, mu, publicKey });
  }

  // TODO
  static fromSeed(seed: string | Uint8Array): PaillierPrivateKey {
    throw Error("To be implemented");
  }
}

export class PaillierPublicKey extends PublicKey {
  constructor(n: bigint | string) {
    if (typeof n === "string") {
      n = hexToBigInt(n);
    }

    const g = n + BigInt(1);
    super(n, g);
  }

  encrypt(m: bigint | Uint8Array, r?: bigint): bigint {
    if (!(typeof m === "bigint")) {
      m = bytesToBigInt(m);
    }

    return super.encrypt(m, r);
  }
}
