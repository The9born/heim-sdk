import {
  heimChainSignerRequester,
  heimChainSignerResponder,
  rpcUrl,
  CosignerBApi,
  cosignerBSeed,
} from "../stubs";
import { hexToBytes } from "@the9born/utils/src";
import { SigningStargateClient, coins } from "@cosmjs/stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { Network } from "@the9born/chains";

// == Authority ==
const authority = {
  address: "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
  privateKey:
    "0x7f4c93786641f0812626766606a57c4f7e88b221eac5c034e004e2954e7aae3e",
};
// Fixed fee for Cosmos Msg transfer
const fee = {
  amount: coins(10000, "ueurheim"),
  gas: "1000000",
};

// == Transfer ==
const cosignerBApi = new CosignerBApi(cosignerBSeed);
const heimAddress = cosignerBApi.getTwoPartyAddress(
  heimChainSignerRequester.getPublicKey(),
  Network.Heim
);
const recipient = ["heim1ccs2dyh0jk2uecrz86rtc2k7lp66vycxswrxsx"]; // primary and secondary account
const amount = coins(100000, "ueurheim");

const main = async () => {
  const wallet = await DirectSecp256k1Wallet.fromKey(
    hexToBytes(authority.privateKey),
    "heim"
  );
  const [account] = await wallet.getAccounts();
  const signingClient = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    wallet
  );
  for (let i = 0; i < recipient.length; i++) {
    const response = await signingClient.sendTokens(
      account.address,
      recipient[i],
      amount,
      fee
    );
    console.log("Response: ", response);
  }

  signingClient.disconnect();
};

main();
