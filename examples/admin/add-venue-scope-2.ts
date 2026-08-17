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
    const heimResponse = await responderProvider.addVenueScope({
      ownedAddress: "",
      description: "Life in BKK and Sweden",
      personalNetworkIds: [Network.Sepolia, Network.Sepolia, Network.Heim],
      personalAliases: ["BKK Friend 1", "BKK Friend 2", "BKK Friend 3"],
      personalAddresses: [
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "0xc29f01e2fd6d7f3e8e001d42e9cc04a92df978d6",
        "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
      ],
      amountLimit: Long.fromString("100000000000000000"),
      start: 0,
      end: -1,
    });
    console.log({ heimResponse });
  }
  await requesterProvider.resolveAdminRequest(true);
};

main();
