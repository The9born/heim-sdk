import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { hexStringToBase64 } from "@the9born/utils";
import { MsgSignatureResponse } from "../../ts-proto/heim/heim/tx";
import Long from "long";
import { FixedGasPrice } from "../../provider";

type SignatureResponseMessageParams = {
  responderAddress: string;
  requestIndex: Long;
  r2: string;
  c3: string;
};

export class SignatureResponseMessage extends Message {
  private responderAddress: string;
  private requestIndex: Long;
  private r2: string;
  private c3: string;

  constructor({
    responderAddress,
    requestIndex,
    r2,
    c3,
  }: SignatureResponseMessageParams) {
    super(MessageTypeUrl.SignatureResponse, "ueurheim");

    this.c3 = c3;
    this.r2 = r2;
    this.responderAddress = responderAddress;
    this.requestIndex = requestIndex;
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {

    const message = {
      isSecondary: false as never,
      creator: this.responderAddress,
      signatureRequestIndex: this.requestIndex,
      r2: hexStringToBase64(this.r2),
      c3: hexStringToBase64(this.c3),
    };

    const serializedMessage = {
      typeUrl: this.getTypeUrl(),
      value: MsgSignatureResponse.fromPartial(message),
    };

    return serializedMessage;
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
