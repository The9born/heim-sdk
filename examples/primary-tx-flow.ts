import {
  getProvider,
  heimChainSignerRequester,
  heimChainSignerResponder,
  createSepoliaTransaction,
  ecdsaSignerRequester,
  createUnsignedCosmosTransaction,
  ecdsaSignerResponder,
  cosignerBPrivateKey,
  CosignerBApi,
  cosignerBSeed,
} from "./stubs";
import { Network, ChainSignerFactory } from "@the9born/chains";
import { mockCosignerSign } from "./mock-cosigner";

const evmReceiver = "0xe7aAD417f178437e16551255515F77e506b0e039";

/**
 * Primary Account 2PC MPC EVM Transaction Flow:
 * 1. Derives Primary 2PC EVM Address for Requester (Party A) + Cosigner B (Party B).
 * 2. Requester initiates signature request on Heim.
 * 3. Cosigner B computes 2PC ECDSA partial signature (R2, c3).
 * 4. Responder submits SignatureResponse on Heim.
 */
export const primaryEvmTxFlow = async () => {
  console.log("=== Primary Account EVM Transaction Flow ===");
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);

  const evmSignerRequester = ChainSignerFactory.fromSigner(
    Network.Sepolia,
    ecdsaSignerRequester
  );

  const cosignerBApi = new CosignerBApi(cosignerBSeed);
  const twoPartyEvmAddress = cosignerBApi.getTwoPartyAddress(
    evmSignerRequester.getPublicKey(),
    Network.Sepolia
  );
  console.log("1. Primary 2PC EVM Address:", twoPartyEvmAddress);

  const serializedTx = await createSepoliaTransaction(
    twoPartyEvmAddress,
    evmReceiver
  );
  console.log("2. Serialized Unsigned Tx (hex):", Buffer.from(serializedTx).toString("hex"));

  // 1. Requester requests signature on Heim
  const { k1, signatureRequest } = await requesterProvider.requestSignature(
    serializedTx,
    evmSignerRequester
  );
  console.log("3. Signature requested on Heim. k1:", k1);

  // 2. Fetch Requester's Paillier public key & encrypted private key for 2PC computation
  const requesterInfo = await requesterProvider.getRequesterData(
    heimChainSignerRequester.getAddress()
  );

  // 3. Cosigner B computes 2PC partial signature
  const cosignerOutput = await mockCosignerSign({
    ecdsaPrivateKey: cosignerBPrivateKey,
    signatureRequest,
    paillierPublic: requesterInfo.cosigner.paillierPublic,
    partnerEcdsaPrivateEncrypted: requesterInfo.cosigner.ecdsaPrivateEncrypted,
  });
  console.log("4. Cosigner B generated R2 and c3");

  // 4. Responder submits signature response on Heim
  await responderProvider.respondToSignatureRequest({
    c3: cosignerOutput.c3Buf,
    r2: cosignerOutput.r2Buf,
  });
  console.log("5. Responder submitted response to Heim blockchain.");
};

/**
 * Primary Account 2PC MPC Cosmos Transaction Flow:
 * 1. Derives Primary 2PC Cosmos Address for Requester (Party A) + Cosigner B (Party B).
 * 2. Requester creates unsigned Cosmos transaction and requests signature on Heim.
 * 3. Cosigner B computes 2PC ECDSA partial signature (R2, c3).
 * 4. Responder submits SignatureResponse on Heim.
 */
export const primaryCosmosTxFlow = async () => {
  console.log("\n=== Primary Account Cosmos Transaction Flow ===");
  const requesterProvider = await getProvider(heimChainSignerRequester);
  const responderProvider = await getProvider(heimChainSignerResponder);

  const cosmosSignerRequester = ChainSignerFactory.fromSigner(
    Network.CosmosHub,
    ecdsaSignerRequester
  );

  const cosmosSignerResponder = ChainSignerFactory.fromSigner(
    Network.CosmosHub,
    ecdsaSignerResponder
  );

  const twoPartyCosmosPublicKey = cosmosSignerRequester.getTwoPartyPublicKey(
    cosmosSignerResponder.getPublicKey()
  );
  const twoPartyCosmosAddress = cosmosSignerRequester.getTwoPartyAddress(
    cosmosSignerResponder.getPublicKey()
  );
  console.log("1. Primary 2PC Cosmos Address:", twoPartyCosmosAddress);

  const serializedTx = await createUnsignedCosmosTransaction(
    twoPartyCosmosPublicKey,
    twoPartyCosmosAddress,
    cosmosSignerRequester.getAddress()
  );
  console.log("2. Unsigned Cosmos Tx (hex):", Buffer.from(serializedTx).toString("hex"));

  // 1. Requester requests signature on Heim
  const { k1, signatureRequest } = await requesterProvider.requestSignature(
    Buffer.from(serializedTx),
    cosmosSignerRequester
  );
  console.log("3. Signature requested on Heim. k1:", k1);

  // 2. Fetch Requester info
  const requesterInfo = await requesterProvider.getRequesterData(
    cosmosSignerRequester.getAddress()
  );

  // 3. Cosigner B computes 2PC partial signature
  const cosignerOutput = await mockCosignerSign({
    ecdsaPrivateKey: cosignerBPrivateKey,
    signatureRequest,
    paillierPublic: requesterInfo.cosigner.paillierPublic,
    partnerEcdsaPrivateEncrypted: requesterInfo.cosigner.ecdsaPrivateEncrypted,
  });
  console.log("4. Cosigner B generated R2 and c3");

  // 4. Responder submits signature response on Heim
  await responderProvider.respondToSignatureRequest({
    c3: cosignerOutput.c3Buf,
    r2: cosignerOutput.r2Buf,
  });
  console.log("5. Responder submitted Cosmos response to Heim blockchain.");
};

const main = async () => {
  await primaryEvmTxFlow();
  await primaryCosmosTxFlow();
};

main();
