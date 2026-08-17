// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { encryptCurve25519, decryptCurve25519 } from "./gopherjs.js";

export const gpEncryptCurve25519 = (
  pubKey64: Buffer,
  plaintext: Buffer,
): Buffer => {
  const [result, err] = encryptCurve25519(pubKey64, plaintext);
  if (err) {
    throw new Error(err);
  }
  return result;
};

export const gpDecryptCurve25519 = (
  privKey64: Buffer,
  ciphertext: Buffer,
): Buffer => {
  const [result, err] = decryptCurve25519(privKey64, ciphertext);
  if (err) {
    throw new Error(err);
  }
  return result;
};
