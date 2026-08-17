import { Network } from "./config";
import { EvmChainSigner } from "./evm";
import { CosmosChainSigner } from "./cosmos";
import { ChainSignerOptions, ChainSigner } from "./base";
import {
  EcdsaSigner,
  Signer,
  PaillierPrivateKey,
  PaillierPublicKey,
  Curve,
  SchnorrSigner,
  EddsaSigner,
} from "@the9born/crypto";
import { TransactionParser } from "./base/parser";
import { CosmosTransactionParser } from "./cosmos/parser";
import { EVMTransactionParser } from "./evm/parser";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";
import { SolanaChainSigner, SolanaTransactionParser } from "./solana";
import { BtcChainSigner } from "./btc";
import { LightningNetworkSigner } from "./lightning";
import { ethers } from "ethers";

type BaseChainSignerOptions = {
  networkId: Network;
  paillierPrivateKey?: PaillierPrivateKey;
  paillierPublicKey?: PaillierPublicKey;
};

type ChainSignerFactoryOptions = BaseChainSignerOptions & {
  seed: Uint8Array;
};

type ChainSignerFromPrivateKeyOptions = Omit<
  ChainSignerOptions<Signer<Curve>>,
  "seed" | "curve" | "signer" | "hasher"
> &
  BaseChainSignerOptions & {
    privateKey: Uint8Array;
  };

export class ChainSignerFactory {
  static fromSigner(
    networkId: Network,
    signer: Signer<Curve>
  ): ChainSigner<Signer<Curve>> {
    switch (networkId) {
      case Network.Ethereum:
      case Network.Sepolia:
        return new EvmChainSigner({ signer: signer as EcdsaSigner, networkId });

      case Network.Heim:
      case Network.CosmosHub:
      case Network.Osmosis:
      case Network.OsmosisTestnet:
      case Network.Agoric:
        return new CosmosChainSigner({
          signer: signer as EcdsaSigner,
          networkId,
        });

      case Network.Bitcoin:
      case Network.BitcoinSignet:
        return new BtcChainSigner({
          signer: signer as SchnorrSigner,
          networkId,
        });

      case Network.Lightning:
      case Network.LightningSignet:
        return new LightningNetworkSigner({
          signer: signer as EcdsaSigner,
          networkId,
        });

      case Network.Solana:
      case Network.TSolana:
        return new SolanaChainSigner({
          signer: signer as EddsaSigner,
          networkId,
        });

      default:
        throw new Error(`Network: ${networkId} not supported`);
    }
  }

  static fromSeed({
    networkId,
    ...options
  }: ChainSignerFactoryOptions): ChainSigner<Signer<Curve>> {
    let signer: Signer<Curve>;

    switch (networkId) {
      case Network.Ethereum:
      case Network.Sepolia:
      case Network.Heim:
      case Network.CosmosHub:
      case Network.Osmosis:
      case Network.OsmosisTestnet:
      case Network.Agoric:
      case Network.Lightning:
      case Network.LightningSignet:
        signer = EcdsaSigner.fromSeed({ ...options, curve: secp256k1 });
        break;

      case Network.Bitcoin:
      case Network.BitcoinSignet:
        signer = SchnorrSigner.fromSeed({ ...options, curve: secp256k1 });
        break;

      case Network.Solana:
      case Network.TSolana:
        signer = EddsaSigner.fromSeed({ ...options, curve: ed25519 });
        break;

      default:
        throw new Error(`Network: ${networkId} not supported`);
    }

    const chainSigner = this.fromSigner(networkId, signer);

    return chainSigner;
  }

  static fromPrivateKey({
    networkId,
    ...options
  }: ChainSignerFromPrivateKeyOptions): ChainSigner<Signer<Curve>> {
    let signer: Signer<Curve>;

    switch (networkId) {
      case Network.Ethereum:
      case Network.Sepolia:
      case Network.Heim:
      case Network.CosmosHub:
      case Network.Osmosis:
      case Network.OsmosisTestnet:
      case Network.Agoric:
      case Network.Lightning:
      case Network.LightningSignet:
        signer = new EcdsaSigner({ ...options, curve: secp256k1 });
        break;

      case Network.Bitcoin:
      case Network.BitcoinSignet:
        signer = new SchnorrSigner({ ...options, curve: secp256k1 });
        break;

      case Network.Solana:
      case Network.TSolana:
        signer = new EddsaSigner({ ...options, curve: ed25519 });
        break;

      default:
        throw new Error(`Network: ${networkId} not supported`);
    }

    const chainSigner = this.fromSigner(networkId, signer);

    return chainSigner;
  }

  static fromMnemonic({
    networkId,
    mnemonic,
    ...options
  }: Omit<ChainSignerFactoryOptions, "seed"> & {
    mnemonic: string;
  }): ChainSigner<Signer<Curve>> {
    if (!ethers.utils.isValidMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    const seedHex = ethers.utils.mnemonicToSeed(mnemonic);
    const seed = ethers.utils.arrayify(seedHex);

    return this.fromSeed({
      networkId,
      seed,
      ...options,
    });
  }
}

export class TransactionParserFactory {
  static fromNetwork(networkId: Network): TransactionParser {
    switch (networkId) {
      case Network.Ethereum:
      case Network.Sepolia:
        return new EVMTransactionParser();

      case Network.CosmosHub:
      case Network.Heim:
      case Network.Osmosis:
      case Network.OsmosisTestnet:
      case Network.Agoric:
        return new CosmosTransactionParser();

      case Network.Solana:
      case Network.TSolana:
        return new SolanaTransactionParser();

      // case Network.Bitcoin:
      // case Network.BitcoinSignet:
      //   return new BtcTransactionParser();

      default:
        throw new Error(`Parser for network: ${networkId} not supported`);
    }
  }
}
