import {
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
} from "../stubs";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  await requesterProvider.resolveAdminRequest(true);
};

main();
