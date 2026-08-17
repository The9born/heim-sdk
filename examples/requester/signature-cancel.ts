import { getProvider, heimChainSignerRequester, getQuerier } from "../stubs";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const heimRes = await requesterProvider.cancelSignatureRequest();
  console.log({ heimRes });
};

main();
