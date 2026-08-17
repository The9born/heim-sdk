import { ethers } from "ethers";
import { joinSignature } from "ethers/lib/utils";
import { AffinePoint, EcdsaSigner, keccak256Hasher } from "@the9born/crypto";
import { ChainSigner, ChainSignerOptions } from "../base";
import { Network } from "../config";

const BASE_RECOVERY_V = 27;
const EIP155_V_OFFSET = 35;

type EvmChainSignerOptions = Omit<ChainSignerOptions<EcdsaSigner>, "hasher">;

export class EvmChainSigner extends ChainSigner<EcdsaSigner> {
  private chainId: number;

  static getAddressFromPublicKey(publicKey: Uint8Array): string {
    const publicKeyHex = `0x${Buffer.from(publicKey).toString("hex")}`;
    const address = ethers.utils.computeAddress(publicKeyHex);

    return address;
  }

  constructor(options: EvmChainSignerOptions) {
    super({ ...options, hasher: keccak256Hasher });
    this.initializeChainId(this.networkId);
  }

  private initializeChainId(networkId: Network) {
    const chainId = parseInt(this.networkId.split("--")[1]);
    if (!chainId) {
      throw new Error("Chain id for evm signer is undefined");
    }

    this.chainId = chainId;
  }

  getTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    const publicKey = this.getTwoPartyPublicKey(partnerPublicKey);
    const address = EvmChainSigner.getAddressFromPublicKey(publicKey);

    return address;
  }
  getMPCTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    const publicKey = this.getMPCTwoPartyPublicKey(partnerPublicKey);
    const address = EvmChainSigner.getAddressFromPublicKey(publicKey);
    return address;
  }


  getAddress(): string {
    const publicKey = this.signer.getPublicKey();
    const address = EvmChainSigner.getAddressFromPublicKey(publicKey);

    return address;
  }

  calculateV(
    digest: Uint8Array,
    { r, s }: { r: string; s: string },
    expectedAddress: string,
    chainId?: number
  ) {
    const recoveryBits = [0, 1];

    for (let bit of recoveryBits) {
      const v = !chainId
        ? bit + BASE_RECOVERY_V
        : bit + EIP155_V_OFFSET + chainId * 2;

      const recoveredAddress = ethers.utils.recoverAddress(digest, {
        r,
        s,
        v,
      });

      if (recoveredAddress === expectedAddress) {
        return v;
      }
    }

    throw Error("Unable to calculate valid v from transaction");
  }

  getSignature(
    message: Buffer,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    c3: bigint | Uint8Array
  ): Uint8Array {
    if (typeof c3 !== "bigint") {
      c3 = BigInt(`0x${Buffer.from(c3).toString("hex")}`);
    }

    const signature = super.getSignature(
      message,
      responderPublicKey,
      k1,
      R2,
      c3
    );

    const [r, s] = [signature.slice(0, 32), signature.slice(32, 64)];
    const { chainId } = ethers.utils.parseTransaction(message);
    const expectedAddress = this.getTwoPartyAddress(responderPublicKey);
    const digest = this.getDigest(message);

    const rHex = `0x${Buffer.from(r).toString("hex")}`;
    const sHex = `0x${Buffer.from(s).toString("hex")}`;

    const v = this.calculateV(
      digest,
      { r: rHex, s: sHex },
      expectedAddress,
      chainId
    );

    const evmSignature = Buffer.from(
      joinSignature({
        v,
        r: rHex,
        s: sHex,
      }).substring(2),
      "hex"
    );

    return evmSignature;
  }

  finalizeTransaction(
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

    const { v, r, s, ...rawTx } = ethers.utils.parseTransaction(message);
    const signedTx = ethers.utils.serializeTransaction(rawTx, signature);

    return Buffer.from(signedTx.substring(2), "hex");
  }

  finalizeMPCTransaction(
    message: Buffer,
    signature: Uint8Array,
  ): Uint8Array {
    const { v, r, s, ...rawTx } = ethers.utils.parseTransaction(message);
    const signedTx = ethers.utils.serializeTransaction(rawTx, signature);
    return Buffer.from(signedTx.substring(2), "hex");
  }
}
