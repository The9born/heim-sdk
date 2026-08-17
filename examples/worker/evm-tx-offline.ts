import {
  createSepoliaTransaction,
  getProvider,
  heimChainSignerAgent,
  heimChainSignerRequester,
  paillierPrivateKeyRequester,
  requesterSeed,
  heimChainSignerResponder,
  cosignerBSecondPrivateKey,
  CosignerBApi,
  cosignerBSeed,
  rpcUrl,
  requesterPrivateKey,
} from "../stubs";
import { ethers } from "ethers";
import { Network } from "@the9born/chains";
import { mockCosignerSign } from "../mock-cosigner";
import { ec } from "elliptic";
import { ChainSignerFactory } from "@the9born/chains/src";
import { bytesToHex, hexStringToBase64, hexToBigInt } from "@the9born/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { EcdsaSigner, secp256k1Curve } from "@the9born/crypto";
import { keccak256Hasher } from "@the9born/crypto/src";
import { serializeAffinePoint, deserializeAffinePoint } from "@the9born/providers/src/helpers";

const secp256k1Elip = new ec("secp256k1");

export type SignatureRequestFull = {
  networkId: string;
  tx: string;
  r1: string;
};

export type SignatureReqResFull = {
  signatureRequest: SignatureRequestFull;
};

const main = async () => {
  const max = 100;
  let fail = 0;
  for (let i = 0; i < max; i++) {
    try {
      const evmSignerRequester = ChainSignerFactory.fromSeed({
        seed: Buffer.from(requesterSeed, "hex"),
        paillierPrivateKey: paillierPrivateKeyRequester,
        paillierPublicKey: paillierPrivateKeyRequester.publicKey,
        networkId: Network.Sepolia,
      });
      const cosignerBApi = new CosignerBApi(cosignerBSeed);

      // Calculation of the second two party address
      const secondCosignerBPublicKey = secp256k1Elip
        .keyFromPrivate(cosignerBApi.getSecondPrivateKey())
        .getPublic();
      const secondaryTwoPartyEvmAddress = evmSignerRequester.getTwoPartyAddress(
        Buffer.from(secondCosignerBPublicKey.encode("array", true))
      );
      console.log("secondaryTwoPartyEvmAddress", secondaryTwoPartyEvmAddress);

      const serializedTx = await createSepoliaTransaction(
        secondaryTwoPartyEvmAddress,
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
      );

      const { k1: k1Req, R1 } = await evmSignerRequester.getSigner().initializeSignature(serializedTx, keccak256Hasher);
      const R164 = Buffer.from(serializeAffinePoint(R1)).toString("base64");

      const signatureRequest = {
        networkId: Network.Sepolia,
        transaction: Buffer.from(serializedTx).toString("base64"),
        r1: R164,
      };

      console.log("k1Req", k1Req);
      console.log("signatureRequest", signatureRequest);

      const requesterInfo = {
        cosigner: {
          paillierPublic: hexStringToBase64(paillierPrivateKeyRequester.publicKey.n.toString(16)),
          ecdsaPrivateEncrypted: hexStringToBase64(paillierPrivateKeyRequester.publicKey.encrypt(hexToBigInt(requesterPrivateKey)).toString(16)),
        }
      };

      // Sign as agent
      if (true) {
        const agentSignedOutput = await mockCosignerSign({
          ecdsaPrivateKey: bytesToHex(cosignerBApi.getSecondPrivateKey()),
          signatureRequest,
          partnerEcdsaPrivateEncrypted: requesterInfo.cosigner.ecdsaPrivateEncrypted,
          paillierPublic: requesterInfo.cosigner.paillierPublic,
        });

        const tx = Buffer.from(serializedTx);
        const c3 = BigInt("0x" + agentSignedOutput.c3Buf);
        const R2 = deserializeAffinePoint(Buffer.from(agentSignedOutput.r2Buf, "hex"));

        console.log("R2", R2);

        const signedTx = await evmSignerRequester.finalizeTransaction(
          tx,
          Buffer.from(secondCosignerBPublicKey.encode("array", true)),
          k1Req,
          R2,
          c3
        );
        console.log("signedTx", Buffer.from(signedTx).toString("hex"));
      }
    } catch (e) {
      console.log("fail", e);
      fail++;
    }
  }

  console.log("fail", fail, "of", max);
};

main();
