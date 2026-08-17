import { bytesToHex } from "@the9born/utils";
import { mockCosignerSign } from "../mock-cosigner";
import { getProvider, heimChainSignerAgent, heimChainSignerRequester, heimChainSignerResponder, CosignerBApi, cosignerBSeed } from "../stubs";
import { Coin } from "@cosmjs/launchpad";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  await requesterProvider.requestSendTokens(
    "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
    [
      {
        denom: "ueurheim",
        amount: "10000000000",
      },
    ] as Coin[],
    {
      venueScopeIndex: -1,
      recipientToken: "TOKEN",
      presignInfo: "",
    }
  );

  // no need response b/c it's satisfied by venue

  // Open to sign as agent
  if (false) {
    // const agentProvider = await getProvider(heimChainSignerAgent);
    const responderProvider = await getProvider(heimChainSignerResponder);
    const cosignerBApi = new CosignerBApi(cosignerBSeed);

    const agentSignedOutput = await mockCosignerSign({
      ecdsaPrivateKey: bytesToHex(cosignerBApi.getSecondPrivateKey()),
      paillierPublic: "",
      partnerEcdsaPrivateEncrypted: "",
      signatureRequest: {
        networkId: "",
        transaction: "",
        r1: "",
      },
    });

    // await agentProvider.respondToSignatureRequest({
    // responderAddress: heimChainSignerResponder.getAddress(),
    await responderProvider.respondToSignatureRequest({
      c3: agentSignedOutput.c3Buf,
      r2: agentSignedOutput.r2Buf,
    });
  }
};

main();
