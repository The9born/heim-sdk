import { AffinePoint } from "@the9born/crypto";
import { bytesToString } from "@the9born/utils";
import { MsgTerminateVenueScope } from "./ts-proto/heim/heim/tx";
import { MsgUpdateVenueScope } from "./ts-proto/heim/heim/tx";
import { SignatureRequests } from "./ts-proto/heim/heim/signature_requests";
import { MsgUpdateFreebie } from "./ts-proto/heim/heim/tx";
import { MsgAddVenueScope } from "./ts-proto/heim/heim/tx";
import { QueryGetPendingActionResponse } from "./ts-proto/heim/heim/query";

export enum PendingAction {
  NoAction = "NO_ACTION",
  SignatureRequest = "SIGNATURE_REQUEST",
  UpdateFreebie = "UPDATE_FREEBIE",
  AddVenueScope = "ADD_VENUE_SCOPE",
  UpdateVenueScope = "UPDATE_VENUE_SCOPE",
  TerminateVenueScope = "TERMINATE_VENUE_SCOPE",
}

export const serializeAffinePoint = (point: AffinePoint) => {
  return `${point.x.toString()}:${point.y.toString()}`;
};

export const deserializeAffinePoint = (data: string | Uint8Array) => {
  const serializedData = typeof data === "string" ? data : bytesToString(data);
  const [x, y] = serializedData.split(":");

  if (!x || !y) {
    throw new Error("Invalid serialized point data");
  }

  return { x: BigInt(x), y: BigInt(y) };
};

export const parseSignatureRequest = (
  queryResult: QueryGetPendingActionResponse
) => {
  const signatureRequest = SignatureRequests.decode(queryResult.payload.value);
  return signatureRequest;
};

export const parseUpdateFreebie = (
  queryResult: QueryGetPendingActionResponse
) => {
  const updateFreebie = MsgUpdateFreebie.decode(queryResult.payload.value);
  return updateFreebie;
};

export const parseAddVenueScope = (
  queryResult: QueryGetPendingActionResponse
) => {
  const addVenueScope = MsgAddVenueScope.decode(queryResult.payload.value);
  return addVenueScope;
};

export const parseUpdateVenueScope = (
  queryResult: QueryGetPendingActionResponse
) => {
  const updateVenueScope = MsgUpdateVenueScope.decode(
    queryResult.payload.value
  );
  return updateVenueScope;
};

export const parseTerminateVenueScope = (
  queryResult: QueryGetPendingActionResponse
) => {
  const terminateVenueScope = MsgTerminateVenueScope.decode(
    queryResult.payload.value
  );
  return terminateVenueScope;
};
