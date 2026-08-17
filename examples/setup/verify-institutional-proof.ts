import { getProvider } from "../stubs";
import { MessageTypeUrl } from "@the9born/providers/src/messages/typeUrl";
import { MsgVerifyInstitutionalProof } from "@the9born/providers/src/ts-proto/heim/heim/tx";
import { SimpleMessage } from "@the9born/providers/src/messages/heim/simpleMessage";
import { CosmosChainSigner, Network } from "../../packages/chains/src";
import { secp256k1 } from "@noble/curves/secp256k1";
import { EcdsaSigner } from "@the9born/crypto";
import Long from "long";

// == Authority ==
const authority = {
    address: "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
    privateKey:
        "0x7f4c93786641f0812626766606a57c4f7e88b221eac5c034e004e2954e7aae3e",
};

// == Message ==
const msg = {
    id: Long.ZERO,
    creator: authority.address,
    errorBit: 0,
};

const main = async () => {
    const message = new SimpleMessage<MsgVerifyInstitutionalProof>(
        MessageTypeUrl.VerifyInstitutionalProof,
        MsgVerifyInstitutionalProof.fromPartial,
        msg,
        true
    );

    const ecdsaSigner = new EcdsaSigner({
        privateKey: Buffer.from(authority.privateKey.substring(2), "hex"),
        curve: secp256k1,
    });

    const signer = new CosmosChainSigner({
        networkId: Network.Heim,
        // @ts-ignore
        signer: ecdsaSigner,
    });

    const provider = await getProvider(signer);

    const response = await provider.signAndSend(
        // @ts-ignore
        message,
        authority.address
    );
    console.log("Response: ", response);
};

main();
