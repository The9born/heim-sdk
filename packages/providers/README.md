# `@the9born/providers`

RPC provider and transaction/message encoding library for the Heim blockchain.

## Installation

```bash
yarn add @the9born/providers
```

## Usage

```typescript
import { HeimProvider, HeimQuery } from "@the9born/providers";

// Connect to Heim query client
const heimQuery = await HeimQuery.connect(rpcUrl);

// Connect Heim provider with signer
const provider = await HeimProvider.connect(heimChainSigner);
```
