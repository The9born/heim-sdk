# `@the9born/crypto`

Cryptographic primitives and multi-party computation signers (ECDSA, EdDSA, Schnorr, Paillier, Hasher utilities) for Heim SDK.

## Installation

```bash
yarn add @the9born/crypto
```

## Usage

```typescript
import { EcdsaSigner, keccak256Hasher } from "@the9born/crypto";

// Create ECDSA MPC signer instance
const ecdsaSigner = EcdsaSigner.fromSeed(seedBuffer, paillierPrivateKey, paillierPublicKey);

// Hash data with keccak256
const hash = keccak256Hasher.hash(Buffer.from("hello world"));
```
