import {
  getProvider,
  heimChainSignerOwnedAccount,
  heimChainSignerRequester,
  heimChainSignerResponder,
} from "../stubs";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);

  const ownedAddress = heimChainSignerOwnedAccount.getAddress();

  console.log({ ownedAddress });

  await responderProvider.updateFreebie(ownedAddress, true, BigInt(500000000), 1);
  await requesterProvider.resolveAdminRequest(true);
};

main();
