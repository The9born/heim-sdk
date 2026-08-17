import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { bytesToHex, hexStringToBase64 } from "@the9born/utils";
import {
  MsgSignatureRequestPrimary,
  MsgSignatureRequestSecondary,
} from "../../ts-proto/heim/heim/tx";
import { FixedGasPrice } from "../../provider";
import { Network } from "@the9born/chains";

export type SecondaryParams = {
  venueScopeIndex: number;
  recipientToken: string;
  presignInfo: string;
};

type RequestSignatureMessageType = {
  creator: string;
  networkId: string;
  secondary?: SecondaryParams;
  transaction: string;
  r1: string;
  virtualScreenAddress: string;
  virtualScreenTransaction: string;
};

type RequestSignatureMessageParams = {
  creator: string;
  networkId: string;
  secondary?: SecondaryParams;
  transaction: string | Uint8Array;
  r1: string;
  virtualScreenAddress: string;
  virtualScreenTransaction: string;
};

export class RequestSignatureMessage extends Message {
  message: RequestSignatureMessageType;

  constructor(message: RequestSignatureMessageParams) {
    super(
      message.secondary
        ? MessageTypeUrl.SignatureRequestSecondary
        : MessageTypeUrl.SignatureRequestPrimary,
      "ueurheim"
    );

    const txEncoded =
      message.networkId === Network.Lightning ||
      message.networkId === Network.LightningSignet
        ? message.transaction.toString()
        : bytesToHex(message.transaction).substring(2);

    this.message = {
      ...message,
      transaction: txEncoded,
    };
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {
    const message = {
      creator: this.message.creator,
      networkId: this.message.networkId,
      transaction:
        this.message.networkId === Network.Lightning ||
        this.message.networkId === Network.LightningSignet
          ? Buffer.from(this.message.transaction).toString("base64")
          : hexStringToBase64(this.message.transaction),
      r1: this.message.r1,
      virtualScreenAddress: this.message.virtualScreenAddress,
      virtualScreenTransaction:
        this.message.networkId === Network.Lightning ||
        this.message.networkId === Network.LightningSignet
          ? Buffer.from(this.message.virtualScreenTransaction).toString(
              "base64"
            )
          : hexStringToBase64(this.message.virtualScreenTransaction),
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: this.message.secondary
        ? MsgSignatureRequestSecondary.fromPartial({
            ...message,
            venueScopeIndex: this.message.secondary.venueScopeIndex,
            recipientToken: this.message.secondary.recipientToken,
            presignInfo: this.message.secondary.presignInfo,
          })
        : MsgSignatureRequestPrimary.fromPartial(message),
    };
  }

  getGasDenom(): string {
    return this.gasDenom;
  }

  formatFee(estimatedGas: number, granter?: string): StdFee {
    const feeAmount = [
      {
        denom: this.getGasDenom(),
        amount: (parseFloat(FixedGasPrice) * estimatedGas).toString(),
      },
    ];

    const fee = {
      amount: feeAmount,
      gas: estimatedGas.toString(),
      ...(granter ? { granter } : {}),
    };

    return fee;
  }
}
