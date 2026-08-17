import { StdFee } from "@cosmjs/launchpad";
import { Message, MessageTypeUrl } from "..";
import { MsgRespondCreateOwnedAccount } from "../../ts-proto/heim/heim/tx";

type RespondCreateOwnedAccountParams = {
  creator: string;
};

export class RespondCreateOwnedAccountMessage extends Message {
  message: MsgRespondCreateOwnedAccount;

  constructor(params: RespondCreateOwnedAccountParams) {
    super(MessageTypeUrl.RespondCreateOwnedAccount, "ueurheim");

    this.message = MsgRespondCreateOwnedAccount.fromPartial({
      creator: params.creator,
    });
  }

  getTypeUrl(): string {
    return MessageTypeUrl.RespondCreateOwnedAccount;
  }

  serialize(): { typeUrl: string; value: any } {
    return { typeUrl: this.getTypeUrl(), value: this.message };
  }

  formatFee(estimatedGas: number | string, granter?: string): StdFee {
    const fee = {
      amount: [],
      gas: estimatedGas.toString(),
      ...(granter ? { granter } : {}),
    };

    return fee;
  }
}
