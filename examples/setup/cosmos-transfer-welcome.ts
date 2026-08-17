import { ecdsaSignerRequester, rpcUrl } from "../stubs";
import { hexToBytes } from "@the9born/utils/src";
import { SigningStargateClient, coins } from "@cosmjs/stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { Network } from "@the9born/chains/src";
import { ChainSignerFactory } from "@the9born/chains/src";

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
const heimChainSignerRequester = ChainSignerFactory.fromSigner(
  Network.Heim,
  ecdsaSignerRequester
);
const recipient = heimChainSignerRequester.getAddress();
// const recipient = "heim1rh5qgmjl79404n4yh29etf5fe3tfyraqpmjr80"
const amount = coins(1, "welcomeh");

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
  const response = await signingClient.sendTokens(
    account.address,
    recipient,
    amount,
    fee
  );
  console.log("Response: ", response);

  signingClient.disconnect();
};

main();
