import { ethers } from "ethers";
import { TransactionParser, BaseTransaction } from "../base/parser";

type EVMTransaction = {
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  nonce: string;
  chainId: string;
};

export class EVMTransactionParser implements TransactionParser {
  parseTransaction(rawTransaction: Uint8Array): BaseTransaction {
    const { from, to, value, data, gasLimit, gasPrice, nonce, chainId } =
      ethers.utils.parseTransaction(rawTransaction);

    const parsedTransaction: EVMTransaction = {
      from,
      to,
      value: value.toString(),
      data,
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice?.toString(),
      nonce: nonce.toString(),
      chainId: chainId.toString(),
    };

    return parsedTransaction;
  }
}
