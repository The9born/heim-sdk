import {
  createSepoliaTransaction,
  getProvider,
  heimChainSignerAgent,
  heimChainSignerRequester,
  paillierPrivateKeyRequester,
  requesterSeed,
  requesterPrivateKey,
  CosignerBApi,
  cosignerBSeed,
  rpcUrl,
} from "../stubs";
import { ethers } from "ethers";
import { Network } from "@the9born/chains";
import { ChainSignerFactory } from "@the9born/chains";
import { bytesToHex, hexStringToBase64, hexToBigInt } from "@the9born/utils";
import { deserializeAffinePoint, serializeAffinePoint } from "@the9born/providers/src";
import { keccak256Hasher } from "@the9born/crypto";
import { mockCosignerSign } from "../mock-cosigner";
import { ec } from "elliptic";

const secp256k1Elip = new ec("secp256k1");

const main = async () => {
  console.log("=== Heim Secondary Account 2PC MPC EVM Transaction Proof ===");

  // 1. Initialize Requester (Party A) with Paillier & Seed
  const evmSignerRequester = ChainSignerFactory.fromSeed({
    seed: Buffer.from(requesterSeed, "hex"),
    paillierPrivateKey: paillierPrivateKeyRequester,
    paillierPublicKey: paillierPrivateKeyRequester.publicKey,
    networkId: Network.Sepolia,
  });

  // 2. Initialize Cosigner B (Party B) for Secondary Account
  const cosignerBApi = new CosignerBApi(cosignerBSeed);
  const secondPrivateKeyBytes = cosignerBApi.getSecondPrivateKey();
  const secondCosignerBPublicKey = secp256k1Elip
    .keyFromPrivate(secondPrivateKeyBytes)
    .getPublic();

  // 3. Compute Secondary 2PC MPC Ethereum Address
  const secondCosignerBPublicKeyBuffer = Buffer.from(
    secondCosignerBPublicKey.encode("array", true)
  );
  const secondaryTwoPartyEvmAddress = evmSignerRequester.getTwoPartyAddress(
    secondCosignerBPublicKeyBuffer
  );
  console.log("1. Secondary 2PC EVM Address:", secondaryTwoPartyEvmAddress);

  // 4. Create Unsigned Sepolia Transaction from Secondary 2PC Address
  const recipient = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
  const serializedTx = await createSepoliaTransaction(
    secondaryTwoPartyEvmAddress,
    recipient
  );
  console.log("2. Unsigned Raw Transaction:", Buffer.from(serializedTx).toString("hex"));

  // 5. Requester (Party A): Initialize Signature (k1, R1)
  const { k1: k1Req, R1 } = await evmSignerRequester
    .getSigner()
    .initializeSignature(serializedTx, keccak256Hasher);
  const R1Base64 = Buffer.from(serializeAffinePoint(R1)).toString("base64");

  const signatureRequest = {
    networkId: Network.Sepolia,
    transaction: Buffer.from(serializedTx).toString("base64"),
    r1: R1Base64,
  };
  console.log("3. Requester Signature Request (R1 generated):", R1Base64.slice(0, 40) + "...");

  // 6. Cosigner B / MPC Agent (Party B): Sign with Secondary Private Key / Share
  const requesterInfo = {
    cosigner: {
      paillierPublic: hexStringToBase64(
        paillierPrivateKeyRequester.publicKey.n.toString(16)
      ),
      ecdsaPrivateEncrypted: hexStringToBase64(
        paillierPrivateKeyRequester.publicKey
          .encrypt(hexToBigInt(requesterPrivateKey))
          .toString(16)
      ),
    },
  };

  const agentSignedOutput = await mockCosignerSign({
    ecdsaPrivateKey: bytesToHex(secondPrivateKeyBytes),
    signatureRequest,
    partnerEcdsaPrivateEncrypted: requesterInfo.cosigner.ecdsaPrivateEncrypted,
    paillierPublic: requesterInfo.cosigner.paillierPublic,
  });

  const c3 = BigInt("0x" + agentSignedOutput.c3Buf);
  const R2 = deserializeAffinePoint(
    Buffer.from(agentSignedOutput.r2Buf, "hex")
  );
  console.log("4. Cosigner B Signed Response (R2, c3 received)");

  // 7. Requester (Party A): Finalize 2PC MPC Transaction
  const signedTxBytes = await evmSignerRequester.finalizeTransaction(
    Buffer.from(serializedTx),
    secondCosignerBPublicKeyBuffer,
    k1Req,
    R2,
    c3
  );
  const signedTxHex = Buffer.from(signedTxBytes).toString("hex");
  console.log("5. Finalized Signed Raw EVM Tx:", signedTxHex);

  // 8. Cryptographic Proof: Parse and Recover Signer Address from Signature
  const parsedTx = ethers.utils.parseTransaction("0x" + signedTxHex);
  const messageHash = keccak256Hasher.hash(serializedTx);
  const recoveredAddress = ethers.utils.recoverAddress(messageHash, {
    r: parsedTx.r!,
    s: parsedTx.s!,
    v: parsedTx.v!,
  });

  console.log("\n=== VERIFICATION RESULT ===");
  console.log("Expected Secondary 2PC Address:", secondaryTwoPartyEvmAddress);
  console.log("Recovered Signer Address:     ", recoveredAddress);
  console.log("Signature (r):", parsedTx.r);
  console.log("Signature (s):", parsedTx.s);
  console.log("Signature (v):", parsedTx.v);

  if (recoveredAddress.toLowerCase() === secondaryTwoPartyEvmAddress.toLowerCase()) {
    console.log("\n🎉 SUCCESS: 2PC MPC Signature is 100% VALID for Secondary Account!");
  } else {
    console.error("\n❌ ERROR: Address mismatch!");
    process.exit(1);
  }
};

main();
