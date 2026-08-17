<div align="center">
  <img src="./assets/logo.png" alt="Heim SDK Logo" width="160" height="160" />
  <h1>Heim SDK</h1>
  <p><b>TypeScript SDK for Heim Blockchain, 2PC MPC Threshold Signing & Cross-Chain Transactions</b></p>
</div>

---

A client-side TypeScript SDK for interacting with the Heim blockchain, managing 2-Party Computation (2PC MPC) signers, and generating threshold signatures for cross-chain transactions (EVM, Cosmos, Solana, Bitcoin).

---

## 📦 Installation

Install the packages from NPM or GitHub:

```json
"dependencies": {
  "@the9born/chains": "0.0.199",
  "@the9born/crypto": "0.0.199",
  "@the9born/providers": "0.0.199",
  "@the9born/utils": "0.0.199"
}
```

Or install directly via Git repository:

```json
"heim-sdk": "git+https://github.com/The9born/heim-sdk.git"
```

---

## 🛠️ Development & Testing

```bash
# Install all dependencies
yarn install

# Build all packages
yarn build

# Run unit tests
yarn test
```

---

## 🚀 Quick Start & Basic Flows

The Heim SDK follows a straightforward lifecycle for account creation, secondary account distributed key generation (DKG), and 2-Party ECDSA threshold signing.

> [!NOTE]
> Below are the core, basic patterns to follow when building applications with Heim. See the [`examples/`](./examples) directory for complete executable scripts.

---

### Step 1: Initialize Providers & Signers

```typescript
import { Network, ChainSignerFactory } from "@the9born/chains";
import { HeimProvider, HeimQuery, deserializeAffinePoint } from "@the9born/providers";
import { keccak256Hasher } from "@the9born/crypto";
import { PublicKey, encrypt } from "eciesjs";
import { ethers } from "ethers";
import { getProvider, heimChainSignerRequester, heimChainSignerResponder, eddsaSignerRequester, CosignerBApi, cosignerBSeed, rpcUrl, heimName } from "./examples/stubs";

const requesterProvider = await getProvider(heimChainSignerRequester);
const responderProvider = await getProvider(heimChainSignerResponder);
const cosignerBApi = new CosignerBApi(cosignerBSeed);
```

---

### Step 2: Create Requester Account

```typescript
// Requester registers with the Responder's Heim address
await requesterProvider.createRequester(
  heimChainSignerResponder.getAddress(),
  eddsaSignerRequester
);
```

---

### Step 3: Setup Secondary Account DKG (`heim-signing-scheme`)

```typescript
import fs from "fs";
import path from "path";
import { bytesToHex } from "@the9born/utils";

// 1. Initialize heim-signing-scheme WASM module
const wasmModule = await import("./examples/pkg/heim-signing-scheme/heim_signing_scheme.js");
const wasmBuffer = fs.readFileSync(path.join(__dirname, "./examples/pkg/heim-signing-scheme/heim_signing_scheme_bg.wasm"));
wasmModule.initSync({ module: wasmBuffer });

// 2. Fetch protocol parameters from Agent
const setupResponse = await fetch(`${agentEndpoint}/init_pair_key_no_key_1`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ requester_address: await heimChainSignerRequester.getAddress() }),
});
const setupParams = await setupResponse.json();

// 3. Compute local ECDSA & Ed25519 DKG shares
const secondPrivateKeyHex = bytesToHex(cosignerBApi.getSecondPrivateKey()).replace(/^0x/, "");
const resEcdsa = wasmModule.init_pair_key_dkg(
  secondPrivateKeyHex,
  setupParams.session_id_str,
  setupParams.access_structure_str,
  setupParams.protocol_public_parameters_str,
  ""
);
const resEd25519 = wasmModule.init_pair_key_dkg_ed25519(
  secondPrivateKeyHex,
  setupParams.session_id_str,
  setupParams.access_structure_str,
  setupParams.protocol_public_parameters_ed25519_str,
  ""
);

// 4. Send proof verification round public inputs to Agent
await fetch(`${agentEndpoint}/init_pair_key_no_key_2`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requester_address: await heimChainSignerRequester.getAddress(),
    treasury_index: 0,
    proof_verification_round_public_inputs_str: JSON.stringify(Object.fromEntries(resEcdsa.get("proof_verification_round_public_inputs_str_map"))),
    proof_verification_round_public_inputs_str_ed25519: JSON.stringify(Object.fromEntries(resEd25519.get("proof_verification_round_public_inputs_str_map_ed25519"))),
    session_id_str: setupParams.session_id_str,
    access_structure_str: setupParams.access_structure_str,
  }),
});
```

---

### Step 4: Create Responder Account on Heim

```typescript
const heimAddress = cosignerBApi.getTwoPartyAddress(
  heimChainSignerRequester.getPublicKey(),
  Network.Heim
);

const { agentPublicKey, agentAddress } = await requesterProvider.getAgentInfo();
const eciesPublicKey = new PublicKey(agentPublicKey);
const secondPrivateKey = cosignerBApi.getSecondPrivateKey();
const secondPrivateKeyEnc = encrypt(eciesPublicKey.toBytes(), secondPrivateKey);

const secondaryAddress = cosignerBApi.getSecondaryTwoPartyAddress(
  heimChainSignerRequester.getPublicKey(),
  Network.Heim
);

await responderProvider.createResponder({
  heimAddress,
  cosignerBData: {
    ecdsaPublicKey: cosignerBApi.getEcdsaPublicKey(),
    ed25519PublicKey: cosignerBApi.getEddsaPublicKey(),
  },
  agentAddress,
  secondPrivateKeyEnc,
  secondaryAddress,
  heimName,
});
```

---

### Step 5: 2PC MPC Threshold Signing & Verification

```typescript
// 1. Derive the 2PC threshold address
const evmSignerRequester = ChainSignerFactory.fromSeed({
  seed: Buffer.from(requesterSeed, "hex"),
  paillierPrivateKey: paillierPrivateKeyRequester,
  paillierPublicKey: paillierPrivateKeyRequester.publicKey,
  networkId: Network.Sepolia,
});

const secondCosignerBPublicKey = cosignerBApi.getSecondaryPublicKey();
const secondaryTwoPartyEvmAddress = evmSignerRequester.getTwoPartyAddress(secondCosignerBPublicKey);

// 2. Construct raw unsigned transaction
const serializedTx = await createSepoliaTransaction(
  secondaryTwoPartyEvmAddress,
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
);

// 3. Requester initializes signature (computes k1 and R1)
const { k1, R1 } = await evmSignerRequester.getSigner().initializeSignature(serializedTx, keccak256Hasher);

// 4. Cosigner B / Agent computes partial response (R2 and c3)
const agentSignedOutput = await mockCosignerSign({ ... });
const c3 = BigInt("0x" + agentSignedOutput.c3Buf);
const R2 = deserializeAffinePoint(Buffer.from(agentSignedOutput.r2Buf, "hex"));

// 5. Finalize transaction into valid signed EVM RLP
const signedTxBytes = await evmSignerRequester.finalizeTransaction(
  Buffer.from(serializedTx),
  secondCosignerBPublicKey,
  k1,
  R2,
  c3
);

// 6. Cryptographic Proof: Recover signer address from signature
const parsedTx = ethers.utils.parseTransaction("0x" + Buffer.from(signedTxBytes).toString("hex"));
const messageHash = keccak256Hasher.hash(serializedTx);
const recoveredAddress = ethers.utils.recoverAddress(messageHash, {
  r: parsedTx.r!,
  s: parsedTx.s!,
  v: parsedTx.v!,
});

console.log("Expected Address:", secondaryTwoPartyEvmAddress);
console.log("Recovered Signer:", recoveredAddress);
// recoveredAddress === secondaryTwoPartyEvmAddress
```

---

## 📂 Example Scripts

| Example Script | Description |
| :--- | :--- |
| [`examples/create-admin-account.ts`](./examples/create-admin-account.ts) | Full end-to-end setup: Requester, `heim-signing-scheme` DKG, and Responder account creation. |
| [`examples/worker/evm-tx.ts`](./examples/worker/evm-tx.ts) | 2PC MPC EVM transaction signing for secondary accounts with address recovery proof. |
| [`examples/worker/evm-tx-offline.ts`](./examples/worker/evm-tx-offline.ts) | Offline 2PC MPC ECDSA threshold signature testing and validation loop. |
| [`examples/primary-tx-flow.ts`](./examples/primary-tx-flow.ts) | Primary Account 2PC MPC EVM and Cosmos transaction signing flow. |

---

## 📄 License

MIT License.
