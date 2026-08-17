import { Network } from "@the9born/chains/src";
import {
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
  eddsaSignerRequester,
  CosignerBApi,
  ownedAccountSeed,
  agentEndpoint,
  heimName,
  heimChainSignerOwnedAccount,
} from "./stubs";
import { PublicKey, encrypt } from "eciesjs";
import { hexStringToBase64 } from "@the9born/utils";
import { bytesToHex } from "@the9born/utils";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);
  const ownedAccountApi = new CosignerBApi(ownedAccountSeed);

  // At Requester side
  if (true) {
    await requesterProvider.requestCreateOwnedAccount(
      ownedAccountApi.getEcdsaPublicKey(),
      ownedAccountApi.getEddsaPublicKey(),
      heimChainSignerOwnedAccount.getAddress()
    );
  }

  // At Responder side
  if (true) {
    await responderProvider.respondCreateOwnedAccount();
  }
};

main();
