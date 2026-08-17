import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { bech32m } from "bech32";

import { ChainSigner, ChainSignerOptions } from "../base";
import { AffinePoint, SchnorrSigner, sha256Hasher } from "@the9born/crypto";
import { getPrefixFromNetworkId } from "../helpers";

type BtcChainSignerOptions = Omit<
  Omit<ChainSignerOptions<SchnorrSigner>, "hasher">,
  "curve"
>;

export class BtcChainSigner extends ChainSigner<SchnorrSigner> {
  private TAPROOT_WITNESS_VERSION = 1;
  private prefix: string;

  constructor(options: BtcChainSignerOptions) {
    super({ ...options, hasher: sha256Hasher });
    this.prefix = getPrefixFromNetworkId(options.networkId);
  }

  finalizeTransaction(
    message: Buffer,
    responderPublicKey: Uint8Array,
    k1: bigint,
    R2: AffinePoint,
    s2: Uint8Array
  ): Uint8Array {
    // const signature = super.getSignature(
    //   message,
    //   responderPublicKey,
    //   k1,
    //   R2,
    //   s2
    // );

    // const psbt = bitcoin.Psbt.fromBuffer(message);
    // psbt.data.updateInput(0, { tapKeySig: Buffer.from(signature) });
    // psbt.finalizeAllInputs();

    // const tx = psbt.extractTransaction();

    // return tx.toBuffer();
    throw new Error("Not implemented");
  }

  finalizeMPCTransaction(
    message: Buffer,
    signature: Uint8Array
  ): Uint8Array {
    throw new Error("Not implemented");
  }

  getTweakedPublicKey(pubkey: Uint8Array): Uint8Array {
    const pubkeyX = pubkey.subarray(1);
    const tweak = bitcoin.crypto.taggedHash("TapTweak", Buffer.from(pubkeyX));
    const { xOnlyPubkey } = ecc.xOnlyPointAddTweak(pubkeyX, tweak);

    return xOnlyPubkey;
  }

  getTaprootAddress(pubkey: Uint8Array): string {
    const tweakedPubkey = this.getTweakedPublicKey(pubkey);

    const words = bech32m.toWords(tweakedPubkey);
    words.unshift(this.TAPROOT_WITNESS_VERSION);
    const address = bech32m.encode(this.prefix, words);

    return address;
  }

  getAddress(): string {
    const pubkey = this.getPublicKey();
    const address = this.getTaprootAddress(pubkey);

    return address;
  }

  getTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    const tppk = this.getTwoPartyPublicKey(partnerPublicKey);
    const address = this.getTaprootAddress(tppk);

    return address;
  }
  getMPCTwoPartyAddress(partnerPublicKey: Uint8Array): string {
    const tppk = this.getMPCTwoPartyPublicKey(partnerPublicKey);
    const address = this.getTaprootAddress(tppk);

    return address;
  }

  getTwoPartyPublicKeyTweak(partnerPublicKey: Uint8Array): Uint8Array {
    const tppk = this.getTwoPartyPublicKey(partnerPublicKey);
    const tppkX = tppk.subarray(1);
    // TODO: add data for custom locking scripts when calculating the tweak
    const tweak = bitcoin.crypto.taggedHash("TapTweak", Buffer.from(tppkX));

    return tweak;
  }
}
