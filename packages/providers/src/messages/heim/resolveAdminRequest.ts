import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { MsgResolveAdminRequest } from "../../ts-proto/heim/heim/tx";


export class ResolveAdminRequestMessage extends Message {
  message: MsgResolveAdminRequest;

  constructor(message: MsgResolveAdminRequest) {
    super(MessageTypeUrl.ResolveAdminRequest);
    this.message = message;
  }

  getTypeUrl(): string {
    return this.typeUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): { typeUrl: string; value: any } {
    const message = {
      creator: this.message.creator,
      confirm: this.message.confirm,
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
      amount: [],
      gas: estimatedGas.toString(),
      ...(granter ? { granter } : {}),
    };

    return fee;
  }
}
