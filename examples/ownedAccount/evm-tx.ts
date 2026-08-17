import {
  createSepoliaTransaction,
  getProvider,
  heimChainSignerAgent,
  heimChainSignerOwnedAccount,
  paillierPrivateKeyRequester,
  requesterSeed,
  heimChainSignerResponder,
  rpcUrl,
  getQuerier,
  ownedAccountSeed,
  ownedAccountCosignerBSeed,
  heimChainSignerRequester,
  CosignerBApi,
} from "../stubs";
import { ethers } from "ethers";
import { Network } from "@the9born/chains";
import { ec } from "elliptic";
import { ChainSignerFactory } from "@the9born/chains";
import { bytesToHex } from "@the9born/utils";
import { deserializeAffinePoint, HeimQuery, serializeAffinePoint } from "@the9born/providers/src";
import { keccak256Hasher, sha256Hasher } from "@the9born/crypto";

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
  const ownedRequesterProvider = await getProvider(heimChainSignerOwnedAccount);
  const ownedAddress = heimChainSignerOwnedAccount.getAddress();
  const ownedCosignerBApi = new CosignerBApi(ownedAccountCosignerBSeed);
  console.log({ ownedAddress });

  const networkId = Network.Sepolia;
  const evmSignerRequester = ChainSignerFactory.fromSeed({
    seed: Buffer.from(ownedAccountSeed, "hex"),
    paillierPrivateKey: paillierPrivateKeyRequester,
    paillierPublicKey: paillierPrivateKeyRequester.publicKey,
    networkId,
  });

  const ownedCosignerBPublicKeyBuffer = ownedCosignerBApi.getEcdsaPublicKey();

  const ownedTwoPartyEvmAddress = evmSignerRequester.getMPCTwoPartyAddress(
    Buffer.from(ownedCosignerBPublicKeyBuffer)
  );
  console.log("ownedTwoPartyEvmAddress", ownedTwoPartyEvmAddress);

  const serializedTx = await createSepoliaTransaction(
    ownedTwoPartyEvmAddress,
    "0x998Bd820deD1a71C4CFEE5479043AA91e952e1c8"
  );

  const requesterData = await ownedRequesterProvider.getRequesterData(
    heimChainSignerRequester.getAddress()
  );
  const heimAccInfo = await ownedRequesterProvider.getHeimAccountData(
    requesterData.heimAddress
  );
  const granter = heimAccInfo.workerAddress;

  const venueScopeIndex = -1;
  const { k1, R1 } = await evmSignerRequester.getSigner().initializeSignature(serializedTx, keccak256Hasher);
  const res = await ownedRequesterProvider.requestSignatureOwned(Buffer.from(serializeAffinePoint(R1)), serializedTx, networkId, venueScopeIndex, granter);

  console.log({ res });
  const heimQuery = await HeimQuery.connect(rpcUrl);

  const signatureRequestKey = sha256Hasher.hash(Buffer.concat([Buffer.from(serializeAffinePoint(R1)), serializedTx]));
  const signatureRequestKeyBase64 = signatureRequestKey.toString("base64");
  console.log("signatureRequestKeyBase64", signatureRequestKeyBase64);
  const signatureRequest = await heimQuery.getSignatureRequestOwned(signatureRequestKeyBase64);
  console.log("signatureRequest", signatureRequest);

  // After it's signed by the agent
  {
    console.log("Waiting for responder to sign...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log("Done waiting");

    const curSignatureResponse = await heimQuery.getSignatureResponseOwned(
      signatureRequestKeyBase64
    ).then(res => {
      console.log("res", res);
      return res.signatureResponse;
    });

    console.log("r2", curSignatureResponse.r2);
    console.log("c3", curSignatureResponse.c3);

    const signedTx = Buffer.from(curSignatureResponse.r2, "base64");

    const messageHash = keccak256Hasher.hash(serializedTx);
    const rs = signedTx.slice(0, 64);
    let correctAddress: string | null = null;
    let sigWithV = Buffer.concat([rs, Buffer.from([27])]);
    for (let recovery = 0; recovery < 2; recovery++) {
      sigWithV = Buffer.concat([rs, Buffer.from([27 + recovery])]);
      const pubKey = ethers.utils.recoverPublicKey(messageHash, sigWithV);
      const addr = ethers.utils.computeAddress(pubKey);
      if (addr.toLowerCase() === ownedTwoPartyEvmAddress.toLowerCase()) {
        correctAddress = addr;
        break;
      }
    }
    console.log("Recovered address:", correctAddress);
  }
};

main();
