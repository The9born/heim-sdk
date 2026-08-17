import { getProvider, heimChainSignerResponder } from "../stubs";

const main = async () => {
  const responderProvider = await getProvider(heimChainSignerResponder);
  await responderProvider.cancelSignatureRequest();
};

main();
