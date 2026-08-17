import {
  cosignerBPrivateKey,
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
  getQuerier,
} from "../stubs";
import { Coin } from "@cosmjs/launchpad";
import { mockCosignerSign } from "../mock-cosigner";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);

  const { signatureRequest } = await requesterProvider.requestSendTokens(
    "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
    [
      {
        denom: "ueurheim",
        amount: "100",
      },
    ] as Coin[]
  );

  if (false) {
    const requesterInfo = await requesterProvider.getRequesterData(
      heimChainSignerRequester.getAddress(),
    );

    const heimAccInfo = await requesterProvider.getHeimAccountData(
      requesterInfo.heimAddress
    );
    const heimQuery = await getQuerier();
    const signatureRequest = await heimQuery.getSignatureRequest(
      heimAccInfo.requestIndex
    );

    const cosignerOutput = await mockCosignerSign({
      ecdsaPrivateKey: cosignerBPrivateKey,
      signatureRequest,
      partnerEcdsaPrivateEncrypted: requesterInfo.cosigner.ecdsaPrivateEncrypted,
      paillierPublic: requesterInfo.cosigner.paillierPublic,
    });

    await requesterProvider.respondToSignatureRequest({
      responderAddress: heimChainSignerResponder.getAddress(),
      c3: cosignerOutput.c3Buf,
      r2: cosignerOutput.r2Buf,
    });
  }

  // no need response b/c it's satisfied by internal transaction
};

main();
