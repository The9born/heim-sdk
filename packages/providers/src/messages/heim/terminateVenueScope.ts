import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { MsgTerminateVenueScope } from "../../ts-proto/heim/heim/tx";

export class TerminateVenueScopeMessage extends Message {
  message: MsgTerminateVenueScope;

  constructor(message: MsgTerminateVenueScope) {
    super(MessageTypeUrl.TerminateVenueScope);
    this.message = message;
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {
    const message = {
      creator: this.message.creator,
      venueScopeIndex: this.message.venueScopeIndex,
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: MsgTerminateVenueScope.fromPartial(message),
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
