import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { MsgCreateTradeIntentionResponses } from "../../ts-proto/heim/heim/tx";


export class RespondTradeIntentionMessage extends Message {
  message: MsgCreateTradeIntentionResponses;

  constructor(message: MsgCreateTradeIntentionResponses) {
    super(MessageTypeUrl.MsgCreateTradeIntentionResponses);
    this.message = message;
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {
    const message = {
      creator: this.message.creator,
      ...this.message,
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: MsgCreateTradeIntentionResponses.fromPartial(message),
    };
  }

  getGasDenom(): string {
    return this.gasDenom;
  }

  formatFee(estimatedGas: number, granter?: string): StdFee {
    const fee = {
      amount: [],
      gas: estimatedGas.toString(),
      ...(granter ? { granter } : {}),
    };

    return fee;
  }
}
