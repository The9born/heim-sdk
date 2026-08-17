import { bytesToHex } from "@the9born/utils";
import { secp256k1Curve } from "../../src";

describe("secp256k1Curve", () => {
  describe("constants", () => {
    it("should have correct curve order n", () => {
      const expectedN = BigInt(
        "115792089237316195423570985008687907852837564279074904382605163141518161494337"
      );
      expect(secp256k1Curve.CURVE.n).toBe(expectedN);
    });

    it("should have correct bit length", () => {
      expect(secp256k1Curve.CURVE.nBitLength).toBe(256);
    });
  });

  describe("sign", () => {
    const privateKey = new Uint8Array([
      0x1d, 0x0d, 0x0e, 0xca, 0xfe, 0xba, 0xbe, 0x42, 0x84, 0x21, 0x66, 0xab,
      0x90, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56,
      0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56,
    ]);

    const message = new TextEncoder().encode("Hello, World!");

    it("should produce valid signatures", () => {
      const signature = secp256k1Curve.sign(message, privateKey);

      // expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.toCompactHex().length).toBe(64 * 2);
    });

    it("should produce deterministic signatures", () => {
      const sig1 = secp256k1Curve.sign(message, privateKey).toCompactHex();
      const sig2 = secp256k1Curve.sign(message, privateKey).toCompactHex();

      expect(Buffer.from(sig1).toString("hex")).toBe(
        Buffer.from(sig2).toString("hex")
      );
    });
  });

  describe("getSharedPublicKey", () => {
    const alicePrivateKey = new Uint8Array([
      0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a,
      0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a,
      0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a, 0x1a,
    ]);

    const bobPrivateKey = new Uint8Array([
      0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b,
      0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b,
      0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b, 0x2b,
    ]);

    let bobPublicKey: Uint8Array;

    beforeAll(() => {
      // Generate Bob's public key using the elliptic library
      const ec = new (require("elliptic").ec)("secp256k1");
      const keyPair = ec.keyFromPrivate(bobPrivateKey);
      bobPublicKey = Uint8Array.from(keyPair.getPublic().encode());
    });

    it("should generate shared public key with correct format", () => {
      const sharedKey = secp256k1Curve.getSharedSecret(
        alicePrivateKey,
        bobPublicKey
      );

      expect(sharedKey).toBeInstanceOf(Uint8Array);
      expect(sharedKey.length).toBe(33);
      expect([0x02, 0x03]).toContain(sharedKey[0]);
    });

    it("should be commutative", () => {
      const alicePublicKey = new (require("elliptic").ec)("secp256k1")
        .keyFromPrivate(alicePrivateKey)
        .getPublic()
        .encode();

      const sharedKey1 = secp256k1Curve.getSharedSecret(
        alicePrivateKey,
        bobPublicKey
      );

      const sharedKey2 = secp256k1Curve.getSharedSecret(
        bobPrivateKey,
        Buffer.from(alicePublicKey)
      );

      expect(Buffer.from(sharedKey1).toString("hex")).toBe(
        Buffer.from(sharedKey2).toString("hex")
      );
    });
  });
});
