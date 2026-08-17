import { Transaction } from "ethers";

export type BaseTransaction = {
  from: string;
  to: string;
  value: string;
  data: string;
};

export interface TransactionParser {
  parseTransaction(rawTransaction: Uint8Array): BaseTransaction;
}
