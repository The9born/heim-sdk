import { AffinePoint, EcdsaSigner, sha256Hasher } from "@the9born/crypto";
import { ChainSigner, ChainSignerOptions } from "../base";

type LightningChainSignerOptions = Omit<
  ChainSignerOptions<EcdsaSigner>,
  "hasher"
>;

export class LightningNetworkSigner extends ChainSigner<EcdsaSigner> {
  finalizeTransaction(
    message: Buffer,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    c3: bigint | Uint8Array
  ): Uint8Array {
    const signature = super.getSignature(
      message,
      responderPublicKey,
      k1,
      R2,
      c3
    );

    const payload = Buffer.from(
      Buffer.from(signature).toString("hex") + message.toString("utf-8")
    );

    return payload;
  }

  finalizeMPCTransaction(
    message: Buffer,
    signature: Uint8Array
  ): Uint8Array {
    const payload = Buffer.from(
      Buffer.from(signature).toString("hex") + message.toString("utf-8")
    );
    return payload;
  }

  getAddress(): string {
    throw new Error("Method not implemented.");
  }

  getTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    throw new Error("Method not implemented.");
  }
  getMPCTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    throw new Error("Method not implemented.");
  }

  constructor(options: LightningChainSignerOptions) {
    super({ ...options, hasher: sha256Hasher });
  }
}
