import fs from "fs";
import path from "path";
import { Network } from "@the9born/chains/src";
import {
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
  eddsaSignerRequester,
  CosignerBApi,
  cosignerBSeed,
  agentEndpoint,
  heimName,
} from "./stubs";
import { PublicKey, encrypt } from "eciesjs";
import { bytesToHex } from "@the9born/utils";

import { pathToFileURL } from "url";

async function getSigningSchemeWasm() {
  const jsPath = path.resolve(
    __dirname,
    "./pkg/heim-signing-scheme/heim_signing_scheme.js"
  );
  const importDynamic = new Function("specifier", "return import(specifier)");
  const wasmModule = await importDynamic(pathToFileURL(jsPath).href);
  const wasmPath = path.resolve(
    __dirname,
    "./pkg/heim-signing-scheme/heim_signing_scheme_bg.wasm"
  );
  const wasmBuffer = fs.readFileSync(wasmPath);
  if (typeof wasmModule.initSync === "function") {
    try {
      wasmModule.initSync({ module: wasmBuffer });
    } catch (e) {
      wasmModule.initSync(wasmBuffer);
    }
  } else if (typeof wasmModule.default === "function") {
    await wasmModule.default(wasmBuffer);
  }
  return wasmModule;
}

async function mintWelcomeToken(requesterAddress: string): Promise<void> {
  try {
    const mintWelcomeResponse = await fetch(
      `${agentEndpoint}/testnet_mint_welcome_token`,
      {
        method: "POST",
        body: JSON.stringify({ requesterAddress }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());
    console.log("mintWelcomeResponse", mintWelcomeResponse);
  } catch (error) {
    console.error("Error minting welcome token:", error);
  }
}

async function setupSecondaryAccountDkg(
  requesterAddress: string,
  secondPrivateKeyHex: string,
  secondEd25519PrivateKeyHex: string
) {
  // 1. Initialize heim-signing-scheme WASM module
  const wasm = await getSigningSchemeWasm();

  // 2. Fetch protocol parameters from agent
  console.log("Fetching DKG parameters from agent (/init_pair_key_no_key_1)...");
  const setupResponse = await fetch(`${agentEndpoint}/init_pair_key_no_key_1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requester_address: requesterAddress }),
  });

  if (!setupResponse.ok) {
    throw new Error(
      `Agent /init_pair_key_no_key_1 failed with status ${setupResponse.status}`
    );
  }

  const setupData = await setupResponse.json();
  const setupParams =
    typeof setupData === "string" ? JSON.parse(setupData) : setupData;
  const {
    protocol_public_parameters_str,
    protocol_public_parameters_ed25519_str,
    session_id_str,
    access_structure_str,
  } = setupParams;

  // 3. Compute DKG pair keys with heim-signing-scheme WASM
  console.log("Computing ECDSA pair key DKG with heim-signing-scheme WASM...");
  const resultEcdsa = wasm.init_pair_key_dkg(
    secondPrivateKeyHex,
    session_id_str,
    access_structure_str,
    protocol_public_parameters_str,
    ""
  );

  const resultEcdsaMap =
    resultEcdsa instanceof Map
      ? resultEcdsa
      : new Map(Object.entries(resultEcdsa || {}));
  const proofVerificationRoundPublicInputsStrMap = resultEcdsaMap.get(
    "proof_verification_round_public_inputs_str_map"
  );

  console.log("Computing Ed25519 pair key DKG with heim-signing-scheme WASM...");
  const resultEd25519 = wasm.init_pair_key_dkg_ed25519(
    secondEd25519PrivateKeyHex,
    session_id_str,
    access_structure_str,
    protocol_public_parameters_ed25519_str,
    ""
  );

  const resultEd25519Map =
    resultEd25519 instanceof Map
      ? resultEd25519
      : new Map(Object.entries(resultEd25519 || {}));
  const proofVerificationRoundPublicInputsEd25519StrMap = resultEd25519Map.get(
    "proof_verification_round_public_inputs_str_map_ed25519"
  );

  const proofVerificationRoundPublicInputsStrSerialized =
    typeof proofVerificationRoundPublicInputsStrMap === "string"
      ? proofVerificationRoundPublicInputsStrMap
      : JSON.stringify(
          proofVerificationRoundPublicInputsStrMap instanceof Map
            ? Object.fromEntries(proofVerificationRoundPublicInputsStrMap)
            : proofVerificationRoundPublicInputsStrMap
        );

  const proofVerificationRoundPublicInputsEd25519StrSerialized =
    typeof proofVerificationRoundPublicInputsEd25519StrMap === "string"
      ? proofVerificationRoundPublicInputsEd25519StrMap
      : JSON.stringify(
          proofVerificationRoundPublicInputsEd25519StrMap instanceof Map
            ? Object.fromEntries(proofVerificationRoundPublicInputsEd25519StrMap)
            : proofVerificationRoundPublicInputsEd25519StrMap
        );

  // 4. Send DKG proof public inputs to agent
  console.log("Sending DKG proof public inputs to agent (/init_pair_key_no_key_2)...");
  const dkgResponse = await fetch(`${agentEndpoint}/init_pair_key_no_key_2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requester_address: requesterAddress,
      treasury_index: 0,
      proof_verification_round_public_inputs_str:
        proofVerificationRoundPublicInputsStrSerialized,
      proof_verification_round_public_inputs_str_ed25519:
        proofVerificationRoundPublicInputsEd25519StrSerialized,
      session_id_str,
      access_structure_str,
    }),
  });

  if (!dkgResponse.ok) {
    throw new Error(
      `Agent /init_pair_key_no_key_2 failed with status ${dkgResponse.status}`
    );
  }

  console.log("Secondary account DKG setup completed successfully.");
}

const main = async () => {
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);
  const cosignerBApi = new CosignerBApi(cosignerBSeed);

  const requesterAddress = await heimChainSignerRequester.getAddress();
  const responderAddress = await heimChainSignerResponder.getAddress();

  // 1. At Requester side: Mint welcome token and create requester account
  {
    console.log("1. Creating Requester Account...");
    await mintWelcomeToken(requesterAddress);
    console.log("Waiting for welcome token transfer to be confirmed on chain...");
    await new Promise((resolve) => setTimeout(resolve, 4000));

    await requesterProvider.createRequester(
      responderAddress,
      eddsaSignerRequester
    );
    console.log("Requester account created.");
  }

  // 2. Secondary Account Setup via heim-signing-scheme DKG
  {
    console.log("2. Setting up Secondary Account via heim-signing-scheme DKG...");
    const secondPrivateKeyHex = bytesToHex(
      cosignerBApi.getSecondPrivateKey()
    ).replace(/^0x/, "");
    const secondEd25519PrivateKeyHex = bytesToHex(
      cosignerBApi.getSecondPrivateKey()
    ).replace(/^0x/, "");

    try {
      await setupSecondaryAccountDkg(
        requesterAddress,
        secondPrivateKeyHex,
        secondEd25519PrivateKeyHex
      );
    } catch (err) {
      console.warn("DKG setup error:", err);
    }
  }

  // 3. At Responder side: Create responder account
  {
    console.log("3. Creating Responder Account on Heim...");
    const heimAddress = cosignerBApi.getTwoPartyAddress(
      heimChainSignerRequester.getPublicKey(),
      Network.Heim
    );

    // Get Agent's public key and address
    const { agentPublicKey, agentAddress } =
      await requesterProvider.getAgentInfo();

    // Encrypt secondary private key with ECIES
    const eciesPublicKey = new PublicKey(agentPublicKey);
    const secondPrivateKey = cosignerBApi.getSecondPrivateKey();
    const secondPrivateKeyEnc = encrypt(
      eciesPublicKey.toBytes(),
      secondPrivateKey
    );

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
    console.log("Responder account created.");
  }
};

main();
