import { StdFee } from "@cosmjs/launchpad";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";
import { FixedGasPrice } from "../../provider";
import {
  MsgRespondCreateOwnedAccount,
  MsgSignatureRequestOwned,
} from "../../ts-proto/heim/heim/tx";
import { Network } from "@the9born/chains";

type RequestSignatureOwnedParams = {
  creator: string;
  r1: Uint8Array;
  tx: Uint8Array;
  networkId: Network;
  venueScopeIndex: number;
};

export class RequestSignatureOwnedMessage extends Message {
  message: MsgSignatureRequestOwned;

  constructor(params: RequestSignatureOwnedParams) {
    super(MessageTypeUrl.SignatureRequestOwned, "ueurheim");

    this.message = MsgSignatureRequestOwned.fromPartial({
      creator: params.creator,
      r1: Buffer.from(params.r1).toString("base64"),
      transaction: Buffer.from(params.tx).toString("base64"),
      networkId: params.networkId,
      venueScopeIndex: params.venueScopeIndex,
    });
  }

  getTypeUrl(): string {
    return MessageTypeUrl.SignatureRequestOwned;
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
