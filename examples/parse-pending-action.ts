import {
  parseAddVenueScope,
  parseSignatureRequest,
  parseUpdateFreebie,
  parseUpdateVenueScope,
  parseTerminateVenueScope,
} from "@the9born/providers/src/helpers";
import { PendingAction } from "@the9born/providers/src/helpers";
import { getProvider } from "./stubs";

import { heimChainSignerRequester } from "./stubs";

const parsePendingAction = async () => {
  const provider = await getProvider(heimChainSignerRequester);
  const requesterData = await provider.getRequesterData(
    heimChainSignerRequester.getAddress()
  );

  const queryResult = await provider.getPendingAction(
    requesterData.heimAddress
  );

  switch (queryResult.action) {
    case PendingAction.SignatureRequest:
      const signatureRequest = parseSignatureRequest(queryResult);
      console.log(signatureRequest);
      break;
    case PendingAction.UpdateFreebie:
      const updateFreebie = parseUpdateFreebie(queryResult);
      console.log(updateFreebie);
      break;
    case PendingAction.AddVenueScope:
      const addVenueScope = parseAddVenueScope(queryResult);
      console.log(addVenueScope);
      break;
    case PendingAction.UpdateVenueScope:
      const updateVenueScope = parseUpdateVenueScope(queryResult);
      console.log(updateVenueScope);
      break;
    case PendingAction.TerminateVenueScope:
      const terminateVenueScope = parseTerminateVenueScope(queryResult);
      console.log(terminateVenueScope);
      break;
    default:
      console.log("No pending action");
  }
};

parsePendingAction();
