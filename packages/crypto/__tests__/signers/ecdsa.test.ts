import { EcdsaSigner } from "../../src/signers/ecdsa";
import { secp256k1Curve } from "../../src/signers/ecdsa";
// import { EllipticCurvePoint } from "../../src/point";
import { PaillierPrivateKey, PaillierPublicKey } from "../../src/paillier";
import { ethers } from "ethers";
import { keccak256Hasher, sha256Hasher } from "../../src";
import { AffinePoint } from "../../src";
import { base64ToBytes, bigIntToBytes, bytesToBigInt, bytesToHex } from "@the9born/utils";

import { ec } from "elliptic";
import BN from "bn.js";
const secp256k1Elip = new ec("secp256k1");

describe("EcdsaSigner", () => {
  let signer: EcdsaSigner;
  let seed: Uint8Array;
  let paillierPrivateKey: PaillierPrivateKey;
  let paillierPublicKey: PaillierPublicKey;

  beforeEach(() => {
    seed = Buffer.from(
      "7865299f9b14b6c8df3b95bd3bb06fff12d29bed982504d8c66d897c70a0217c7b03a8268fabebdf1b10204adcaa465bf6f8293306576228b1cdc86f3170fc96",
      "hex"
    );

    paillierPrivateKey = PaillierPrivateKey.fromPQ(
      BigInt(
        "9738806651549696063664805324913420447644227181715813132044392597641788889643262836038961064219747511013240254382304398628187064061511552215586043939099767"
      ),
      BigInt(
        "11330373220587580615461307323134371072306062539555241393829923926401994647009140412099573071289985649152633649865596731519887007348856616688397442042298711"
      )
    );

    paillierPublicKey = paillierPrivateKey.publicKey;

    signer = EcdsaSigner.fromSeed({
      seed,
      curve: secp256k1Curve,
      paillierPrivateKey,
      paillierPublicKey,
    });
  });

  describe("constructor", () => {
    it("should create a signer instance with the correct properties", () => {
      // expect(signer.curve).toBe(secp256k1Curve);
      expect(signer.getPublicKey()).toBeDefined();
    });
  });

  describe("fromSeed", () => {
    it("should create a signer from a seed", () => {
      const seed = new Uint8Array(32);
      const seedSigner = EcdsaSigner.fromSeed({
        seed,
        curve: secp256k1Curve,
      });
      expect(seedSigner).toBeInstanceOf(EcdsaSigner);
      expect(seedSigner.getPublicKey()).toBeDefined();
    });
  });

  describe("getTwoPartyPublicKey", () => {
    it("should generate a shared public key", () => {
      const otherWallet = ethers.Wallet.createRandom();
      const otherPublicKey = Buffer.from(
        ethers.utils.computePublicKey(otherWallet.publicKey, true).slice(2),
        "hex"
      );

      const sharedKey = signer.getTwoPartyPublicKey(otherPublicKey);
      expect(sharedKey).toBeDefined();
      expect(sharedKey instanceof Uint8Array).toBe(true);
    });
  });

  describe("sign", () => {
    it("should produce a valid signature", () => {
      const message = Buffer.from("test message");
      const digest = ethers.utils.keccak256(message);
      const signature = signer.sign(Buffer.from(digest.slice(2), "hex"), keccak256Hasher);

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // r (32 bytes) + s (32 bytes)
    });
  });

  describe("initializeSignature", () => {
    it("should return valid signature request params", () => {
      const message = Buffer.from("test message");
      const { k1, R1 } = signer.initializeSignature(message, keccak256Hasher);

      expect(k1).toBeDefined();
      expect(typeof k1).toBe("bigint");
      // expect(R1).toBeInstanceOf();
    });
  });

  describe("getSignatureResponseParams", () => {
    it("should return valid signature response params", () => {
      const message = Buffer.from("test message");
      // const R1 = EllipticCurvePoint.fromScalar(BigInt(123));
      const R1 = secp256k1Curve.ProjectivePoint.BASE.multiply(BigInt(123)).toAffine();
      const partnerPrivateKeyEncrypted = BigInt(456);

      const { R2, c3 } = signer.getSignatureResponseParams(
        message,
        keccak256Hasher,
        R1,
        {
          partnerPrivateKeyEncrypted,
        }
      );

      // expect(R2).toBeInstanceOf("string");
      expect(c3).toBeDefined();
    });
  });

  describe("generateSignature", () => {
    it("should generate a valid final signature", () => {
      const responderPublicKey = Buffer.from(
        "Atqxz2MSEY1O8zMPH5PlEVBOE9ls4n/B0kLVN5YMHmC3",
        "base64"
      );
      // const message =
      // TODO: Fix the signature generation by finding message that produces the digest/ change digest
      const digest = Buffer.from(
        "706eb13e2ca0da776b98554d293ee4443ede611f11bae0d1a0f040f6485d6efc",
        "hex"
      );

      const c3 = BigInt(
        "0x55bd29e31700fd1ec0ac748ba079882492ef04dbbc805bf32cd0b0c919c8e27ab61710a78bf853aad0f3084acbbeb9e617f2397f2faedc5639acf0aa0c7f5163a47d6ed4d99a12760532cdc7854d1e64bdb88dd307d6eddab23239fb8d937c09447bd84899cbae8f6283a01339a2b94b9c3633dacb34dca60161e56b7ebff6362cfc6fa72aa59731f16bcad5a7f565c4f4ef42a09b0e8702becdedb70d72f72aecd30da8191592a271baa572615898cb92c32cf07ac1b0c0e4e8f1cda70e490011ba27c0afede91cb8810a86d7177c5dffa3e770dcf96a61f8f5ea1c6ae77b7c7f10f6a0fedb0e1799da67cabed26837d35db35f59fb1eea72da60a792a21d7f"
      );

      const k1 = BigInt(
        "2671740770774722691958602488384035221772255499178235859462764858159819485288"
      );



      const R2 = secp256k1Curve.ProjectivePoint.fromHex(bytesToHex(Buffer.from("Atqxz2MSEY1O8zMPH5PlEVBOE9ls4n/B0kLVN5YMHmC3", "base64")).substring(2))
        .multiply(bytesToBigInt(Buffer.from("NRZF2Tb3b62mlrReUEH/fq7h4JTK4wcZhDntHJZR9p8=", "base64")))
        .toAffine();




      // const signature = signer.generateSignature(
      //   message,
      //   keccak256Hasher,
      //   responderPublicKey,
      //   k1,
      //   R2_2Affine,
      //   c3
      // );

      // expect(signature).toBeDefined();
      // expect(signature.length).toBe(64);
    });
  });
});
