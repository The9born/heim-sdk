import { HeimProvider } from "../packages/providers/src";
import { HeimQuery } from "@the9born/providers/src/api/heimQuery";

import {
  ChainSignerFactory,
  CosmosChainSigner,
  Network,
} from "../packages/chains/src";
import { EcdsaSigner, EddsaSigner, PaillierPrivateKey } from "@the9born/crypto";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { Fee } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Any } from "cosmjs-types/google/protobuf/any";
import {
  encodePubkey,
  makeAuthInfoBytes,
  makeSignBytes,
  makeSignDoc,
  Registry,
  TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { defaultRegistryTypes, StargateClient } from "@cosmjs/stargate";
import { BigNumber, ethers } from "ethers";
import { serializeTransaction } from "ethers/lib/utils";
// import { secp256k1Curve } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";
import { DerivationPath, ed25519Curve, secp256k1Curve } from "@the9born/crypto";
import { hexToBigInt } from "@the9born/utils/src";

export const rpcUrl = "https://heimworks-seid-rpc.quickapi.com";
export const agentEndpoint = "https://heimworks-mpc.quickapi.com";
// export const rpcUrl = "http://localhost:26657";
// export const agentEndpoint = "http://localhost:3000";

export const heimName = "heimworksBoy";

export const requesterMnemonic =
  "manual vague ramp loud charge toast banana fly target march anchor joy";

export const requesterAddress = "heim10r4rgvz2zvkzay26hd7peylzdkyrl4p3arp22c";

export const requesterSeed =
  "7865299f9b14b6c8df3b95bd3bb06fff12d29bed982504d8c66d897c70a0217c7b03a8268fabebdf1b10204adcaa465bf6f8293306576228b1cdc86f3170fc96";

export const requesterPrivateKey =
  "7eb5ac15ab60c67653d7819a8f510ef9af32b6c5c5ffb16207bcfc39b97ce992";

export const responderMnemonic =
  "top age evoke two bullet flower copper melody barrel ride write quiz";

export const responderAddress = "heim1m98hpn2tzcsn4ar3jvgd6ed4ymkhccd6hm0u5c";

export const responderSeed =
  "decb79baf7de25236fdb54e3b52c3d1bda2793b9d3476250a01418cf0aac1cb0d4f598f4350cd8e8e74d75c7e5ca539524b5a210d40a212e36a0bcc3b72ee2cc";

export const responderPrivateKey =
  "1114c96cefe29e48765e826f15bf646ded02b6bcf9d30210caf2eb00dc3e258a";

export const cosignerBMnemonic =
  "multiply route mad bachelor vacant brain lake round siren banner smoke duck";

export const cosignerBSeed =
  "f247d32449c18654365b1fd99c5b6d65d2d539ac7bddb73d017987c8f33b4899abce85ab21dead71e593cce472a6e9be9eacf91d6a3ed6264d5738bab65128f1";

export const cosignerBPrivateKey =
  "d17336a46c3595bf909318543968b98aa3465ea7d541bdb460ccb40927e6843f"; // cosignerB's first private key

export const cosignerBSecondPrivateKey =
  "f1ed3e0b659d3f8a94885e5f3db00ae51620060760857edfb830ff4a75f7d7c1"; // cosignerB's second private key

export const paillierP = hexToBigInt(
  // "9738806651549696063664805324913420447644227181715813132044392597641788889643262836038961064219747511013240254382304398628187064061511552215586043939099767"
  "0xfb629212cb8e88c8c4130c9d07bcd690301e3f28a29201739037a3d2fd0c7563ae87e086101176a4eaee69cac0f1d5462ac3422868c578e617923b74d07c75a9"
);

export const paillierQ = hexToBigInt(
  // "11330373220587580615461307323134371072306062539555241393829923926401994647009140412099573071289985649152633649865596731519887007348856616688397442042298711"
  "cd6d53eb4cd92b4c1a9fe30ab7f8aeb33480a378ea7731420fe6b180a350c19ba4ca56ab43a07fb3caeeb611d54c02c7c853ba0389dccd7c64acd172a98b7a59"
);

export const agentAddress = "heim1wlydeygzza5eaqr4y4qyz9s02mfvhhcew0qm4q";

export const agentSeed =
  "7865299f9b14b6c8df3b95bd3bb06fff12d29bed982504d8c66d897c70a0217c7b03a8268fabebdf1b10204adcaa465bf6f8293306576228b1cdc86f3170fc94";


//average diamond impose wasp cover welcome news equal name fee loud blast soap bike retire
export const ownedAccountSeed =
  "b6dc8beac4b1e5762f75e043c9ff4234e38535df6311c9f68c1931f329de6df84f94f30051f20bfc04743bd7ba8147694b08260192ad212deaf03c2589ae1aa1";


// race jacket century photo midnight teach mimic video hope chuckle maple girl address face people 
export const ownedAccountCosignerBSeed = "f271d3bc7738444836deb4308265044f430a39719a5d36d478971624452ddd39ef339e1739684f6a8b85170ac43bd6666d6373f59f51219a94f95920a8520c6e"



export const ownedSignerRequester = EcdsaSigner.fromSeed({
  seed: Buffer.from(ownedAccountSeed, "hex"),
  curve: secp256k1Curve,
});
export const heimChainSignerOwnedAccount = ChainSignerFactory.fromSigner(
  Network.Heim,
  ownedSignerRequester
) as CosmosChainSigner;

export const paillierPrivateKeyRequester = PaillierPrivateKey.fromPQ(
  paillierP,
  paillierQ
);

export const ecdsaSignerRequester = EcdsaSigner.fromSeed({
  seed: Buffer.from(requesterSeed, "hex"),
  paillierPrivateKey: paillierPrivateKeyRequester,
  paillierPublicKey: paillierPrivateKeyRequester.publicKey,
  curve: secp256k1Curve,
});

export const ecdsaSignerResponder = EcdsaSigner.fromSeed({
  seed: Buffer.from(cosignerBSeed, "hex"),
  curve: secp256k1Curve,
});

export const ecdsaSignerAgent = EcdsaSigner.fromSeed({
  seed: Buffer.from(agentSeed, "hex"),
  curve: secp256k1Curve,
});

export const eddsaSignerRequester = EddsaSigner.fromSeed({
  seed: Buffer.from(requesterSeed, "hex"),
  curve: ed25519Curve,
});

export const eddsaSignerResponder = EddsaSigner.fromSeed({
  seed: Buffer.from(responderSeed, "hex"),
  curve: ed25519Curve,
});

export const heimChainSignerRequester = ChainSignerFactory.fromSigner(
  Network.Heim,
  ecdsaSignerRequester
) as CosmosChainSigner;

export const heimChainSignerResponder = ChainSignerFactory.fromSigner(
  Network.Heim,
  ecdsaSignerResponder
) as CosmosChainSigner;

export const heimChainSignerAgent = ChainSignerFactory.fromSigner(
  Network.Heim,
  ecdsaSignerAgent
) as CosmosChainSigner;

export const cosmosChainSignerRequester = ChainSignerFactory.fromSigner(
  Network.CosmosHub,
  ecdsaSignerRequester
) as CosmosChainSigner;

export const cosmosChainSignerResponder = ChainSignerFactory.fromSigner(
  Network.CosmosHub,
  ecdsaSignerResponder
) as CosmosChainSigner;

export const getProvider = async (chainSigner: CosmosChainSigner) => {
  // @ts-ignore
  return await HeimProvider.connect(rpcUrl, chainSigner, agentEndpoint);
};

export const getQuerier = async () => {
  return await HeimQuery.connect(rpcUrl);
}

export const createUnsignedCosmosTransaction = async (
  twoPartyPublicKey: Uint8Array,
  twoPartyAddress: string,
  receiverAddress: string
): Promise<Uint8Array> => {
  const amount = "100000";
  const feeAmount = "5000";
  const gasLimit = 200000;
  const chainId = "cosmoshub-4";

  const msgSend = MsgSend.fromPartial({
    fromAddress: twoPartyAddress,
    toAddress: receiverAddress,
    amount: [
      Coin.fromPartial({
        denom: "uatom",
        amount,
      }),
    ],
  });

  const msgAny = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: msgSend,
  };

  const txBodyEncodeObject: TxBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: [msgAny],
      memo: "",
    },
  };

  const fee = Fee.fromPartial({
    amount: [
      Coin.fromPartial({
        denom: "uatom",
        amount: feeAmount,
      }),
    ],
    gasLimit: BigInt(gasLimit),
  });

  const registry = new Registry(defaultRegistryTypes);
  const txBodyBytes = registry.encode(txBodyEncodeObject);
  const pubkey = encodePubkey(encodeSecp256k1Pubkey(twoPartyPublicKey));

  // Fetch account info (sequence and account number) from the chain
  const stargateClient = await StargateClient.connect(
    "https://cosmos-rpc.publicnode.com/"
  );
  const { sequence, accountNumber } = await stargateClient.getSequence(
    twoPartyAddress
  );

  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey, sequence }],
    fee.amount,
    gasLimit,
    undefined,
    undefined
  );

  const signDoc = makeSignDoc(
    txBodyBytes,
    authInfoBytes,
    chainId,
    accountNumber
  );

  const signBytes = makeSignBytes(signDoc);

  return signBytes;
};

export const createSepoliaTransaction = async (
  twoPartyEvmAddress: string,
  receiver: string
) => {
  const ethProvider = new ethers.providers.JsonRpcProvider(
    "https://ethereum-sepolia-rpc.publicnode.com"
  );

  const tx = {
    to: receiver,
    // value: BigNumber.from("2500000000000000000"),
    value: BigNumber.from("25000000000000"), // 0.000025 ETH
    // value: BigNumber.from("2500000000000000"), // 0.0025 ETH
    // value: BigNumber.from("250000000000000000"), // 0.25 ETH
    // value: BigNumber.from("250000000000000000000"), // 250 ETH
    // value: BigNumber.from("2500000000000000000"), // 2.5 ETH
    // value: BigNumber.from("25000000000000000000"), // 25 ETH
    // value: BigNumber.from("100000000000000000000"), // 100 ETH
    // value: BigNumber.from("10000000000000000000"), // 10 ETH
    // value: BigNumber.from("589575100000000000000000"), // 589575.10 ETH
    // value: BigNumber.from("58957510000000000000000"), // 58957.510 ETH
    // value: BigNumber.from("25000000000000000000000"), // 25000 ETH
    // value: BigNumber.from("250000000000000000000000000"), // 250000000 ETH
    // value: BigNumber.from("2500000000000000000000000000"), // 2500000000 ETH
    gasLimit: BigNumber.from(21000),
    gasPrice: await ethProvider.getGasPrice(),
    nonce: await ethProvider.getTransactionCount(twoPartyEvmAddress),
    chainId: await ethProvider.getNetwork().then((network) => network.chainId),
    data: "0x",
  };

  const serializedTx = Buffer.from(
    serializeTransaction(tx as ethers.Transaction).substring(2),
    "hex"
  );

  return serializedTx;
};

export class CosignerBApi {
  private readonly ecdsaPublicKey: Uint8Array;
  private readonly privateKey: Uint8Array;
  private readonly eddsaPublicKey: Uint8Array;
  private readonly secondPrivateKey: Uint8Array;
  private readonly secondEcdsaPublicKey: Uint8Array;
  private readonly secondEddsaPublicKey: Uint8Array;
  private readonly seed: string;

  constructor(seed: string) {

    // First cosigner from one derivation path
    const wallet = ethers.utils.HDNode.fromSeed(
      Buffer.from(seed, "hex")
    ).derivePath(DerivationPath.Heim);

    this.ecdsaPublicKey = Buffer.from(wallet.publicKey.slice(2), "hex");
    this.privateKey = Buffer.from(wallet.privateKey.slice(2), "hex");
    this.eddsaPublicKey = ed25519.getPublicKey(this.privateKey);

    // Second cosigner from another derivation path
    const secondWallet = ethers.utils.HDNode.fromSeed(
      Buffer.from(seed, "hex")
    ).derivePath(DerivationPath.HeimSecond);

    this.secondEcdsaPublicKey = Buffer.from(secondWallet.publicKey.slice(2), "hex");
    this.secondPrivateKey = Buffer.from(secondWallet.privateKey.slice(2), "hex");
    this.secondEddsaPublicKey = ed25519.getPublicKey(this.secondPrivateKey);
    this.seed = seed;


  }

  getTwoPartyAddress(publicKey: Uint8Array, networkId: Network) {
    const cosignerBSigner = ChainSignerFactory.fromSeed({
      networkId,
      seed: Buffer.from(this.seed, "hex"),
    });

    const heimAddress = cosignerBSigner.getTwoPartyAddress(publicKey);

    return heimAddress;
  }

  getSecondaryTwoPartyAddress(publicKey: Uint8Array, networkId: Network) {
    const secondWallet = ethers.utils.HDNode.fromSeed(
      Buffer.from(this.seed, "hex")
    ).derivePath(DerivationPath.HeimSecond)

    const cosignerBSigner = ChainSignerFactory.fromPrivateKey({
      networkId,
      privateKey: Buffer.from(secondWallet.privateKey.slice(2), "hex"),
    });

    const heimAddress = cosignerBSigner.getTwoPartyAddress(publicKey);

    return heimAddress;
  }

  getEddsaPublicKey() {
    return this.eddsaPublicKey;
  }

  getEcdsaPublicKey() {
    return this.ecdsaPublicKey;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  // Second cosigner
  getSecondEddsaPublicKey() {
    return this.secondEddsaPublicKey;
  }

  getSecondEcdsaPublicKey() {
    return this.secondEcdsaPublicKey;
  }

  getSecondPrivateKey() {
    return this.secondPrivateKey;
  }
}
