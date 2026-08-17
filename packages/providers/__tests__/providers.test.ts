import {
  serializeAffinePoint,
  deserializeAffinePoint,
  PendingAction,
  parseSignatureRequest,
  parseUpdateFreebie,
  parseAddVenueScope,
  parseUpdateVenueScope,
  parseTerminateVenueScope,
} from "../src/helpers";
import { MessageTypeUrl } from "../src/messages/typeUrl";
import { SignatureRequests } from "../src/ts-proto/heim/heim/signature_requests";
import {
  MsgUpdateFreebie,
  MsgAddVenueScope,
  MsgUpdateVenueScope,
  MsgTerminateVenueScope,
} from "../src/ts-proto/heim/heim/tx";
import { QueryGetPendingActionResponse } from "../src/ts-proto/heim/heim/query";
import Long from "long";

describe("AffinePoint serialization", () => {
  it("should correctly serialize and deserialize affine point", () => {
    const point = {
      x: BigInt("12345678901234567890"),
      y: BigInt("98765432109876543210"),
    };

    const serialized = serializeAffinePoint(point);
    expect(serialized).toBe("12345678901234567890:98765432109876543210");

    const deserialized = deserializeAffinePoint(serialized);
    expect(deserialized.x).toBe(point.x);
    expect(deserialized.y).toBe(point.y);

    // deserialize from bytes
    const bytes = Buffer.from(serialized);
    const fromBytes = deserializeAffinePoint(bytes);
    expect(fromBytes.x).toBe(point.x);
    expect(fromBytes.y).toBe(point.y);
  });

  it("should throw error on invalid serialized point", () => {
    expect(() => deserializeAffinePoint("invalid")).toThrow(
      "Invalid serialized point data"
    );
  });
});

describe("PendingAction parsers", () => {
  it("should parse signature request pending action", () => {
    const sigReq: SignatureRequests = {
      id: Long.fromNumber(1),
      heimAddress: "heim1address",
      blockHeight: Long.fromNumber(100),
      networkId: "cosmos--heim",
      transaction: "tx_data",
      r1: "r1_data",
      virtualScreenAddress: "",
      virtualScreenTransaction: "",
      secondary: undefined,
    };
    const encoded = SignatureRequests.encode(sigReq).finish();
    const queryResult: QueryGetPendingActionResponse = {
      action: PendingAction.SignatureRequest,
      payload: {
        typeUrl: MessageTypeUrl.SignatureRequestPrimary,
        value: encoded,
      },
    };

    const parsed = parseSignatureRequest(queryResult);
    expect(parsed.heimAddress).toBe("heim1address");
    expect(parsed.transaction).toBe("tx_data");
  });

  it("should parse update freebie pending action", () => {
    const msg: MsgUpdateFreebie = {
      creator: "heim1creator",
      ownedAddress: "heim1owned",
      active: true,
      dayLength: 7,
      amountLimit: Long.fromNumber(1000),
    };
    const encoded = MsgUpdateFreebie.encode(msg).finish();
    const queryResult: QueryGetPendingActionResponse = {
      action: PendingAction.UpdateFreebie,
      payload: {
        typeUrl: MessageTypeUrl.UpdateFreebie,
        value: encoded,
      },
    };

    const parsed = parseUpdateFreebie(queryResult);
    expect(parsed.creator).toBe("heim1creator");
    expect(parsed.ownedAddress).toBe("heim1owned");
    expect(parsed.active).toBe(true);
  });

  it("should parse add venue scope pending action", () => {
    const msg: MsgAddVenueScope = {
      creator: "heim1creator",
      ownedAddress: "heim1owned",
      description: "Test venue",
      personalNetworkIds: ["evm--1"],
      personalAliases: ["wallet1"],
      personalAddresses: ["0x1234567890123456789012345678901234567890"],
      amountLimit: Long.fromNumber(500),
      start: 0,
      end: 100,
    };
    const encoded = MsgAddVenueScope.encode(msg).finish();
    const queryResult: QueryGetPendingActionResponse = {
      action: PendingAction.AddVenueScope,
      payload: {
        typeUrl: MessageTypeUrl.AddVenueScope,
        value: encoded,
      },
    };

    const parsed = parseAddVenueScope(queryResult);
    expect(parsed.creator).toBe("heim1creator");
    expect(parsed.description).toBe("Test venue");
    expect(parsed.personalAddresses).toContain(
      "0x1234567890123456789012345678901234567890"
    );
  });

  it("should parse update venue scope pending action", () => {
    const msg: MsgUpdateVenueScope = {
      creator: "heim1creator",
      ownedAddress: "heim1owned",
      venueScopeIndex: 2,
      description: "Updated venue",
      personalNetworkIds: ["evm--1"],
      personalAliases: ["wallet1"],
      personalAddresses: ["0x1234567890123456789012345678901234567890"],
      amountLimit: Long.fromNumber(1000),
      end: 200,
    };
    const encoded = MsgUpdateVenueScope.encode(msg).finish();
    const queryResult: QueryGetPendingActionResponse = {
      action: PendingAction.UpdateVenueScope,
      payload: {
        typeUrl: MessageTypeUrl.UpdateVenueScope,
        value: encoded,
      },
    };

    const parsed = parseUpdateVenueScope(queryResult);
    expect(parsed.creator).toBe("heim1creator");
    expect(parsed.venueScopeIndex).toBe(2);
  });

  it("should parse terminate venue scope pending action", () => {
    const msg: MsgTerminateVenueScope = {
      creator: "heim1creator",
      ownedAddress: "heim1owned",
      venueScopeIndex: 3,
    };
    const encoded = MsgTerminateVenueScope.encode(msg).finish();
    const queryResult: QueryGetPendingActionResponse = {
      action: PendingAction.TerminateVenueScope,
      payload: {
        typeUrl: MessageTypeUrl.TerminateVenueScope,
        value: encoded,
      },
    };

    const parsed = parseTerminateVenueScope(queryResult);
    expect(parsed.creator).toBe("heim1creator");
    expect(parsed.venueScopeIndex).toBe(3);
  });
});

describe("isTestnet and secondary account validation", () => {
  it("should correctly identify testnet vs mainnet networks", () => {
    const { isTestnet, Network } = require("@the9born/chains");
    expect(isTestnet(Network.Sepolia)).toBe(true);
    expect(isTestnet(Network.BitcoinSignet)).toBe(true);
    expect(isTestnet(Network.OsmosisTestnet)).toBe(true);
    expect(isTestnet(Network.LightningSignet)).toBe(true);
    expect(isTestnet(Network.TSolana)).toBe(true);
    expect(isTestnet(Network.Heim)).toBe(true);

    expect(isTestnet(Network.Ethereum)).toBe(false);
    expect(isTestnet(Network.Bitcoin)).toBe(false);
    expect(isTestnet(Network.CosmosHub)).toBe(false);
    expect(isTestnet(Network.Osmosis)).toBe(false);
    expect(isTestnet(Network.Solana)).toBe(false);
    expect(isTestnet(Network.Lightning)).toBe(false);
    expect(isTestnet(Network.Agoric)).toBe(false);
  });
});
