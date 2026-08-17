import {
  getProvider,
  heimChainSignerResponder,
  heimChainSignerRequester,
} from "../stubs";
import { Network } from "@the9born/chains";
import Long from "long";

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);

  if (true) {
    const responderProvider = await getProvider(heimChainSignerResponder);
    const heimResponse = await responderProvider.updateVenueScope({
      venueScopeIndex: 0,
      ownedAddress: "",
      description: "Eat in BKK editted",
      personalNetworkIds: [Network.Sepolia, Network.Sepolia],
      personalAliases: ["Rath", "Viktor"],
      personalAddresses: [
        "0x3A2C225bACD2BAF4d01fdC778495720ee4793548",
        "0x3A2C225bACD2BAF4d01fdC778495720ee4793548",
      ],
      amountLimit: Long.fromString("100000000000000000"),
      end: -1,
    });
    console.log({ heimResponse });
  }
  await requesterProvider.resolveAdminRequest(true);
};

main();
