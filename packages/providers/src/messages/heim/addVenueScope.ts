import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { MsgAddVenueScope } from "../../ts-proto/heim/heim/tx";

export class AddVenueScopeMessage extends Message {
  message: MsgAddVenueScope;

  constructor(message: MsgAddVenueScope) {
    super(MessageTypeUrl.AddVenueScope);
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
      description: this.message.description,
      amountLimit: this.message.amountLimit,
      start: this.message.start,
      end: this.message.end,
      personalNetworkIds: this.message.personalNetworkIds,
      personalAddresses: this.message.personalAddresses,
      personalAliases: this.message.personalAliases,
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: MsgAddVenueScope.fromPartial(message),
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
