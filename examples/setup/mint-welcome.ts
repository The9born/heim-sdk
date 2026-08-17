import { getProvider } from "../stubs";
import { MessageTypeUrl } from "@the9born/providers/src/messages/typeUrl";
import { MsgMintWelcomeToken } from "@the9born/providers/src/ts-proto/heim/heim/tx";
import { SimpleMessage } from "@the9born/providers/src/messages/heim/simpleMessage";
import Long from "long";
import { CosmosChainSigner, Network } from "../../packages/chains/src";
import { secp256k1 } from "@noble/curves/secp256k1";
import { EcdsaSigner } from "@the9born/crypto";

// == Authority ==
const authority = {
  address: "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
  privateKey:
    "0x7f4c93786641f0812626766606a57c4f7e88b221eac5c034e004e2954e7aae3e",
};

// == Message ==
const msg = {
  creator: authority.address,
  amount: Long.fromNumber(100),
};

const main = async () => {
  const message = new SimpleMessage<MsgMintWelcomeToken>(
    MessageTypeUrl.MintWelcomeToken,
    MsgMintWelcomeToken.fromPartial,
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
