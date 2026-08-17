import {
  cosignerBPrivateKey,
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
  getQuerier,
} from "../stubs";
import { mockCosignerSign } from "../mock-cosigner";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);

  const { signatureRequest } =
    await requesterProvider.requestExchangeGasTokenMsg(50, false);

  const requesterInfo = await requesterProvider.getRequesterData(
    heimChainSignerRequester.getAddress(),
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
};

main();
