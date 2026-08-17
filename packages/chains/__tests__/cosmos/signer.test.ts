import { toBech32 } from "@cosmjs/encoding";
import { EcdsaSigner, AffinePoint } from "@the9born/crypto";
import { SignDoc, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import Long from "long";
import { CosmosChainSigner } from "../../src/cosmos/signer";
import { Network } from "../../src/config";

jest.mock("@cosmjs/encoding", () => ({
  toBech32: jest.fn(),
}));

jest.mock("@the9born/crypto", () => ({
  EcdsaSigner: jest.fn(),
  sha256Hasher: {
    hash: jest.fn(),
  },
}));

describe("CosmosChainSigner", () => {
  let signer: CosmosChainSigner;
  let mockSigner: jest.Mocked<EcdsaSigner>;

  const mockPublicKey = new Uint8Array([1, 2, 3]);
  const mockPartnerPublicKey = new Uint8Array([4, 5, 6]);
  const mockAddress = "osmo1xyxs3skf3f4jfqeuv89yyaqvjc6lffavxqhc8g";

  beforeEach(() => {
    mockSigner = {
      getPublicKey: jest.fn().mockReturnValue(mockPublicKey),
      getTwoPartyPublicKey: jest.fn().mockReturnValue(mockPublicKey),
      sign: jest.fn(),
      initializeSignature: jest.fn(),
      getSignatureResponseParams: jest.fn(),
      generateSignature: jest.fn(),
    } as unknown as jest.Mocked<EcdsaSigner>;

    (toBech32 as jest.Mock).mockReturnValue(mockAddress);
  });

  describe("constructor", () => {
    it("should initialize successfully with valid Osmosis network ID", () => {
      expect(() => {
        new CosmosChainSigner({
          networkId: "cosmos--osmosis-1" as Network,
          signer: mockSigner,
        });
      }).not.toThrow();
    });

    it("should initialize successfully with valid Cosmos Hub network ID", () => {
      expect(() => {
        new CosmosChainSigner({
          networkId: "cosmos--cosmoshub-4" as Network,
          signer: mockSigner,
        });
      }).not.toThrow();
    });

    it("should throw error if network ID format is invalid", () => {
      expect(() => {
        new CosmosChainSigner({
          networkId: "cosmos" as Network,
          signer: mockSigner,
        });
      }).toThrow("Invalid chain id for network: cosmos");
    });

    it("should throw error if chain ID is not supported", () => {
      expect(() => {
        new CosmosChainSigner({
          networkId: "cosmos--unsupported-1" as Network,
          signer: mockSigner,
        });
      }).toThrow("Invalid prefix for network: cosmos--unsupported-1");
    });
  });

  describe("getAddress", () => {
    beforeEach(() => {
      signer = new CosmosChainSigner({
        networkId: "cosmos--osmosis-1" as Network,
        signer: mockSigner,
      });
    });

    it("should return correct bech32 address", () => {
      const address = signer.getAddress();

      expect(mockSigner.getPublicKey).toHaveBeenCalled();
      expect(toBech32).toHaveBeenCalled();
      expect(address).toBe(mockAddress);
    });
  });

  describe("getTwoPartyAddress", () => {
    beforeEach(() => {
      signer = new CosmosChainSigner({
        networkId: "cosmos--osmosis-1" as Network,
        signer: mockSigner,
      });
    });

    it("should return correct two-party bech32 address", () => {
      const address = signer.getTwoPartyAddress(mockPartnerPublicKey);

      expect(mockSigner.getTwoPartyPublicKey).toHaveBeenCalledWith(
        mockPartnerPublicKey
      );
      expect(toBech32).toHaveBeenCalled();
      expect(address).toBe(mockAddress);
    });
  });

  describe("finalizeTransaction", () => {
    beforeEach(() => {
      signer = new CosmosChainSigner({
        networkId: "cosmos--osmosis-1" as Network,
        signer: mockSigner,
      });
    });

    it("should finalize transaction with signature from MPC params", () => {
      const mockSignDoc = SignDoc.fromPartial({
        bodyBytes: new Uint8Array([1, 2, 3]),
        authInfoBytes: new Uint8Array([4, 5, 6]),
        chainId: "osmosis-1",
        accountNumber: BigInt(1),
      });
      const message = Buffer.from(SignDoc.encode(mockSignDoc).finish());
      const mockK1 = BigInt(1);
      const mockR2 = { x: BigInt(1), y: BigInt(2) } as AffinePoint;
      const mockC3 = BigInt(3);
      const mockSig = new Uint8Array(64).fill(1);

      jest.spyOn(signer as any, "getSignature").mockReturnValue(mockSig);

      const txBytes = signer.finalizeTransaction(
        message,
        mockPartnerPublicKey,
        mockK1,
        mockR2,
        mockC3
      );

      const decodedTx = TxRaw.decode(txBytes);
      expect(decodedTx.bodyBytes).toEqual(mockSignDoc.bodyBytes);
      expect(decodedTx.authInfoBytes).toEqual(mockSignDoc.authInfoBytes);
      expect(decodedTx.signatures).toHaveLength(1);
      expect(decodedTx.signatures[0]).toEqual(mockSig);
    });

    it("should finalize MPC transaction with provided signature", () => {
      const mockSignDoc = SignDoc.fromPartial({
        bodyBytes: new Uint8Array([1, 2, 3]),
        authInfoBytes: new Uint8Array([4, 5, 6]),
        chainId: "osmosis-1",
        accountNumber: BigInt(1),
      });
      const message = Buffer.from(SignDoc.encode(mockSignDoc).finish());
      const mockSig = new Uint8Array(64).fill(2);

      const txBytes = signer.finalizeMPCTransaction(message, mockSig);

      const decodedTx = TxRaw.decode(txBytes);
      expect(decodedTx.bodyBytes).toEqual(mockSignDoc.bodyBytes);
      expect(decodedTx.authInfoBytes).toEqual(mockSignDoc.authInfoBytes);
      expect(decodedTx.signatures).toHaveLength(1);
      expect(decodedTx.signatures[0]).toEqual(mockSig);
    });
  });

  describe("static getAddressFromPublicKey", () => {
    it("should return correct bech32 address from public key", () => {
      const prefix = "osmo";
      const address = CosmosChainSigner.getAddressFromPublicKey(
        mockPublicKey,
        prefix
      );

      expect(toBech32).toHaveBeenCalledWith(prefix, expect.any(Buffer));
      expect(address).toBe(mockAddress);
    });
  });
});
