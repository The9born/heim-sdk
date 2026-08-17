import { HDKey } from "@scure/bip32";

export const generatePrivateKeyFromSeed = (
  seed: Uint8Array,
  derivationPath: string
) => {
  const masterKey = HDKey.fromMasterSeed(seed);

  const { privateKey } = masterKey.derive(derivationPath);

  return privateKey;
};

export const arrayToBigInt = (array: Uint8Array) => {
  return BigInt(`0x${Buffer.from(array).toString("hex")}`);
};

export const bigintToBuffer32 = (bn: bigint) => {
  const hex = bn.toString(16).padStart(64, "0"); // Ensure 64 hex chars = 32 bytes
  return Buffer.from(hex, "hex");
};
