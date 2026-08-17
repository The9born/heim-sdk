import { ethers } from "ethers";
import { EcdsaSigner } from "@the9born/crypto/src";
import { EvmChainSigner } from "@the9born/chains/src";
import { Network } from "@the9born/chains/src";
import { keccak256 } from "ethers/lib/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { PaillierPrivateKey } from "@the9born/crypto/src";


describe("EvmChainSigner", () => {
  const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const privateKey =
    "9a41232e2fe88f1436af10c34587cef6bfb8ce494069754da3b82f4ad504cfef";
  const partnerPrivateKey =
    "f25ef3e63d5fd7b39b972350e1f7be5b0d79dd45c0558ff8ea8d7d24be229857";
  const p = BigInt(
    "0x92EAEC07FBDAEE5B4C7BFB4FE764E2182ADCCA04D94A552283FBE3BCB97C726453C3BDC14945A5D1456F8BDC5D3AAF5F331FCEBE44505820CBF71BEDCF1096E15957F07BD36818B921357DC2CA170EF8F1ECEA11819F539C5C5DEB7C785CBF540DEB598D7EE658E85CC073E9ED1CCE12584A2361FC51E7BD164F874EA82B277B"
  );
  const q = BigInt(
    "0xF91A059A79D8520CC9C6F093438A872A3C5C2B78232E610E31264AEAC91571A5E097AA7E9645C1804B026EF8556EDD7D8EA3BD236E2EAF990E21DF21C5464DA504C9B584A53CBBAABF193745395E6601B06AEBC4BCA81824FD049AA6FA530A11D13AC8D2E4F86A3A243042E33CE4428D0431EF6F2BD4713F3398DF19A16D22D1"
  );

  let evmChainSigner: EvmChainSigner;
  let ecdsaSigner: EcdsaSigner;
  let partnerEvmChainSigner: EvmChainSigner;
  let partnerEcdsaSigner: EcdsaSigner;

  beforeAll(() => {
    const paillierPrivateKey = PaillierPrivateKey.fromPQ(p, q);
    const paillierPublicKey = paillierPrivateKey.publicKey;

    ecdsaSigner = new EcdsaSigner({
      curve: secp256k1,
      privateKey: Buffer.from(privateKey, "hex"),
      paillierPrivateKey,
      paillierPublicKey,
    });

    evmChainSigner = new EvmChainSigner({
      networkId: Network.Sepolia,
      // @ts-ignore
      signer: ecdsaSigner,
    });

    partnerEcdsaSigner = new EcdsaSigner({
      curve: secp256k1,
      privateKey: Buffer.from(partnerPrivateKey, "hex"),
      paillierPublicKey,
    });

    partnerEvmChainSigner = new EvmChainSigner({
      networkId: Network.Sepolia,
      // @ts-ignore
      signer: partnerEcdsaSigner,
    });
  });

  it("should throw error if chain id is undefined", () => {
    expect(() => {
      new EvmChainSigner({
        networkId: "evm" as Network,
        // @ts-ignore
        signer: ecdsaSigner,
      });
    }).toThrow("Chain id for evm signer is undefined");
  });

  it("should return correct address from public key", () => {
    const address = evmChainSigner.getAddress();
    const expectedAddress = ethers.utils.computeAddress(`0x${privateKey}`);

    expect(address).toBe(expectedAddress);
  });

  it("should return correct two-party public key", () => {
    const expectedTwoPartyPublicKey = Buffer.from(
      secp256k1.getPublicKey(
        (BigInt(`0x${privateKey}`) * BigInt(`0x${partnerPrivateKey}`)) %
          secp256k1.CURVE.n
      )
    ).toString("hex");

    const twoPartyPublicKey = Buffer.from(
      evmChainSigner.getTwoPartyPublicKey(partnerEvmChainSigner.getPublicKey())
    ).toString("hex");

    expect(twoPartyPublicKey).toBe(expectedTwoPartyPublicKey);
  });

  it("should return correct two-party address", () => {
    const expectedTwoPartyPublicKey = Buffer.from(
      (
        (BigInt(`0x${privateKey}`) * BigInt(`0x${partnerPrivateKey}`)) %
        secp256k1.CURVE.n
      ).toString(16),
      "hex"
    );

    const expectedTwoPartyAddress = ethers.utils.computeAddress(
      expectedTwoPartyPublicKey
    );

    const twoPartyAddress = evmChainSigner.getTwoPartyAddress(
      partnerEvmChainSigner.getPublicKey()
    );

    console.log(twoPartyAddress);

    expect(twoPartyAddress).toBe(expectedTwoPartyAddress);
  });

  it("should return correct v value", () => {
    const signedRawTransaction =
      "0xf86f1285011ce6f4378252089407a37c8019fdd6e513d243f44253e5c54de13d8987038d7ea4c68000808401546d71a0911a884e56bfb5d0f1a45d9572e92e78472c4ffc9afd7d92369dbcc71a6f0ac9a0041733f1b8712f1ca43c7e6c366a59361fc1b21e886ce1c1d7634c03bd6ce237";
    const signedTransaction =
      ethers.utils.parseTransaction(signedRawTransaction);

    const unsignedTransaction = {
      nonce: signedTransaction.nonce,
      gasPrice: signedTransaction.gasPrice,
      gasLimit: signedTransaction.gasLimit,
      to: signedTransaction.to,
      value: signedTransaction.value,
      data: signedTransaction.data,
      chainId: signedTransaction.chainId, // Include chainId for EIP-155 transactions
    };

    const unsignedTxHex =
      ethers.utils.serializeTransaction(unsignedTransaction);

    const v = evmChainSigner.calculateV(
      Buffer.from(keccak256(unsignedTxHex).substring(2), "hex"),
      {
        r: signedTransaction.r!,
        s: signedTransaction.s!,
      },
      signedTransaction.from!,
      signedTransaction.chainId
    );

    expect(v).toBe(signedTransaction.v);
  });

  it("should return correct signature", async () => {
    const txData: ethers.Transaction = {
      type: 2,
      to: mockAddress,
      value: ethers.utils.parseEther("0.001"),
      // @ts-ignore
      gasLimit: 21000,
      maxFeePerGas: ethers.utils.parseUnits("110", "gwei"),
      maxPriorityFeePerGas: ethers.utils.parseUnits("110", "gwei"),
      data: "0x",
      nonce: 0,
      chainId: 11155111,
    };

    const tx = Buffer.from(
      ethers.utils.serializeTransaction(txData).substring(2),
      "hex"
    );

    const { k1, R1 } = evmChainSigner.initializeSignature(tx);

    const encryptedPrivateKey = ecdsaSigner.getEncryptedPrivateKey();
    const { R2, c3 } = partnerEvmChainSigner.getSignatureResponseParams(
      tx,
      R1,
      {
        partnerPrivateKeyEncrypted: encryptedPrivateKey,
        partnerPublicKey: evmChainSigner.getPublicKey(),
      }
    );

    const signature = evmChainSigner.getSignature(
      tx,
      partnerEcdsaSigner.getPublicKey(),
      k1,
      R2,
      c3
    );

    const recoveredAddress = ethers.utils.recoverAddress(
      keccak256(tx),
      signature
    );
    const twoPartyAddress = evmChainSigner.getTwoPartyAddress(
      partnerEvmChainSigner.getPublicKey()
    );

    expect(recoveredAddress).toBe(twoPartyAddress);
  });
});
