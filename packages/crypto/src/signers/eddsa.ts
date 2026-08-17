import { ethers } from "ethers";
import { sha512 } from "@noble/hashes/sha512";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";
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
import { generatePrivateKeyFromSeed } from "./helpers";
import { ed25519 } from "@noble/curves/ed25519";

export const ed25519Curve = ed25519;
export type EddsaCurve = typeof ed25519;

export interface EddsaSignerOptions extends SignerOptions<EddsaCurve> { }

export class EddsaSigner extends Signer<EddsaCurve> {
  static fromSeed({
    seed,
    ...options
  }: Omit<EddsaSignerOptions, "privateKey"> & { seed: Uint8Array }) {
    const privateKey = generatePrivateKeyFromSeed(seed, DerivationPath.Heim);

    return new EddsaSigner({ ...options, privateKey });
  }

  static fromMnemonic({
    mnemonic,
    ...options
  }: Omit<EddsaSignerOptions, "privateKey"> & { mnemonic: string }) {
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

  getPublicKeyFromSignature(
    message: Uint8Array,
    signature: Signature,
    hasher: Hasher
  ): Uint8Array {
    throw new Error("Method not implemented.");
  }

  private leBytesToBigInt(bytes: Uint8Array): bigint {
    return BigInt("0x" + Buffer.from(bytes).reverse().toString("hex"));
  }

  private bigintToLeBuffer32(bn: bigint): Uint8Array {
    const hex = bn.toString(16).padStart(64, "0");
    return Buffer.from(hex, "hex").reverse();
  }

  private clamp(bytes: Uint8Array): Uint8Array {
    const res = new Uint8Array(bytes);
    res[0] &= 0xf8;
    res[31] &= 0x7f;
    res[31] |= 0x40;
    return res;
  }

  private getChallenge(
    R: Uint8Array,
    tppk: Uint8Array,
    message: Uint8Array
  ): bigint {
    const kh = sha512.create();
    kh.update(R);
    kh.update(tppk);
    kh.update(message);
    const digest = kh.digest();
    return this.leBytesToBigInt(digest) % ed25519.CURVE.n;
  }

  getTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    const A0 = this.getPublicKey();
    const A1 = partnerPublicKey;

    const HA0A1 = sha256(Buffer.concat([A0, A1]));
    const HA1A0 = sha256(Buffer.concat([A1, A0]));

    const a0 = this.leBytesToBigInt(this.clamp(HA0A1)) % ed25519.CURVE.n;
    const a1 = this.leBytesToBigInt(this.clamp(HA1A0)) % ed25519.CURVE.n;

    const A0Point = ed25519.ExtendedPoint.fromHex(A0);
    const A1Point = ed25519.ExtendedPoint.fromHex(A1);

    const a0A0 = A0Point.multiply(a0);
    const a1A1 = A1Point.multiply(a1);

    return a0A0.add(a1A1).toRawBytes();
  }

  getMPCTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    const cosignerBPublicPoint = ed25519.ExtendedPoint.fromHex(partnerPublicKey);
    const cosignerAPublicKey = ed25519.ExtendedPoint.fromHex(this.publicKey);
    const combinedPublicKeyLocalPoint = cosignerAPublicKey.add(cosignerBPublicPoint);
    return combinedPublicKeyLocalPoint.toRawBytes();
  }

  getK(message: Uint8Array, hasher: Hasher): bigint {
    const seed = this.privateKey.slice(0, 32);
    const h = sha512(seed);
    const prefix = h.slice(32);

    const z = randomBytes(32);
    z[0] &= 0x7f; // Clearing bit 255 (MSB in big-endian)

    const M = sha256(message);

    const context = sha512.create();
    context.update(prefix);
    context.update(M);
    context.update(z);
    const digest = context.digest();

    return this.leBytesToBigInt(digest) % ed25519.CURVE.n;
  }

  constructor(options: EddsaSignerOptions) {
    super(options);
  }

  initializeSignature(
    message: Uint8Array,
    hasher: Hasher
  ): SignatureRequestParams {
    const k1 = this.getK(message, hasher);
    const R1 = ed25519.ExtendedPoint.BASE.multiply(k1).toAffine();

    return {
      k1,
      R1: { x: R1.x, y: R1.y },
    };
  }

  generateSignature(
    message: Uint8Array,
    hasher: Hasher,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2Affine: AffinePoint,
    s2: bigint | Uint8Array
  ): Buffer {
    const R1 = ed25519.ExtendedPoint.BASE.multiply(k1);
    const R2Point = ed25519.ExtendedPoint.fromAffine({
      x: R2Affine.x,
      y: R2Affine.y,
    });
    const R_total = R1.add(R2Point);

    const tppk = this.getTwoPartyPublicKey(responderPublicKey);
    const k = this.getChallenge(R_total.toRawBytes(), tppk, message);

    const seed = this.privateKey.slice(0, 32);
    const h = sha512(seed);
    const x1 =
      this.leBytesToBigInt(this.clamp(h.slice(0, 32))) % ed25519.CURVE.n;

    const A1 = this.getPublicKey();
    const HA1_responder = sha256(Buffer.concat([A1, responderPublicKey]));
    const a1 =
      this.leBytesToBigInt(this.clamp(HA1_responder)) % ed25519.CURVE.n;

    const s1 = (k * ((a1 * x1) % ed25519.CURVE.n) + k1) % ed25519.CURVE.n;

    const s2_bigint = typeof s2 === "bigint" ? s2 : this.leBytesToBigInt(s2);
    const s_total = (s1 + s2_bigint) % ed25519.CURVE.n;

    const sig = Buffer.alloc(64);
    sig.set(R_total.toRawBytes(), 0);
    sig.set(this.bigintToLeBuffer32(s_total), 32);

    return sig;
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
      throw new Error("EddsaSigner: partnerPublicKey is required");
    }

    const R1 = ed25519.ExtendedPoint.fromAffine({ x: R1Affine.x, y: R1Affine.y });
    const r2 = this.getK(message, hasher);
    const R2 = ed25519.ExtendedPoint.BASE.multiply(r2);

    const R_total = R1.add(R2);
    const tppk = this.getTwoPartyPublicKey(options.partnerPublicKey);
    const k = this.getChallenge(R_total.toRawBytes(), tppk, message);

    const seed = this.privateKey.slice(0, 32);
    const h = sha512(seed);
    const x2 =
      this.leBytesToBigInt(this.clamp(h.slice(0, 32))) % ed25519.CURVE.n;

    const A2 = this.getPublicKey();
    const HA2_partner = sha256(Buffer.concat([A2, options.partnerPublicKey]));
    const a2 = this.leBytesToBigInt(this.clamp(HA2_partner)) % ed25519.CURVE.n;

    const s2 = (k * ((a2 * x2) % ed25519.CURVE.n) + r2) % ed25519.CURVE.n;

    const R2_affine = R2.toAffine();
    return {
      R2: { x: R2_affine.x, y: R2_affine.y },
      c3: s2,
    };
  }
}
