import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { MsgUpdateFreebie } from "../../ts-proto/heim/heim/tx";

export class UpdateFreebieMessage extends Message {
  message: MsgUpdateFreebie;

  constructor(message: MsgUpdateFreebie) {
    super(MessageTypeUrl.UpdateFreebie);
    this.message = message;
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {
    const message = {
      creator: this.message.creator,
      ownedAddress: this.message.ownedAddress,
      active: this.message.active,
      amountLimit: this.message.amountLimit,
      dayLength: this.message.dayLength,
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: MsgUpdateFreebie.fromPartial(message),
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
