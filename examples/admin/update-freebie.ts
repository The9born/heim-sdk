import {
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
} from "../stubs";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);

  await responderProvider.updateFreebie("",true, BigInt(50), 1);
  await requesterProvider.resolveAdminRequest(true);
};

main();
