# `@the9born/chains`

Chain-specific signers and parsers for Heim SDK, supporting EVM, Bitcoin, Cosmos, Solana, and Lightning Network.

## Installation

```bash
yarn add @the9born/chains
```

## Usage

```typescript
import { Network, ChainSignerFactory } from "@the9born/chains";

// Instantiate EVM chain signer from seed
const evmSigner = ChainSignerFactory.fromSeed({
  seed: Buffer.from(seedHex, "hex"),
  paillierPrivateKey,
  paillierPublicKey: paillierPrivateKey.publicKey,
  networkId: Network.Sepolia,
});

// Compute MPC two-party address
const twoPartyAddress = evmSigner.getMPCTwoPartyAddress(secondCosignerPublicKey);
```
