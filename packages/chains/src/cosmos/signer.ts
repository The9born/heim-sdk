import { ripemd160, sha256 } from "ethers/lib/utils";
import { toBech32 } from "@cosmjs/encoding";
import { AffinePoint, EcdsaSigner, sha256Hasher } from "@the9born/crypto";
import { ChainSigner, ChainSignerOptions } from "../base";
import { SignDoc, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { getPrefixFromNetworkId } from "../helpers";

type CosmosChainSignerOptions = Omit<ChainSignerOptions<EcdsaSigner>, "hasher">;

export class CosmosChainSigner extends ChainSigner<EcdsaSigner> {
  private prefix: string;

  static getAddressFromPublicKey(publicKey: Uint8Array, prefix: string) {
    const publicKeyHex = `0x${Buffer.from(publicKey).toString("hex")}`;
    const hash = ripemd160(sha256(publicKeyHex)).substring(2);

    return toBech32(prefix, Buffer.from(hash, "hex"));
  }

  constructor(options: CosmosChainSignerOptions) {
    super({ ...options, hasher: sha256Hasher });
    this.prefix = getPrefixFromNetworkId(options.networkId);
  }

  getAddress(): string {
    const publicKey = this.getPublicKey();
    const address = CosmosChainSigner.getAddressFromPublicKey(
      publicKey,
      this.prefix
    );

    return address;
  }

  getTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    const publicKey = this.getTwoPartyPublicKey(partnerPublicKey);
    const address = CosmosChainSigner.getAddressFromPublicKey(
      publicKey,
      this.prefix
    );
    return address;
  }
  getMPCTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    const publicKey = this.getMPCTwoPartyPublicKey(partnerPublicKey);
    const address = CosmosChainSigner.getAddressFromPublicKey(
      publicKey,
      this.prefix
    );
    return address;
  }

  finalizeTransaction(
    // message is output from makeSignBytes
    message: Buffer,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    c3: bigint
  ): Uint8Array {
    const signature = this.getSignature(
      message,
      responderPublicKey,
      k1,
      R2,
      c3
    );

    const signDoc = SignDoc.decode(message);

    const transaction = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [signature],
    });

    const txBytes = TxRaw.encode(transaction).finish();

    return txBytes;
  }

  finalizeMPCTransaction(
    message: Buffer,
    signature: Uint8Array
  ): Uint8Array {
    const signDoc = SignDoc.decode(message);

    const transaction = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [signature],
    });

    const txBytes = TxRaw.encode(transaction).finish();

    return txBytes;
  }
}
