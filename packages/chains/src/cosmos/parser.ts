import { BaseTransaction, TransactionParser } from "../base/parser";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";

export class CosmosTransactionParser implements TransactionParser {
  parseTransaction(rawTransaction: Uint8Array): BaseTransaction {
    // TODO: Implement this
    const baseTransaction: BaseTransaction = {
      from: "",
      to: "",
      value: "",
      data: "",
    };

    return baseTransaction;
  }
}
