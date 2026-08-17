import * as bitcoin from "bitcoinjs-lib";

import {
  arrayToBigInt,
  bigintToBuffer32,
  generatePrivateKeyFromSeed,
} from "./helpers";
import { randomBytes } from "ethers/lib/utils";
import { Hasher } from "../hashers";
import {
  AffinePoint,
  DerivationPath,
  Signature,
  SignatureRequestParams,
  SignatureResponseParams,
  Signer,
  SignerOptions,
} from "./base";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";
import { ProjPointType } from "@noble/curves/abstract/weierstrass";

export type SchnorrCurve = typeof secp256k1 | typeof ed25519;

export interface SchnorrSignerOptions extends SignerOptions<SchnorrCurve> { }

export class SchnorrSigner extends Signer<SchnorrCurve> {
  static fromSeed({
    seed,
    ...options
  }: Omit<SchnorrSignerOptions, "privateKey"> & { seed: Uint8Array }) {
    const privateKey = generatePrivateKeyFromSeed(seed, DerivationPath.Bitcoin);

    return new SchnorrSigner({ ...options, privateKey });
  }

  isSecp256k1(value: SchnorrCurve): value is typeof secp256k1 {
    return value.CURVE.n === secp256k1.CURVE.n;
  }

  negateScalar(scalar: bigint) {
    const negated = (this.curve.CURVE.n - scalar) % this.curve.CURVE.n;
    return negated;
  }

  getTweak(pubX: bigint) {
    const tweakHash = bitcoin.crypto.taggedHash(
      "TapTweak",
      Buffer.from(pubX.toString(16), "hex")
    );
    const tweak = BigInt("0x" + tweakHash.toString("hex")) % secp256k1.CURVE.n;

    return tweak;
  }

  tweakScalar(scalar: bigint, tweak: bigint) {
    const tweakedScalar = (scalar + tweak) % secp256k1.CURVE.n;

    return tweakedScalar;
  }

  tweakPublicKey(publicKey: ProjPointType<bigint>) {
    const normalizedPublicKey = !publicKey.hasEvenY()
      ? publicKey.negate()
      : publicKey;

    let tweak = this.getTweak(publicKey.toAffine().x);

    let tweakedPublicKey =
      secp256k1.ProjectivePoint.BASE.multiply(tweak).add(normalizedPublicKey);

    if (!publicKey.hasEvenY()) {
      tweak = this.negateScalar(tweak);
    }

    const isTweakedKeyNegated = !tweakedPublicKey.hasEvenY();
    if (isTweakedKeyNegated) {
      tweakedPublicKey = tweakedPublicKey.negate();
    }

    return {
      tweakedPublicKey,
      tweak,
      negate: !publicKey.hasEvenY() !== isTweakedKeyNegated,
    };
  }

  constructor(options: SchnorrSignerOptions & { privateKey: Uint8Array }) {
    super(options);
  }

  private getE(
    Rx: bigint,
    tppkX: bigint,
    message: Uint8Array,
    hasher: Hasher
  ): bigint {
    const e =
      arrayToBigInt(
        bitcoin.crypto.taggedHash(
          "BIP0340/challenge",
          Buffer.concat([
            bigintToBuffer32(Rx),
            bigintToBuffer32(tppkX),
            message,
          ])
        )
      ) % this.curve.CURVE.n;

    return e;
  }

  override getTwoPartyPublicKey(publicKey: Uint8Array): Uint8Array {
    let tppk: Uint8Array;

    if (this.isSecp256k1(this.curve)) {
      tppk = this.curve.ProjectivePoint.fromHex(this.getPublicKey())
        .add(this.curve.ProjectivePoint.fromHex(publicKey))
        .toRawBytes();
    } else {
      // TODO: implement for ed25519
      throw new Error("SchnorrSigner: ed25519 is not supported");
    }

    return tppk;
  }
  override getMPCTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    let tppk: Uint8Array;

    if (this.isSecp256k1(this.curve)) {
      tppk = this.curve.ProjectivePoint.fromHex(this.getPublicKey())
        .add(this.curve.ProjectivePoint.fromHex(partnerPublicKey))
        .toRawBytes();
    } else {
      // TODO: implement for ed25519
      throw new Error("SchnorrSigner: ed25519 is not supported");
    }

    return tppk;
  }

  // As defined in: https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
  getK(message: Uint8Array, hasher: Hasher): bigint {
    const auxRand = randomBytes(32);
    const auxRandHash = Buffer.from(
      bitcoin.crypto.taggedHash("BIP0340/aux", Buffer.from(auxRand))
    );

    const d = arrayToBigInt(this.privateKey);
    const dBytes = Buffer.from(d.toString(16), "hex");
    const t = dBytes.map((byte, i) => byte ^ auxRandHash[i]);

    const hash = bitcoin.crypto.taggedHash(
      "BIP0340/nonce",
      Buffer.concat([t, this.publicKey.slice(1), message])
    );

    const kPrime = arrayToBigInt(hash) % this.curve.CURVE.n;
    if (kPrime === BigInt(0)) {
      throw new Error(`SchnorrSigner: kPrime is 0`);
    }

    return kPrime;
  }

  initializeSignature(
    message: Uint8Array,
    hasher: Hasher
  ): SignatureRequestParams {
    const k1 = this.getK(message, hasher);

    let R1: AffinePoint;
    if (this.isSecp256k1(this.curve)) {
      R1 = this.curve.ProjectivePoint.BASE.multiply(k1).toAffine();
    } else {
      // TODO: implement for ed25519
      throw new Error("SchnorrSigner: ed25519 is not supported");
    }

    return { k1, R1: { x: R1.x, y: R1.y } };
  }

  generateSignature(
    message: Uint8Array,
    hasher: Hasher,
    responderPublicKey: Uint8Array,
    k1Prime: bigint,
    R2Affine: AffinePoint,
    s2: bigint | Uint8Array
  ): Buffer {
    let R1: ProjPointType<bigint>;
    let R2: ProjPointType<bigint>;

    if (this.isSecp256k1(this.curve)) {
      R1 = this.curve.ProjectivePoint.BASE.multiply(k1Prime);
      R2 = this.curve.ProjectivePoint.fromAffine(R2Affine);
    } else {
      // TODO: implement for ed25519
      throw new Error("SchnorrSigner: ed25519 is not supported");
    }

    let R = R2.add(R1);
    let k1 = k1Prime;

    if (!R.hasEvenY()) {
      k1 = this.negateScalar(k1Prime);
      R = R.negate();
    }

    let tppk = secp256k1.ProjectivePoint.fromHex(
      this.getTwoPartyPublicKey(responderPublicKey)
    );

    let d = arrayToBigInt(this.privateKey);
    const {
      tweakedPublicKey,
      tweak: tweakAmount,
      negate,
    } = this.tweakPublicKey(tppk);

    tppk = tweakedPublicKey;
    d = this.tweakScalar(d, tweakAmount);

    if (negate) {
      d = this.negateScalar(d);
    }

    const tppkX = tppk.toAffine().x;
    const Rx = R.toAffine().x;
    const e = this.getE(Rx, tppkX, message, hasher);
    const s1 = (k1 + e * d) % this.curve.CURVE.n;

    if (typeof s2 !== "bigint") {
      s2 = arrayToBigInt(s2);
    }

    const s = (s1 + s2) % this.curve.CURVE.n;

    const signature = Buffer.concat([
      bigintToBuffer32(Rx),
      bigintToBuffer32(s),
    ]);

    return signature;
  }

  getSignatureResponseParams(
    message: Uint8Array,
    hasher: Hasher,
    R1Affine: AffinePoint,
    options: {
      partnerPrivateKeyEncrypted?: bigint;
      partnerPublicKey?: Uint8Array;
    }
  ): SignatureResponseParams {
    if (!options.partnerPublicKey) {
      throw new Error("SchnorrSigner: partnerPublicKey is required");
    }

    let R1: ProjPointType<bigint>;
    let R2: ProjPointType<bigint>;

    let k2Prime = this.getK(message, hasher);

    if (this.isSecp256k1(this.curve)) {
      R1 = this.curve.ProjectivePoint.fromAffine(R1Affine);
      R2 = this.curve.ProjectivePoint.BASE.multiply(k2Prime);
    } else {
      // TODO: implement for ed25519
      throw new Error("SchnorrSigner: ed25519 is not supported");
    }

    let R = R2.add(R1);
    let k2 = k2Prime;

    if (!R.hasEvenY()) {
      R = R.negate();
      k2 = this.negateScalar(k2Prime);
    }

    let tppk = this.curve.ProjectivePoint.fromHex(
      this.getTwoPartyPublicKey(options.partnerPublicKey)
    );

    let d = arrayToBigInt(this.privateKey);
    const { tweakedPublicKey, negate } = this.tweakPublicKey(tppk);
    tppk = tweakedPublicKey;

    if (negate) {
      d = this.negateScalar(d);
    }

    const tppkX = tppk.toAffine().x;
    const Rx = R.toAffine().x;
    const e = this.getE(Rx, tppkX, message, hasher);

    const s2 = (k2 + e * d) % this.curve.CURVE.n;
    const { x: R2x, y: R2y } = R2.toAffine();

    return { R2: { x: R2x, y: R2y }, c3: s2 };
  }

  getPublicKeyFromSignature(
    message: Uint8Array,
    signature: Signature,
    hasher: Hasher
  ): Uint8Array {
    throw new Error("Method not implemented.");
  }
}
