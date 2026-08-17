import { Transaction } from "@solana/web3.js";
import { TransactionParser, BaseTransaction } from "../base/parser";

export class SolanaTransactionParser implements TransactionParser {
    parseTransaction(rawTransaction: Uint8Array): BaseTransaction {
        try {
            const tx = Transaction.from(rawTransaction);

            const instructions = tx.instructions;
            const firstIx = instructions[0];

            const from = tx.feePayer?.toBase58() || "";
            let to = "";
            let data = "";

            if (firstIx) {
                if (firstIx.keys.length > 1) {
                    to = firstIx.keys[1].pubkey.toBase58();
                }
                data = firstIx.data.toString("hex");
            }

            return {
                from,
                to,
                value: "0",
                data,
            };

        } catch (e) {
            // console.error("Failed to parse Solana transaction", e);
            return {
                from: "",
                to: "",
                value: "0",
                data: "",
            };
        }
    }
}
