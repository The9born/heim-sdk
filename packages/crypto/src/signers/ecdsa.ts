import seedRandom from "seedrandom";
import { getRandomValues } from "crypto";

import { bigIntToBytes, bytesToBigInt, bytesToHex, hexToBytes } from "@the9born/utils";
import {
  AffinePoint,
  DerivationPath,
  Signature,
  Signer,
  SignerOptions,
} from "./base";
import { setLength } from "@the9born/utils";
import { PaillierPrivateKey, PaillierPublicKey } from "../paillier";
import { generatePrivateKeyFromSeed } from "./helpers";
import { ethers } from "ethers";
import { Hasher } from "../hashers";
import { secp256k1 } from "@noble/curves/secp256k1";
import { arrayToBigInt } from "./helpers";
import { invert } from "@noble/curves/abstract/modular";

export const secp256k1Curve = secp256k1;
export type EcdsaCurve = typeof secp256k1;

export interface EcdsaSignerOptions extends SignerOptions<EcdsaCurve> {
  paillierPrivateKey?: PaillierPrivateKey;
  paillierPublicKey?: PaillierPublicKey;
}

export class EcdsaSigner extends Signer<EcdsaCurve> {
  protected paillierPrivateKey?: PaillierPrivateKey;
  protected paillierPublicKey?: PaillierPublicKey;

  static fromSeed({
    seed,
    ...options
  }: Omit<EcdsaSignerOptions, "privateKey"> & { seed: Uint8Array }) {
    const privateKey = generatePrivateKeyFromSeed(seed, DerivationPath.Heim);

    return new EcdsaSigner({ ...options, privateKey });
  }

  static fromMnemonic({
    mnemonic,
    ...options
  }: Omit<EcdsaSignerOptions, "privateKey"> & { mnemonic: string }) {
    if (!ethers.utils.isValidMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    const seedHex = ethers.utils.mnemonicToSeed(mnemonic);
    const seed = ethers.utils.arrayify(seedHex);

    return this.fromSeed({
      seed,
      ...options,
    });
  }

  constructor({
    paillierPrivateKey,
    paillierPublicKey,
    ...options
  }: EcdsaSignerOptions) {
    super(options);

    this.paillierPrivateKey = paillierPrivateKey;
    this.paillierPublicKey = paillierPublicKey;
  }

  getPaillierPublicKey(): PaillierPublicKey {
    return this.paillierPublicKey;
  }

  getEncryptedPrivateKey() {
    if (!this.paillierPublicKey) {
      throw new Error(
        "Unable to encrypt private key, missing paillier public key"
      );
    }

    const encryptedKey = this.paillierPublicKey.encrypt(this.privateKey);

    return encryptedKey;
  }

  initializeSignature(message: Uint8Array, hasher: Hasher) {
    const k1 = this.getK(message, hasher);
    const R1 = secp256k1.ProjectivePoint.BASE.multiply(k1).toAffine();

    return { k1, R1 };
  }

  generateSignature(
    message: Uint8Array,
    hasher: Hasher,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2Affine: AffinePoint,
    c3: bigint
  ) {
    if (!this.paillierPrivateKey) {
      throw new Error(
        "Unable to retrieve signature, missing paillier private key"
      );
    }

    const twoPartyPublicKey = this.getTwoPartyPublicKey(responderPublicKey);
    const signerPub = Buffer.from(twoPartyPublicKey).toString("hex");

    const sPrime = this.paillierPrivateKey.decrypt(c3);
    const s = this.getS(k1, sPrime);

    const R2 = secp256k1.ProjectivePoint.fromAffine({
      x: R2Affine.x,
      y: R2Affine.y,
    });
    const r = R2.multiply(k1).toAffine().x % this.curve.CURVE.n;

    let signature: Signature | undefined = undefined;

    const recoveryBits: [0, 1] = [0, 1];

    for (const recoveryBit of recoveryBits) {
      const tempSignature = {
        r,
        s,
        recoveryBit,
      };

      const publicKey = Buffer.from(
        this.getPublicKeyFromSignature(message, tempSignature, hasher)
      ).toString("hex");

      if (publicKey.toLowerCase() === signerPub.toLowerCase()) {
        signature = tempSignature;
        break;
      }
    }

    if (!signature) {
      throw new Error("Unable to verify the signature");
    }

    const R = bigIntToBytes(signature.r);
    const S = bigIntToBytes(signature.s);

    const finalizedSignature = Buffer.concat(
      [setLength(R, 32, false), setLength(S, 32, false)],
      64
    );

    return finalizedSignature;
  }

  getSignatureResponseParams(
    message: Uint8Array,
    hasher: Hasher,
    R1Affine: AffinePoint,
    options: {
      partnerPrivateKeyEncrypted?: bigint;
      partnerPublicKey?: Uint8Array;
    }
  ) {
    if (!this.paillierPublicKey) {
      throw new Error(
        "Unable to retrieve signature response params, missing paillier public key"
      );
    }

    if (!options.partnerPrivateKeyEncrypted) {
      throw new Error("Missing encrypted partner private key");
    }

    const k2 = this.getK(message, hasher);
    const R2 = secp256k1.ProjectivePoint.BASE.multiply(k2).toAffine();
    const c3 = this.getC3(
      message,
      hasher,
      k2,
      R1Affine,
      this.paillierPublicKey,
      options.partnerPrivateKeyEncrypted
    );

    return { R2, c3 };
  }

  getS(k: bigint, sPrime: bigint) {
    const kInv = invert(k, this.curve.CURVE.n);

    let s = sPrime * kInv;
    s %= this.curve.CURVE.n;

    const qs = this.curve.CURVE.n - s;

    if (s > qs) {
      s = qs;
    }

    return s;
  }

  private getNoise(message: Uint8Array, hasher: Hasher) {
    const k1Noise = this.getK(message, hasher);
    const k2Noise = this.getK(message, hasher);
    const noise = k1Noise * k2Noise;

    return noise;
  }

  private hashInt(message: Uint8Array) {
    const orderBits = this.curve.CURVE.nBitLength;
    const orderBytes = (orderBits + 7) / 8;

    if (message.length > orderBytes) {
      message = message.subarray(0, orderBytes);
    }

    const zInt = bytesToBigInt(message);

    const excess = message.length * 8 - orderBits;
    if (excess > 0) {
      zInt >> BigInt(excess);
    }

    return zInt;
  }

  // TODO
  // This is chain dependent, also does it make sense to use sha512 for eg. ethereum when it uses sha256 (hmac-sha256 for k)
  // Ethereum k generation details: https://datatracker.ietf.org/doc/html/rfc6979#section-3.5
  getK(message: Uint8Array, hasher: Hasher): bigint {
    const entropy = getRandomValues(new Uint8Array(32));
    const msgHash = hasher.hash(message);

    const hash = ethers.utils.sha512(
      Buffer.concat([
        Buffer.from(this.privateKey),
        Buffer.from(entropy),
        Buffer.from(msgHash),
      ])
    );

    const key = Buffer.from(hash.slice(2), "hex").subarray(0, 32);
    const keyHex = ethers.utils.hexlify(key).slice(2);

    const PRNG = seedRandom.xorshift7(keyHex);

    let k =
      (BigInt(Math.floor(PRNG() * Number.MAX_SAFE_INTEGER)) *
        this.curve.CURVE.n) /
      BigInt(Number.MAX_SAFE_INTEGER);

    k %= this.curve.CURVE.n - BigInt(1);
    k = k + BigInt(1);

    return k;
  }

  private getC1(
    message: Uint8Array,
    hasher: Hasher,
    k: bigint,
    paillierPublicKey: PaillierPublicKey
  ) {
    const kInv = invert(k, this.curve.CURVE.n);
    const hash = this.hashInt(hasher.hash(message));

    let u = (hash * kInv) % this.curve.CURVE.n;
    u += this.getNoise(message, hasher) * this.curve.CURVE.n;

    const c1 = paillierPublicKey.encrypt(u);

    return c1;
  }

  private getC2(
    paillierPublicKey: PaillierPublicKey,
    partnerEncryptedPrivateKey: bigint,
    R1: bigint,
    k2: bigint
  ) {
    const d = bytesToBigInt(this.privateKey);
    const k = invert(k2, this.curve.CURVE.n);

    let v = R1 * d;
    v = v * k;
    v = v % this.curve.CURVE.n;

    const c2 = paillierPublicKey.multiply(partnerEncryptedPrivateKey, v);

    return c2;
  }

  private getC3(
    message: Uint8Array,
    hasher: Hasher,
    k2: bigint,
    R1Affine: AffinePoint,
    paillierPublicKey: PaillierPublicKey,
    partnerEncryptedPrivateKey: bigint
  ) {
    const r = this.curve.ProjectivePoint.fromAffine({
      x: R1Affine.x,
      y: R1Affine.y,
    })
      .multiply(k2)
      .toAffine();

    const c1 = this.getC1(message, hasher, k2, paillierPublicKey);
    const c2 = this.getC2(
      paillierPublicKey,
      partnerEncryptedPrivateKey,
      r.x,
      k2
    );

    const c3 = paillierPublicKey.addition(c1, c2);

    return c3;
  }

  getTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    const twoPartyPublicKey = this.curve.ProjectivePoint.fromHex(
      partnerPublicKey
    ).multiply(arrayToBigInt(this.privateKey));
    return twoPartyPublicKey.toRawBytes();
  }

  getMPCTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    const cosignerBPublicPointFromHex = secp256k1Curve.ProjectivePoint.fromHex(bytesToHex(partnerPublicKey).substring(2));
    const cosignerAPublicKey = secp256k1Curve.ProjectivePoint.fromHex(bytesToHex(this.publicKey).substring(2));
    const combinedPublicKeyLocalPoint = cosignerAPublicKey.add(cosignerBPublicPointFromHex);
    return combinedPublicKeyLocalPoint.toRawBytes();
  }

  getPublicKeyFromSignature(
    message: Uint8Array,
    signature: Signature,
    hasher: Hasher
  ): Uint8Array {
    const { r, s, recoveryBit } = signature;

    const sig = new this.curve.Signature(r, s).addRecoveryBit(recoveryBit);
    const msgHash = hasher.hash(message);
    const pubkey = sig.recoverPublicKey(msgHash).toRawBytes(true);

    return pubkey;
  }
}
