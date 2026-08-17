import { hexlify, keccak256, randomBytes } from "ethers/lib/utils";
import {
  bigIntToBytes,
  bytesToBigInt,
  hexToBigInt,
  hexToBytes,
} from "@the9born/utils";
import { PaillierPublicKey } from "@the9born/crypto/src";
import { gpEncryptCurve25519 } from "./gopherjs/gopher";
import { secp256k1 } from "@noble/curves/secp256k1";
import { BN } from "bn.js";
import seedRandom from "seedrandom";
import { sha512 } from "js-sha512";
import { sha256 } from "ethers/lib/utils";
import { ec } from "elliptic";
import { Network } from "@the9born/chains";
import { serializeAffinePoint } from "@the9born/providers/src/helpers";

const secp256k1Elip = new ec("secp256k1");

export type SignatureRequestFull = {
  networkId: string;
  transaction: string;
  r1: string;
};

export type SignatureReqResFull = {
  signatureRequest: SignatureRequestFull;
};

export type MockCosignerSignParams = {
  ecdsaPrivateKey: string;
  paillierPublic: string;
  partnerEcdsaPrivateEncrypted: string;
  signatureRequest: SignatureRequestFull;
};

export const bytesToHex = (bytes: Uint8Array | string): string => {
  return hexlify(bytes, { allowMissingPrefix: true });
};

export const hashInt = (message: Buffer) => {
  const orderBits = secp256k1.CURVE.nBitLength;

  const orderBytes = (orderBits + 7) / 8;

  if (message.length > orderBytes) {
    message = message.subarray(0, orderBytes);
  }

  const zInt = bytesToBigInt(message);

  const excess = message.length * 8 - orderBits;
  if (excess > 0) {
    zInt >> BigInt(excess);
  }

  return zInt;
};

export const generateK = (privateKeyHex: string, message: Buffer) => {
  const entropy = randomBytes(32);

  const md = sha512.create();
  md.update(Buffer.from(privateKeyHex, "hex"));
  md.update(entropy);
  md.update(message);
  const key = md.digest().slice(0, 32);
  const keyHex = bytesToHex(Buffer.from(key)).slice(2);

  const PRNG = seedRandom.xorshift7(keyHex);

  let k =
    (BigInt(Math.floor(PRNG() * Number.MAX_SAFE_INTEGER)) * secp256k1.CURVE.n) /
    BigInt(Number.MAX_SAFE_INTEGER);

  k %= secp256k1.CURVE.n - BigInt(1);
  k = k + BigInt(1);

  return k;
};

export const generateNoise = (privateKey: string, message: Buffer) => {
  const k1ForNoise = generateK(privateKey, message);
  const k2ForNoise = generateK(privateKey, message);
  const noise = k1ForNoise * k2ForNoise;
  return noise;
};

export const generateC1 = async (
  paillierPubKey: PaillierPublicKey,
  privKey: string,
  message: Buffer,
  k: bigint
) => {
  const kModInverseN = new BN(bigIntToBytes(k)).invm(
    new BN(bigIntToBytes(secp256k1.CURVE.n))
  );
  const hash = hashInt(message);
  let u = hash * bytesToBigInt(kModInverseN.toBuffer());

  u %= secp256k1.CURVE.n;

  const noise = generateNoise(privKey, message);
  u += noise * secp256k1.CURVE.n;

  const c1 = paillierPubKey.encrypt(u);

  return c1;
};

export const paillierMul = (
  paillierPubKey: PaillierPublicKey,
  cipher: bigint,
  constant: bigint
) => {
  const c = new BN(bigIntToBytes(cipher));
  const x = new BN(bigIntToBytes(constant));

  const nSquared = new BN(bigIntToBytes(paillierPubKey._n2));
  const result = c.toRed(BN.red(nSquared)).redPow(x);

  return bytesToBigInt(result.toBuffer());
};

export const generateC2 = async (
  paillierPubKey: PaillierPublicKey,
  privateKey: string,
  partnerEncryptedPrivateKey: bigint,
  r: bigint,
  k: bigint
) => {
  const dBig = hexToBigInt(privateKey);

  let vBN = new BN((r * dBig).toString());

  const kModInverseN = new BN(k.toString()).invm(
    new BN(secp256k1.CURVE.n.toString())
  );
  vBN = vBN.mul(kModInverseN);
  vBN = vBN.mod(new BN(secp256k1.CURVE.n.toString()));

  const v = BigInt(vBN.toString());

  const c2 = paillierMul(paillierPubKey, partnerEncryptedPrivateKey, v);

  return BigInt(c2.toString());
};

export const addCipher = (
  paillierPubKey: PaillierPublicKey,
  cipher1: bigint,
  cipher2: bigint
) => {
  const x = new BN(cipher1.toString());
  const y = new BN(cipher2.toString());
  const nSquared = new BN(paillierPubKey._n2.toString());

  const result = x.mul(y).mod(nSquared);

  return BigInt(result.toString());
};

export const generateC3 = async (
  message: Buffer,
  paillierPubKey: PaillierPublicKey,
  cosignerBPrivate: string,
  partnerEcdsaBigint: bigint,
  R: bigint,
  k2: bigint
) => {
  const c1 = await generateC1(paillierPubKey, cosignerBPrivate, message, k2);
  const c2 = await generateC2(
    paillierPubKey,
    cosignerBPrivate,
    partnerEcdsaBigint,
    R,
    k2
  );
  const sPrimeE = addCipher(paillierPubKey, c1, c2);
  return sPrimeE;
};

export const scalarMultECDSA = (Bx: bigint, By: bigint, s: bigint) => {
  const pub = { x: Bx.toString(16), y: By.toString(16) };
  const key = secp256k1Elip.keyFromPublic(pub, "hex");
  const edPublicAPoint = key.getPublic().mul(new BN(s.toString()));
  return { x: edPublicAPoint.getX(), y: edPublicAPoint.getY() };
};

export const calculateFinalR = (k: bigint, RX: bigint, RY: bigint) => {
  const finalR = scalarMultECDSA(RX, RY, k);
  const smallR = finalR.x.mod(new BN(secp256k1.CURVE.n.toString()));
  const r = BigInt(smallR.toString());
  return r;
};

export const randomBigInt = async (bitlength: number) => {
  const randomBits = randomBytes(bitlength);
  const randomBigInt = BigInt("0x" + Buffer.from(randomBits).toString("hex"));

  return randomBigInt;
};

export const encryptSharesEcies25519 = (
  shares: bigint[][],
  validatorPubKeys: string[]
) => {
  if (validatorPubKeys.length !== shares.length) {
    throw new Error("Validator public keys and shares length mismatch");
  }
  const pSharesEncrypted: string[][] = shares.map((pShare, valIdx) => {
    const valPubKey = Buffer.from(validatorPubKeys[valIdx] || "", "base64");
    return pShare.map((pShareVal) => {
      if (pShareVal == BigInt(0)) {
        return "0";
      }
      const pShareBuf = bigIntToBytes(pShareVal);
      const pShareEncrypted = gpEncryptCurve25519(
        valPubKey,
        Buffer.from(pShareBuf)
      );
      return bytesToBigInt(pShareEncrypted).toString();
    });
  });
  return pSharesEncrypted;
};

export const decodeRfrom64 = (r64: string) => {
  const rConcat = Buffer.from(r64, "base64").toString();
  const rArray = rConcat.split(":");
  const x = BigInt(rArray[0] || "0");
  const y = BigInt(rArray[1] || "0");
  return { x, y };
};

export const createAdditiveShare = async (
  secret: bigint,
  shareLength: number,
  threshold: number,
  modulus: bigint
): Promise<bigint[][]> => {
  const fullShares: bigint[] = [];
  for (let i = 0; i < shareLength; i++) {
    const uRand = (await randomBigInt(modulus.toString(2).length)) % modulus;
    const newUShare: bigint =
      i < shareLength - 1
        ? (fullShares[i - 1] || secret) - uRand
        : (secret - fullShares.reduce((a, b) => a + b, BigInt(0))) % modulus;
    fullShares.push(newUShare < BigInt(0) ? newUShare + modulus : newUShare);
  }

  const shares: bigint[][] = [];
  const hiddenIndexLength = threshold - 1;
  for (let i = 0; i < shareLength; i++) {
    const hiddenIndexes: number[] = [];
    for (let j = 0; j < hiddenIndexLength; j++) {
      hiddenIndexes.push((i + j) % shareLength);
    }

    const share: bigint[] = [];
    for (let j = 0; j < shareLength; j++) {
      const fullSharesJ = fullShares[j] || BigInt(0);
      if (hiddenIndexes.indexOf(j) === -1) {
        share.push(fullSharesJ);
      } else {
        share.push(BigInt(0));
      }
    }
    shares.push(share);
  }

  return shares;
};

export const mockCosignerSign = async ({
  ecdsaPrivateKey,
  signatureRequest,
  partnerEcdsaPrivateEncrypted,
  paillierPublic,
}: MockCosignerSignParams) => {
  const transactionE64 = signatureRequest.transaction;
  const R164 = signatureRequest.r1;

  const paillierN = BigInt(`
    0x${Buffer.from(paillierPublic, "base64").toString(
    "hex"
  )}`);
  const paillierPubKey = new PaillierPublicKey(paillierN);

  const partnerEcdsaDE = Buffer.from(
    partnerEcdsaPrivateEncrypted,
    "base64"
  );
  const partnerEcdsaBigint = bytesToBigInt(partnerEcdsaDE);
  const tx =
    signatureRequest.networkId === Network.Lightning ||
    signatureRequest.networkId === Network.LightningSignet
      ? Buffer.from(transactionE64, "base64").toString()
      : Buffer.from(transactionE64, "base64").toString("hex");

  let hash: string;
  switch (signatureRequest.networkId) {
    case Network.Heim:
    case Network.Lightning:
    case Network.LightningSignet:
    case Network.Bitcoin:
    case Network.BitcoinSignet:
    case Network.CosmosHub:
      hash =
        signatureRequest.networkId === Network.Lightning ||
        signatureRequest.networkId === Network.LightningSignet
          ? sha256(`0x${Buffer.from(tx).toString("hex")}`)
          : sha256(`0x${tx}`);
      break;
    case Network.Ethereum:
    case Network.Sepolia:
      hash = keccak256(`0x${tx}`);
      break;
    default:
      throw new Error("Invalid network id");
  }

  const txHash = Buffer.from(hash.substring(2), "hex");
  const k2 = generateK(ecdsaPrivateKey, txHash);

  // calculate c3
  const R1 = decodeRfrom64(R164);
  const R = calculateFinalR(k2, R1.x, R1.y);
  const c3 = await generateC3(
    txHash,
    paillierPubKey,
    ecdsaPrivateKey,
    partnerEcdsaBigint,
    R,
    k2
  );
  const c3Buf = bigIntToBytes(c3);
  const R2 = secp256k1.ProjectivePoint.BASE.multiply(k2);

  return {
    c3Buf: Buffer.from(c3Buf).toString("hex"),
    r2Buf: Buffer.from(serializeAffinePoint(R2.toAffine())).toString("hex"),
  };
};

const getSecondaryAccountPubKey = ({
  partnerEcdsaPublicKey,
  secondCosignerBPrikey,
}: {
  partnerEcdsaPublicKey: string;
  secondCosignerBPrikey: string;
}) => {
  const partnerEcdsaPubKeyBytes = hexToBytes(partnerEcdsaPublicKey);
  const partnerPubKey = secp256k1Elip.curve.decodePoint(
    partnerEcdsaPubKeyBytes
  );
  const partnerPubKeyHex = partnerPubKey.encode("hex", true);
  return secp256k1.getSharedSecret(
    secondCosignerBPrikey,
    partnerPubKeyHex,
    true
  );
};

export const mockCosignerInitAddSecondaryAccountSign = ({
  partnerEcdsaPublicKey,
  primaryAddress,
  secondCosignerBPrikey,
}: {
  partnerEcdsaPublicKey: string;
  primaryAddress: string;
  secondCosignerBPrikey: string;
}) => {
  if (secondCosignerBPrikey.startsWith("0x")) {
    secondCosignerBPrikey = secondCosignerBPrikey.substring(2);
  }

  const addSecondSigObj = secp256k1.sign(
    sha256(Buffer.from(primaryAddress)).substring(2),
    Buffer.from(secondCosignerBPrikey, "hex")
  );
  const signatureHex = `0x${addSecondSigObj.toCompactHex()}${addSecondSigObj.recovery
    .toString(16)
    .padStart(2, "0")}`;

  const signature = Buffer.from(signatureHex.substring(2), "hex");

  const secondaryAccountPublicKey = getSecondaryAccountPubKey({
    partnerEcdsaPublicKey,
    secondCosignerBPrikey,
  });

  const publicKey = secp256k1Elip
    .keyFromPrivate(secondCosignerBPrikey)
    .getPublic();
  const secondEcdsaPublic = Buffer.from(publicKey.encode("array", true));

  const secondEd25519Public = Buffer.from([
    8, 189, 0, 250, 141, 116, 224, 186, 14, 58, 36, 114, 181, 98, 39, 233, 31,
    58, 231, 22, 22, 137, 30, 77, 129, 52, 2, 238, 72, 19, 23, 97,
  ]);

  return {
    signature,
    secondaryAccountPublicKey,
    secondEcdsaPublic,
    secondEd25519Public,
  };
};
