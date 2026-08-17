import { Signer, Hasher, Curve, AffinePoint } from "@the9born/crypto";
import { Network } from "../config";

export interface ChainSignerOptions<T extends Signer<Curve>> {
  networkId: Network;
  hasher: Hasher;
  signer: T;
}

export abstract class ChainSigner<T extends Signer<Curve>> {
  protected networkId: Network;
  protected hasher: Hasher;
  protected signer: T;

  constructor({ hasher, signer, networkId }: ChainSignerOptions<T>) {
    this.networkId = networkId;
    this.hasher = hasher;
    this.signer = signer;
  }

  getNetworkId(): Network {
    return this.networkId;
  }

  getSigner(): T {
    return this.signer;
  }

  getDigest(message: Buffer): Buffer {
    const digest = this.hasher.hash(message);

    return digest;
  }

  getPublicKey(): Uint8Array {
    const publicKey = this.signer.getPublicKey();

    return publicKey;
  }

  getTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    const twoPartyPublicKey =
      this.signer.getTwoPartyPublicKey(partnerPublicKey);

    return twoPartyPublicKey;
  }

  getMPCTwoPartyPublicKey(partnerPublicKey: Uint8Array): Uint8Array {
    const twoPartyPublicKey = this.signer.getMPCTwoPartyPublicKey(partnerPublicKey);
    return twoPartyPublicKey;
  }

  initializeSignature(message: Uint8Array) {
    return this.signer.initializeSignature(message, this.hasher);
  }

  sign(message: Buffer): Uint8Array {
    const signature = this.signer.sign(message, this.hasher);

    return signature;
  }

  getSignatureResponseParams(
    message: Buffer,
    R1: AffinePoint,
    options: {
      partnerPrivateKeyEncrypted?: bigint;
      partnerPublicKey?: Uint8Array;
    }
  ) {
    const params = this.signer.getSignatureResponseParams(
      message,
      this.hasher,
      R1,
      options
    );

    return params;
  }

  getSignature(
    message: Buffer,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    sPrime: bigint | Uint8Array
  ): Uint8Array {
    const ecdsaSignature = this.signer.generateSignature(
      message,
      this.hasher,
      responderPublicKey,
      k1,
      R2,
      sPrime
    );

    return ecdsaSignature;
  }

  abstract finalizeTransaction(
    message: Buffer,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    sPrime: bigint | Uint8Array
  ): Uint8Array;

  abstract finalizeMPCTransaction(
    message: Buffer,
    signature: Uint8Array
  ): Uint8Array;

  abstract getAddress(): string;

  abstract getTwoPartyAddress(partnerPublicKey: Uint8Array): string;
  abstract getMPCTwoPartyAddress(partnerPublicKey: Uint8Array): string;
}
