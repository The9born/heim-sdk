import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { MsgUpdateVenueScope } from "../../ts-proto/heim/heim/tx";

export class UpdateVenueScopeMessage extends Message {
  message: MsgUpdateVenueScope;

  constructor(message: MsgUpdateVenueScope) {
    super(MessageTypeUrl.UpdateVenueScope);
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
      venueScopeIndex: this.message.venueScopeIndex,
      description: this.message.description,
      personalNetworkIds: this.message.personalNetworkIds,
      personalAliases: this.message.personalAliases,
      personalAddresses: this.message.personalAddresses,
      amountLimit: this.message.amountLimit,
      end: this.message.end,
    };

    return {
      typeUrl: this.getTypeUrl(),
      value: MsgUpdateVenueScope.fromPartial(message),
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
