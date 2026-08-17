import { heimChainSignerRequester } from "../stubs";

import { getProvider } from "../stubs";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const res = await requesterProvider.resolveAdminRequest(false);
  console.log(res);
};

main();
