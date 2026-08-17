import {
  cosignerBPrivateKey,
  getProvider,
  heimChainSignerResponder,
  heimChainSignerRequester,
  heimChainSignerAgent,
  getQuerier,
  CosignerBApi,
  cosignerBSeed,
} from "../stubs";
import { mockCosignerSign } from "../mock-cosigner";
import { bytesToHex } from "@the9born/utils";

const main = async () => {
  const agentProvider = await getProvider(heimChainSignerAgent);
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);
  const cosignerBApi = new CosignerBApi(cosignerBSeed);
  const requesterInfo = await requesterProvider.getRequesterData(
    heimChainSignerRequester.getAddress()
  );
  const heimAccount = await requesterProvider.getHeimAccountData(
    requesterInfo.heimAddress
  );
  const signatureRequest = await requesterProvider.getSignatureRequest(
    heimAccount.requestIndex
  );

  const cosignerOutput = await mockCosignerSign({
    ecdsaPrivateKey: bytesToHex(cosignerBApi.getPrivateKey()),
    signatureRequest,
    paillierPublic: requesterInfo.cosigner.paillierPublic,
    partnerEcdsaPrivateEncrypted: requesterInfo.cosigner.ecdsaPrivateEncrypted,
  });

  await agentProvider.respondToSignatureRequest({
    responderAddress: heimChainSignerResponder.getAddress(),
    c3: cosignerOutput.c3Buf,
    r2: cosignerOutput.r2Buf,
  });
};

main();
