import { StdFee } from "@cosmjs/launchpad";
import { Message, MessageTypeUrl } from "..";
import { MsgRequestCreateOwnedAccount } from "../../ts-proto/heim/heim/tx";

type RequestCreateOwnedAccountParams = {
  creator: string;
  ecdsaPublicKey: string;
  eddsaPublicKey: string;
  ownedAccountRequester: string;
};

export class RequestCreateOwnedAccountMessage extends Message {
  message: MsgRequestCreateOwnedAccount;

  constructor(params: RequestCreateOwnedAccountParams) {
    super(MessageTypeUrl.RequestCreateOwnedAccount, "ueurheim");

    this.message = MsgRequestCreateOwnedAccount.fromPartial({
      creator: params.creator,
      ecdsaPublicKey: params.ecdsaPublicKey,
      eddsaPublicKey: params.eddsaPublicKey,
      ownedAccountRequester: params.ownedAccountRequester,
    });
  }

  getTypeUrl(): string {
    return MessageTypeUrl.RequestCreateOwnedAccount;
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
