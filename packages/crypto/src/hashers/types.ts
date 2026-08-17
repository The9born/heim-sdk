export interface Hasher {
  hash(message: Uint8Array): Buffer;
}
