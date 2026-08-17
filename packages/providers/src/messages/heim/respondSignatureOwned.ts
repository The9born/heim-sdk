import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { FixedGasPrice } from "../../provider";
import { MsgSignatureResponseOwned } from "../../ts-proto/heim/heim/tx";

type RespondSignatureOwnedParams = {
  creator: string;
  requestId: string;
  r2: Uint8Array;
  c3: Uint8Array;
};

export class RespondSignatureOwnedMessage extends Message {
  message: MsgSignatureResponseOwned;

  constructor(params: RespondSignatureOwnedParams) {
    super(MessageTypeUrl.SignatureResponseOwned, "ueurheim");

    this.message = MsgSignatureResponseOwned.fromPartial({
      creator: params.creator,
      signatureRequestId: params.requestId,
      r2: Buffer.from(params.r2).toString("base64"),
      c3: Buffer.from(params.c3).toString("base64"),
    });
  }

  getTypeUrl(): string {
    return MessageTypeUrl.SignatureResponseOwned;
  }

  serialize(): { typeUrl: string; value: any } {
    return { typeUrl: this.getTypeUrl(), value: this.message };
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
