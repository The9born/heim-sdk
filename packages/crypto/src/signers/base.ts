import { Hasher } from "../hashers";
import { SchnorrCurve } from "./schnorr";
import { EddsaCurve } from "./eddsa";

export type Curve = SchnorrCurve | EddsaCurve | EddsaCurve;

export enum DerivationPath {
  Heim = "m/44'/777'/0'/0/0",
  Bitcoin = "m/86'/0'/0'/0/0", // Taproot
  HeimSecond = "m/44'/777'/0'/0/1",
}

export type Signature = {
  r: bigint;
  s: bigint;
  recoveryBit: 0 | 1;
};

export interface SignerOptions<T extends Curve> {
  privateKey: Uint8Array;
  curve: T;
}

export type AffinePoint = {
  x: bigint;
  y: bigint;
};

export interface SignatureRequestParams {
  k1: bigint;
  R1: AffinePoint;
}

export interface SignatureResponseParams {
  c3: bigint | Uint8Array;
  R2: AffinePoint;
}

export abstract class Signer<T extends Curve> {
  protected privateKey: Uint8Array;
  protected publicKey: Uint8Array;
  protected curve: T;

  constructor({ privateKey, curve }: SignerOptions<T>) {
    const publicKey = curve.getPublicKey(privateKey);

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.curve = curve;
  }

  sign(message: Uint8Array, hasher: Hasher): Uint8Array {
    const digest = hasher.hash(message);
    let signature = this.curve.sign(digest, this.privateKey);

    if (!(signature instanceof Uint8Array)) {
      signature = signature.toCompactRawBytes();
    }

    return signature;
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  abstract getPublicKeyFromSignature(
    message: Uint8Array,
    signature: Signature,
    hasher: Hasher
  ): Uint8Array;

  abstract getTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array;

  abstract getMPCTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array;

  abstract getK(message: Uint8Array, hasher: Hasher): bigint;

  abstract initializeSignature(
    message: Uint8Array,
    hasher: Hasher
  ): SignatureRequestParams;

  abstract generateSignature(
    message: Uint8Array,
    hasher: Hasher,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    c3: bigint | Uint8Array
  ): Buffer;

  abstract getSignatureResponseParams(
    messsage: Uint8Array,
    hasher: Hasher,
    R1: AffinePoint,
    options: {
      partnerPrivateKeyEncrypted?: bigint;
      partnerPublicKey?: Uint8Array;
    }
  ): SignatureResponseParams;
}
