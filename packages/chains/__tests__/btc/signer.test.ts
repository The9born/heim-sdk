import bs58check from "bs58check";

import { SchnorrSigner, sha256Hasher } from "@the9born/crypto/src";
import { BtcChainSigner, Network } from "@the9born/chains/src";
import { secp256k1 } from "@noble/curves/secp256k1";
import { signer } from "@cmdcode/crypto-tools";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import * as tools from "uint8array-tools";
import { bigint } from "valibot";
import { formatTaprootTransaction } from "@the9born/crypto/src/signers/btc-helpers";

// want settle soda cloth upgrade front black coach amount scorpion segment skirt - mnemonic
// bc1p9gajv97f67wfs5c4hqmtgj7juyn5prvpn8evag0uy3zqk2qlpnasy9asmq - taproot address
// L52X4dsPR1EaVG1EssPiPbkEc6YsuVeQBVEVMxhNPtwDdF6wPUTW - private key
// tb1qfqlxgdxz6e7cq7zm2vyncnv8c82fu3tqzuvml9 - signet address

function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.subarray(1, 33);
}

function tweakPrivateKey(
  privateKey: Uint8Array,
  tweak: Uint8Array
): Uint8Array {
  const tweakedPrivateKey =
    (BigInt("0x" + Buffer.from(privateKey).toString("hex")) +
      BigInt("0x" + Buffer.from(tweak).toString("hex"))) %
    secp256k1.CURVE.n;

  return leftPadTo32Bytes(Buffer.from(tweakedPrivateKey.toString(16), "hex"));
}

function tweakPublicKey(publicKey: Uint8Array) {
  const xPublicKey = publicKey.subarray(1);
  const tweak =
    BigInt(
      "0x" +
        bitcoin.crypto
          .taggedHash("TapTweak", Buffer.from(xPublicKey))
          .toString("hex")
    ) % secp256k1.CURVE.n;

  let tweakedPublicKey = secp256k1.ProjectivePoint.BASE.multiply(tweak).add(
    secp256k1.ProjectivePoint.fromHex(publicKey)
  );

  return {
    tweaked: Buffer.from(tweakedPublicKey.toHex(), "hex"),
    tweak,
  };
}

function leftPadTo32Bytes(buf: Buffer): Buffer {
  if (buf.length > 32) throw new Error("Buffer is too long!");
  return Buffer.concat([Buffer.alloc(32 - buf.length, 0), buf]);
}

const wifToHex = (wifPk: string): string => {
  let wifDecoded = bs58check.decode(wifPk) as Uint8Array;
  wifDecoded = wifDecoded.subarray(1);

  if (wifPk[0] === "K" || wifPk[0] === "L") {
    wifDecoded = wifDecoded.subarray(0, wifDecoded.length - 1);
  }

  const result = Buffer.from(wifDecoded).toString("hex");
  return result;
};

describe("BtcChainSigner", () => {
  const privateKeyWif = "L52X4dsPR1EaVG1EssPiPbkEc6YsuVeQBVEVMxhNPtwDdF6wPUTW";
  const partnerPrivateKeyWif =
    "L2xVfkmJtqbge7JQWJJR6prHjfnVQmYFDHE3MSTW4xnNnXoBt1y7";

  const sharedAddress =
    "bc1pxsl5aslhtr69h6ec3h6vv86e0lc952wdmj7dx5m2sh0utaqhf4gqjxcmuq";
  const sharedPrivateKey =
    "942376085d32c25960e5fdb2801bef4cd8f3f206f2495a484d217b2105bceb25";

  let btcChainSigner: BtcChainSigner;
  let partnerBtcChainSigner: BtcChainSigner;
  let privateKey: Uint8Array;
  let partnerPrivateKey: Uint8Array;
  let schnorrSigner: SchnorrSigner;
  let partnerSchnorrSigner: SchnorrSigner;

  beforeAll(() => {
    bitcoin.initEccLib(ecc);

    const privateKeyHex = wifToHex(privateKeyWif);
    privateKey = Buffer.from(privateKeyHex, "hex");

    schnorrSigner = new SchnorrSigner({
      curve: secp256k1,
      privateKey,
    });

    btcChainSigner = new BtcChainSigner({
      networkId: Network.Bitcoin,
      // @ts-ignore
      signer: schnorrSigner,
    });

    const partnerPrivateKeyHex = wifToHex(partnerPrivateKeyWif);
    partnerPrivateKey = Buffer.from(partnerPrivateKeyHex, "hex");

    partnerSchnorrSigner = new SchnorrSigner({
      curve: secp256k1,
      privateKey: partnerPrivateKey,
    });

    partnerBtcChainSigner = new BtcChainSigner({
      networkId: Network.Bitcoin,
      // @ts-ignore
      signer: partnerSchnorrSigner,
    });
  });

  it("generates correct p2tr address", () => {
    const address = btcChainSigner.getAddress();

    expect(address).toBe(
      "bc1p9gajv97f67wfs5c4hqmtgj7juyn5prvpn8evag0uy3zqk2qlpnasy9asmq"
    );
  });

  it("generates correct two party address", () => {
    // should result in: bc1p6cy2znp5rnzvqaylgx8qy4nn9585q8r0mj8hy2wauct6c3mrj5yqe3840d
    const address = btcChainSigner.getTwoPartyAddress(
      partnerBtcChainSigner.getPublicKey()
    );

    expect(address).toBe(sharedAddress);
  });

  // it.skip("generates correct two party signature", () => {
  //   const testMessage = Buffer.from("Hello");
  //   const { k1, R1 } = btcChainSigner.initializeSignature(testMessage);

  //   expect(k1).toBeDefined();
  //   expect(R1).toBeDefined();

  //   const { c3: s2, R2 } = partnerBtcChainSigner.getSignatureResponseParams(
  //     testMessage,
  //     R1,
  //     {
  //       partnerPublicKey: btcChainSigner.getPublicKey(),
  //     }
  //   );

  //   expect(s2).toBeDefined();
  //   expect(R2).toBeDefined();

  //   const signature = btcChainSigner.getSignature(
  //     testMessage,
  //     partnerBtcChainSigner.getPublicKey(),
  //     k1,
  //     R2,
  //     s2
  //   );

  //   expect(signature).toBeDefined();

  //   const tppk = secp256k1.ProjectivePoint.fromHex(
  //     btcChainSigner.getPublicKey()
  //   )
  //     .add(
  //       secp256k1.ProjectivePoint.fromHex(partnerBtcChainSigner.getPublicKey())
  //     )
  //     .toRawBytes();

  //   const msgHash = sha256Hasher.hash(testMessage);
  //   const verified = signer.verify_sig(signature, msgHash, tppk);

  //   expect(verified).toBe(true);
  // });

  // it("generates correct pubkey and signature", () => {
  //   const testMessage = Buffer.from("Hello");
  //   const privKey = Buffer.from(
  //     "d1e5a4951334c587ea38d58b317f37ce4e534e9136bb0772d0ac889a339c5429",
  //     "hex"
  //   );
  //   const signature = signer.sign_msg(testMessage, privKey);

  //   const pubkey = Buffer.from(
  //     "0266dcee072df13ec3a9ac6d55c519abbc71eaaae6263254d692238164248f4458",
  //     "hex"
  //   );
  //   const verified = signer.verify_sig(signature, testMessage, pubkey);

  //   expect(verified).toBe(true);
  // });

  it("generates correct signet address", () => {
    const sharedSchnorrSigner = new SchnorrSigner({
      curve: secp256k1,
      privateKey: Buffer.from(sharedPrivateKey, "hex"),
    });

    const sharedBtcSignetChainSigner = new BtcChainSigner({
      networkId: Network.BitcoinSignet,
      // @ts-ignore
      signer: sharedSchnorrSigner,
    });

    const address = sharedBtcSignetChainSigner.getAddress();
    console.log(`Shared signet address: ${address}`);
  });

  // correct tweaked aggregate pubkey is produced ONLY IF one party adds the tweak to the private key
  it("generates correct tweaked aggregate pubkey from private keys", async () => {
    const privateKey = wifToHex(privateKeyWif);
    const partnerPrivateKey = wifToHex(partnerPrivateKeyWif);

    const sharedPrivateKey =
      (BigInt("0x" + privateKey) + BigInt("0x" + partnerPrivateKey)) %
      secp256k1.CURVE.n;
    const sharedPublicKey = secp256k1.getPublicKey(sharedPrivateKey);

    const { tweaked: expectedTweakedPublicKey, tweak } =
      tweakPublicKey(sharedPublicKey);

    const tweakedPrivateKey = tweakPrivateKey(
      Buffer.from(privateKey, "hex"),
      Buffer.from(tweak.toString(16), "hex")
    );

    const sharedTweakedPrivateKey =
      (BigInt("0x" + Buffer.from(tweakedPrivateKey).toString("hex")) +
        BigInt("0x" + partnerPrivateKey)) %
      secp256k1.CURVE.n;

    const tweakedPublicKey = secp256k1.getPublicKey(sharedTweakedPrivateKey);

    expect(Buffer.from(tweakedPublicKey).toString("hex")).toEqual(
      expectedTweakedPublicKey.toString("hex")
    );
  });

  it("generates correct signature for taproot transaction", async () => {
    // first tppk has even tweaked pk
    // second tppk has odd tweaked pk
    const pks = [
      [
        "d1e5a4951334c587ea38d58b317f37ce4e534e9136bb0772d0ac889a339c5429",
        "271745337610d55973865a52f0bfcb2e0ee992c6c31083e34fe91510bf736ef9",
      ],
      [
        "f7c917d0738f7966220bebb6d0fef07dcb2aa749563163d629ee132965cc1fb1",
        "ed7c16b1333f6bf8c7c8ebf406522da83a1c44ae46aef54fbdbd3f11d529ec8d",
      ],
    ];

    for (let [pk1, pk2] of pks) {
      const twoPartyPrivateKey =
        (BigInt("0x" + pk1) + BigInt("0x" + pk2)) % secp256k1.CURVE.n;
      const twoPartyPubKey =
        secp256k1.ProjectivePoint.BASE.multiply(twoPartyPrivateKey);

      console.log(twoPartyPubKey.toHex());

      console.log(twoPartyPrivateKey.toString(16));

      const { pubkey: taprootPubkey } = bitcoin.payments.p2tr({
        internalPubkey: Buffer.from(twoPartyPubKey.x.toString(16), "hex"),
        network: bitcoin.networks.testnet,
      });

      const schnorrSigner1 = new SchnorrSigner({
        curve: secp256k1,
        privateKey: Buffer.from(pk1, "hex"),
      });

      const btcSigner1 = new BtcChainSigner({
        // @ts-ignore
        signer: schnorrSigner1,
        networkId: Network.BitcoinSignet,
      });

      const schnorrSigner2 = new SchnorrSigner({
        curve: secp256k1,
        privateKey: Buffer.from(pk2, "hex"),
      });

      const btcSigner2 = new BtcChainSigner({
        // @ts-ignore
        signer: schnorrSigner2,
        networkId: Network.BitcoinSignet,
      });

      const utxos = [
        {
          txid: "a1b59160ca36ee2e5f2d842cb69b49c6a3904d091aa4702774f1fe518afafc56",
          vout: 0,
          status: { confirmed: false },
          value: 18290,
        },
      ];

      const tppk = btcSigner1.getTwoPartyPublicKey(btcSigner2.getPublicKey());

      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
      const p2pktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(tppk)),
        network: bitcoin.networks.testnet,
      });
      // console.log(p2pktr.address);
      psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: p2pktr.output! },
        tapInternalKey: toXOnly(Buffer.from(twoPartyPubKey.toHex(), "hex")),
      });

      const recipient =
        "tb1pzpm6sjz632lau3wsn49nlzmxmgvl8um8vynjhhgj7k7tv6nxesesgsdum4";
      psbt.addOutput({
        address: recipient,
        value: utxos[0].value - 300,
      });

      const message = formatTaprootTransaction(psbt.toBuffer(), sha256Hasher);

      const { R1, k1 } = btcSigner1.initializeSignature(Buffer.from(message));

      const { c3: s2, R2 } = btcSigner2.getSignatureResponseParams(
        Buffer.from(message),
        R1,
        {
          partnerPublicKey: btcSigner1.getPublicKey(),
        }
      );

      const signature = btcSigner1.getSignature(
        Buffer.from(message),
        btcSigner2.getPublicKey(),
        k1,
        R2,
        s2
      );

      function serializeTaprootSignature(sig: Uint8Array, sighashType: number) {
        const sighashTypeByte = sighashType
          ? Uint8Array.from([sighashType])
          : Uint8Array.from([]);
        return tools.concat([sig, sighashTypeByte]);
      }
      // console.log(psbt.data.inputs[0].sighashType);
      const serializedSignature = serializeTaprootSignature(signature, 0x00);

      psbt.data.updateInput(0, { tapKeySig: Buffer.from(serializedSignature) });
      psbt.finalizeAllInputs();

      const tx = psbt.extractTransaction();
      console.log(tx.toHex());

      const verified = signer.verify_sig(signature, message, taprootPubkey);
      expect(verified).toBe(true);
    }
  });
});
