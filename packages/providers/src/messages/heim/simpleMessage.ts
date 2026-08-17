import { FixedGasPrice } from "../../provider";
import { Message } from "./message";
import { MessageTypeUrl } from "../typeUrl";

export class SimpleMessage<T> extends Message {
  private message: T;
  private fromPartial: (object: any) => any;
  private isFreeMsg: boolean;

  constructor(
    typeUrl: MessageTypeUrl,
    fromPartial: (object: any) => any,
    message: T,
    isFreeMsg = false
  ) {
    super(typeUrl, "ueurheim");

    this.message = message;
    this.fromPartial = fromPartial;
    this.isFreeMsg = isFreeMsg;
  }

  serialize() {
    const serializedMessage = {
      typeUrl: this.typeUrl,
      value: this.fromPartial(this.message),
    };
    return serializedMessage;
  }

  formatFee(estimatedGas: string | number, granter?: string) {
    const feeAmount = this.isFreeMsg
      ? []
      : [
          {
            denom: this.gasDenom,
            amount: (
              parseFloat(FixedGasPrice) * parseInt(estimatedGas.toString())
            ).toString(),
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
