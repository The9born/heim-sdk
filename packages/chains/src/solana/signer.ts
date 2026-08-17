import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { ChainSigner, ChainSignerOptions } from "../base";
import { EddsaSigner, AffinePoint, Hasher } from "@the9born/crypto";

const identityHasher: Hasher = {
    hash: (message: Uint8Array) => Buffer.from(message),
};

type SolanaChainSignerOptions = Omit<ChainSignerOptions<EddsaSigner>, "hasher">;

export class SolanaChainSigner extends ChainSigner<EddsaSigner> {

    constructor(options: SolanaChainSignerOptions) {
        super({ ...options, hasher: identityHasher });
    }

    getAddress(): string {
        const publicKey = this.signer.getPublicKey();
        return new PublicKey(publicKey).toBase58();
    }

    getTwoPartyAddress(partnerPublicKey: Uint8Array): string {
        const publicKey = this.getTwoPartyPublicKey(partnerPublicKey);
        return new PublicKey(publicKey).toBase58();
    }

    getMPCTwoPartyAddress(partnerPublicKey: Uint8Array): string {
        const publicKey = this.getMPCTwoPartyPublicKey(partnerPublicKey);
        return new PublicKey(publicKey).toBase58();
    }

    finalizeTransaction(
        message: Buffer,
        responderPublicKey: Uint8Array,
        k1: bigint,
        R2: AffinePoint,
        sPrime: bigint | Uint8Array
    ): Uint8Array {
        const signature = this.getSignature(
            message,
            responderPublicKey,
            k1,
            R2,
            sPrime
        );
        return this.finalizeMPCTransaction(message, signature);
    }

    finalizeMPCTransaction(
        message: Buffer,
        signature: Uint8Array
    ): Uint8Array {
        const publicKey = new PublicKey(this.getPublicKey());

        try {
            const transaction = Transaction.from(message);
            transaction.addSignature(publicKey, Buffer.from(signature));
            return Buffer.from(transaction.serialize({ verifySignatures: false }));
        } catch (e) {
            try {
                const transaction = VersionedTransaction.deserialize(message);
                transaction.addSignature(publicKey, signature);
                return Buffer.from(transaction.serialize());
            } catch (innerError) {
                throw new Error("Failed to finalize Solana transaction: invalid transaction format");
            }
        }
    }
}

