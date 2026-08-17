import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import {
  MsgResolveAdminRequest,
  MsgSignatureCancel,
} from "../../ts-proto/heim/heim/tx";
import { FixedGasPrice } from "../../provider";

export class CancelSignatureMessage extends Message {
  message: MsgSignatureCancel;

  constructor(message: MsgSignatureCancel) {
    super(MessageTypeUrl.SignatureCancel, "ueurheim");
    this.message = message;
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {
    const message = {
      creator: this.message.creator,
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: MsgResolveAdminRequest.fromPartial(message),
    };
  }

  getGasDenom(): string {
    return this.gasDenom;
  }

  formatFee(estimatedGas: number, granter?: string): StdFee {
    const fee = {
      amount: [
        {
          denom: this.gasDenom,
          amount: (
            parseFloat(FixedGasPrice) * parseInt(estimatedGas.toString())
          ).toString(),
        },
      ],
      gas: estimatedGas.toString(),
      ...(granter ? { granter } : {}),
    };

    return fee;
  }
}
