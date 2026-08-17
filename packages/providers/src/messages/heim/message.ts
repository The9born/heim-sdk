import { StdFee } from "@cosmjs/launchpad";
import { Serializable } from "./types";
import { MessageTypeUrl, messageTypeUrlToProtoHandler } from "../typeUrl";
import { Int53 } from "@cosmjs/math";
import {
  encodePubkey,
  makeAuthInfoBytes,
  TxBodyEncodeObject,
  makeSignDoc,
  EncodeObject,
  Registry,
  makeSignBytes,
} from "@cosmjs/proto-signing";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { HeimProvider, getHeimRegistry } from "../../provider";
import { SignDoc, TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";

export abstract class Message implements Serializable {
  readonly typeUrl: MessageTypeUrl;
  readonly gasDenom?: string;
  readonly registry: Registry;

  constructor(typeUrl: MessageTypeUrl, gasDenom?: string) {
    this.typeUrl = typeUrl;
    this.gasDenom = gasDenom;
    this.registry = getHeimRegistry();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract serialize(): EncodeObject;

  abstract formatFee(estimatedGas: number | string, granter?: string): StdFee;

  static async getMessageFromSignBytes(
    signedBytes: Uint8Array,
    registry: Registry
  ): Promise<TxBody> {
    const signDocDecoded = SignDoc.decode(signedBytes);
    const unsignedBytes = signDocDecoded.bodyBytes;
    const txBody = registry.decodeTxBody(unsignedBytes);
    return txBody;
  }

  async getUnsignedData(
    senderAddress: string,
    senderPublicKey: Uint8Array,
    provider: HeimProvider,
    granter?: string
  ) {
    const message = this.serialize();

    const { estimatedGas, sequence, accountNumber } =
      await provider.estimateGas({ senderAddress, messages: [message] });

    const fee = this.formatFee(estimatedGas, granter);

    const txBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: [message],
        memo: "",
      },
    };

    const txBodyBytes = this.registry.encode(txBodyEncodeObject);
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    const pubkey = encodePubkey(encodeSecp256k1Pubkey(senderPublicKey));

    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence }],
      fee.amount,
      gasLimit,
      granter,
      undefined
    );

    const chainId = await provider.getChainId();
    const signDoc = makeSignDoc(
      txBodyBytes,
      authInfoBytes,
      chainId,
      accountNumber
    ) as SignDoc;

    const signBytes = makeSignBytes(signDoc);

    return { signDoc, signBytes };
  }
}
