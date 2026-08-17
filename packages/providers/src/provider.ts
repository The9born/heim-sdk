import { Coin, EncodeObject, TxBodyEncodeObject, makeSignBytes, makeSignDoc, makeAuthInfoBytes, encodePubkey } from "@cosmjs/proto-signing";
import { Uint53, Int53 } from "@cosmjs/math";
import { Registry } from "@cosmjs/proto-signing";
import { pubkeyType } from "@cosmjs/launchpad";
import { StargateClient, defaultRegistryTypes, DeliverTxResponse } from "@cosmjs/stargate";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { HeimQuery } from "./api/heimQuery";
import {
  MessageTypeUrl,
  messageTypeUrlToProtoHandler,
} from "./messages/typeUrl";
import { Message } from "./messages/heim/message";
import { CosmosChainSigner, ChainSigner, Network, isTestnet } from "@the9born/chains";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  AffinePoint,
  Curve,
  EddsaSigner,
  Signer,
} from "@the9born/crypto";
import {
  CreateRequesterMessage,
  CreateResponderMessage,
  RequestSignatureMessage,
  SecondaryParams,
  SignatureResponseMessage,
} from "./messages";
import {
  base64ToBytes,
  hexToBytes,
} from "@the9born/utils";
import {
  MsgAddVenueScope,
  MsgTerminateVenueScope,
  MsgUpdateVenueScope,
  MsgUpdateFreebie,
  MsgExchangeGasToken,
  MsgCreateTradeIntentionResponses,
  MsgCreateTradeIntentionRequests,
  MsgBrokerMatchIntentions,
  MsgFinalizeTradeIntentions,
  MsgBuyTicket,
} from "./ts-proto/heim/heim/tx";
import Long from "long";
import { serializeAffinePoint } from "./helpers";
import { ResolveAdminRequestMessage } from "./messages/heim/resolveAdminRequest";
import { CreateTradeIntentionMessage } from "./messages/heim/requestTradeIntention";
import { RespondTradeIntentionMessage } from "./messages/heim/respondTradeIntention";
import { UpdateFreebieMessage } from "./messages/heim/updateFreebie";
import { AddVenueScopeMessage } from "./messages/heim/addVenueScope";
import { UpdateVenueScopeMessage } from "./messages/heim/updateVenueScope";
import { TerminateVenueScopeMessage } from "./messages/heim/terminateVenueScope";
import { CancelSignatureMessage } from "./messages/heim/cancelSignature";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { SimpleMessage } from "./messages/heim/simpleMessage";
import { RequestCreateOwnedAccountMessage } from "./messages/heim/requestCreateOwnedAccount";
import { RespondCreateOwnedAccountMessage } from "./messages/heim/respondCreateOwnedAccount";
import { RequestSignatureOwnedMessage } from "./messages/heim/requestSignatureOwned";
import { RespondSignatureOwnedMessage } from "./messages/heim/respondSignatureOwned";
import { CreateBrokerMatchIntentionsMessage } from "./messages/heim/brokerMatchIntentions";
import { CreateFinalizeTradeIntentionsMessage } from "./messages/heim/finalizeTradeIntentions";

type CreateResponderData = {
  heimAddress: string;
  cosignerBData: CosignerBData;
  agentAddress: string;
  secondPrivateKeyEnc: Uint8Array;
  secondaryAddress: string;
  heimName: string;
};

type SignatureResponseInput = {
  responderAddress?: string;
  requesterAddress?: string; // for institutional accounts that don't have responder address, we can use requester address to find the request and respond to it
  c3: string;
  r2: string;
};

// used for simulating the gas fee since cosmos-sdk
// needed because cosmos-sdk still checks public key and signature even if it is simulation
// at the end it just disregards them and creates a mock signature
// FIXED IN: https://github.com/cosmos/cosmos-sdk/pull/21386
const PublicKeyMock = {
  type: pubkeyType.secp256k1,
  value: "A7EAO5dB4XnmkEjncElaBwKp33KeCA8K2xrgoz/bxTmR",
};
const descriptionLengthLimit = 20;

export const getHeimRegistry = () => {
  const registry = new Registry(defaultRegistryTypes);
  Object.entries(messageTypeUrlToProtoHandler).forEach(
    ([messageType, protoHandler]) => {
      //@ts-ignore
      registry.register(messageType, protoHandler);
    }
  );

  return registry;
};

export type EstimateGasParams = {
  senderAddress: string;
  messages: readonly EncodeObject[];
  memo?: string;
};

export type CosignerBData = {
  ecdsaPublicKey: Uint8Array;
  ed25519PublicKey: Uint8Array;
};

export const HeimAddressPrefix = "heim";
export const FixedGasPrice = "0.000001";

export class HeimProvider {
  readonly rpcUrl: string;

  private stargateClient: StargateClient;
  private registry: Registry;
  private heimQuery: HeimQuery;
  private heimChainSigner: CosmosChainSigner;
  private agentEndpoint: string;

  private constructor(
    stargateClient: StargateClient,
    heimQuery: HeimQuery,
    heimChainSigner: CosmosChainSigner,
    agentEndpoint: string
  ) {
    this.stargateClient = stargateClient;
    this.heimQuery = heimQuery;
    this.heimChainSigner = heimChainSigner;
    this.agentEndpoint = agentEndpoint;

    this.registry = getHeimRegistry();
  }

  static async connect(
    rpcUrl: string,
    heimChainSigner: CosmosChainSigner,
    agentEndpoint: string
  ) {
    const stargateClient = await StargateClient.connect(rpcUrl);
    const heimQuery = await HeimQuery.connect(rpcUrl);
    return new HeimProvider(
      stargateClient,
      heimQuery,
      heimChainSigner,
      agentEndpoint
    );
  }

  async getChainId() {
    const chainId = await this.stargateClient.getChainId();
    return chainId;
  }

  async estimateGas({ senderAddress, messages, memo = "" }: EstimateGasParams) {
    const { sequence, accountNumber } = await this.stargateClient.getSequence(
      senderAddress
    );

    messages = messages.map((m) => this.registry.encodeAsAny(m));

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const queryClient = this.stargateClient.forceGetQueryClient();
    const { gasInfo } = await queryClient.tx.simulate(
      messages,
      memo,
      PublicKeyMock,
      sequence
    );

    if (!gasInfo) {
      throw Error("transaction simulation failed");
    }

    return {
      estimatedGas: Uint53.fromString(gasInfo.gasUsed.toString()).toNumber(),
      sequence,
      accountNumber,
    };
  }

  async signMessage(message: Message, granter?: string) {
    const senderAddress = this.heimChainSigner.getAddress();
    const senderPublicKey = this.heimChainSigner.getPublicKey();

    const { signBytes, signDoc } = await message.getUnsignedData(
      senderAddress,
      senderPublicKey,
      this,
      granter
    );

    const signature = this.heimChainSigner.sign(Buffer.from(signBytes));

    const transaction = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [signature],
    });

    const txBytes = TxRaw.encode(transaction).finish();
    return txBytes;
  }

  async signAndSend(message: Message, granter?: string) {
    const txBytes = await this.signMessage(message, granter);
    const response = await this.stargateClient.broadcastTx(txBytes);

    return response;
  }

  async signMultipleMessages(messages: Message[], granter?: string) {
    const senderAddress = this.heimChainSigner.getAddress();
    const senderPublicKey = this.heimChainSigner.getPublicKey();

    const serializedMessages = messages.map((m) => m.serialize());

    const { estimatedGas, sequence, accountNumber } = await this.estimateGas({
      senderAddress,
      messages: serializedMessages,
    });

    const fee = messages[0].formatFee(estimatedGas);

    const txBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: serializedMessages,
        memo: "",
      },
    };

    const txBodyBytes = this.registry.encode(txBodyEncodeObject);
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    const pubkey = encodePubkey(encodeSecp256k1Pubkey(senderPublicKey));

    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence }],
      fee.amount,
      gasLimit,
      granter,
      undefined
    );

    const chainId = await this.getChainId();
    const signDoc = makeSignDoc(
      txBodyBytes,
      authInfoBytes,
      chainId,
      accountNumber
    ) as any; // Type assertions for compatibility

    const signBytes = makeSignBytes(signDoc);
    const signature = this.heimChainSigner.sign(Buffer.from(signBytes));

    const transaction = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [signature],
    });

    const txBytes = TxRaw.encode(transaction).finish();
    return txBytes;
  }

  async signAndSendMultiple(messages: Message[], granter?: string): Promise<DeliverTxResponse> {
    const txBytes = await this.signMultipleMessages(messages, granter);
    const response = await this.stargateClient.broadcastTx(txBytes);

    return response;
  }

  async getResponderData(responderAddress: string) {
    const data = await this.heimQuery.responderData(responderAddress);
    return data;
  }

  async getRequesterData(requesterAddress: string) {
    const data = await this.heimQuery.requesterData(requesterAddress);
    return data;
  }

  async getHeimAccountData(adminAddress: string) {
    const data = await this.heimQuery.heimAccount(adminAddress);
    return data;
  }

  async getHeimInstitutionalAccountData(requesterAddress: string) {
    const data = await this.heimQuery.heimInstitutionalAccount(requesterAddress);
    return data;
  }

  // Before using this, submit init_pair_key_no_key_1 to the agent first
  async createRequester(responder: string, eddsaSigner: EddsaSigner) {
    const ecdsaSigner = this.heimChainSigner.getSigner();
    const message = new CreateRequesterMessage({
      requesterAddress: this.heimChainSigner.getAddress(),
      responderAddress: responder,
      paillierPublicKeyN: ecdsaSigner.getPaillierPublicKey().n,
      encryptedEcdsaPrivateKey: ecdsaSigner.getEncryptedPrivateKey(),
      ed25519PublicKey: eddsaSigner.getPublicKey(),
      ecdsaPublicKey: this.heimChainSigner.getPublicKey(),
    });

    const response = await this.signAndSend(message);
    return { response };
  }

  async shouldReverseReqRes(message: Buffer, networkId: Network) {
    const isInternal = networkId === Network.Heim;
    if (!isInternal) {
      return {
        allAreSettings: false,
        lastTypeUrl: "",
      };
    }

    const decodedMessages = await Message.getMessageFromSignBytes(
      message,
      this.registry
    );
    let lastTypeUrl = "";
    const isSettingTypeUrls = {
      "/heim.heim.MsgUpdateFreebie": MsgUpdateFreebie,
      "/heim.heim.MsgTerminateVenueScope": MsgTerminateVenueScope,
      "/heim.heim.MsgUpdateVenueScope": MsgUpdateVenueScope,
      "/heim.heim.MsgAddVenueScope": MsgAddVenueScope,
    };
    let allAreSettings = true;

    for (let i = 0; i < decodedMessages.messages.length; i++) {
      const message = decodedMessages.messages[i];
      console.log("message", message);
      let isSetting = false;
      Object.keys(isSettingTypeUrls).forEach((key) => {
        try {
          // try to encode the message with the key to see if it is a setting message
          const _decodedMessageTyped = isSettingTypeUrls[key].encode(message);
          lastTypeUrl = key;
          isSetting = true;
        } catch (_error) { }
      });
      if (!isSetting) {
        allAreSettings = false;
        break;
      }
    }

    return { allAreSettings, lastTypeUrl };
  }

  async getRequestSignatureTransaction(
    message: Uint8Array,
    signerAddress: string,
    R1: AffinePoint,
    networkId: Network,
    workerAddress: string,
    secondary?: SecondaryParams
  ) {
    const requestSignatureMessage = new RequestSignatureMessage({
      creator: signerAddress,
      networkId,
      transaction: message,
      r1: Buffer.from(serializeAffinePoint(R1)).toString("base64"),
      virtualScreenAddress: "",
      virtualScreenTransaction: "",
      secondary,
    });

    const signedTx = await this.signMessage(
      requestSignatureMessage,
      workerAddress
    );
    return signedTx;
  }

  async getRequestSignatureOwnedTransaction(
    message: Uint8Array,
    signerAddress: string,
    R1: AffinePoint,
    networkId: Network,
    workerAddress: string,
    venueScopeIndex: number,
  ) {
    const requestSignatureMessage = new RequestSignatureOwnedMessage({
      creator: signerAddress,
      networkId,
      tx: message,
      r1: Buffer.from(serializeAffinePoint(R1)),
      venueScopeIndex,
    });

    const signedTx = await this.signMessage(
      requestSignatureMessage,
      workerAddress
    );
    return signedTx;
  }

  async submitMPCPresignInfo(requesterAddress: string, presignInfo: any) {
    // POST to agent /submit_second_private_key
    const data = {
      requesterAddress,
      presignInfo,
    };
    const agentResponse = await fetch(
      `${this.agentEndpoint}/submit_presign_info`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return agentResponse;
  }

  async requestSignature(
    message: Buffer,
    destinationChainSigner: ChainSigner<Signer<Curve>>,
    secondary?: SecondaryParams
  ) {
    if (secondary) {
      const networkId = destinationChainSigner.getNetworkId();
      if (!isTestnet(networkId)) {
        throw new Error(
          `Secondary accounts only support testnet networks. Provided: ${networkId}`
        );
      }
    }

    let heimResponse;

    // perform pre checks; if anything fails we fall back to a simple
    // signAndSend without a granter address
    let heimData: { workerAddress: string } | undefined;
    let R1: AffinePoint | undefined = undefined;
    let k1: bigint | undefined = undefined;
    try {
      const requesterData = await this.getRequesterData(
        this.heimChainSigner.getAddress()
      );

      const heimAddress = requesterData.heimAddress;
      heimData = await this.getHeimAccountData(heimAddress);
      const { R1: r1, k1: k1Value } = destinationChainSigner.initializeSignature(message);
      R1 = r1;
      k1 = k1Value;
    } catch (err) {
      // problably institutional account
    }


    const requestSignatureMessage = new RequestSignatureMessage({
      creator: this.heimChainSigner.getAddress(),
      networkId: destinationChainSigner.getNetworkId(),
      transaction: message,
      r1: R1 ? Buffer.from(serializeAffinePoint(R1)).toString("base64") : "",
      virtualScreenAddress: "",
      virtualScreenTransaction: "",
      secondary,
    });

    if (heimData && heimData.workerAddress) {
      heimResponse = await this.signAndSend(
        requestSignatureMessage,
        heimData.workerAddress
      );
    } else {
      heimResponse = await this.signAndSend(requestSignatureMessage);
    }

    const signatureRequest = {
      transaction: message.toString("base64"),
      networkId: destinationChainSigner.getNetworkId(),
      r1: R1 ? Buffer.from(serializeAffinePoint(R1)).toString("base64") : "",
    };

    return {
      k1,
      heimResponse,
      mainMessage: requestSignatureMessage,
      signatureRequest,
    };
  }

  async finalizeTransaction(
    message: Buffer,
    responder: string,
    c3: bigint, // TODO: this can be either c3 or s
    R2: AffinePoint,
    k1: bigint,
    destinationChainSigner: ChainSigner<Signer<Curve>>
  ) {
    const data = await this.getResponderData(responder);

    if (!data) {
      throw new Error("responder not found");
    }

    const cosignerBPublickey = base64ToBytes(data.cosigner.ecdsaPublic);

    const signedTx = destinationChainSigner.finalizeTransaction(
      message,
      cosignerBPublickey,
      k1,
      R2,
      c3
    );

    return signedTx;
  }

  async finalizeMPCTransaction(
    message: Buffer,
    signature: Uint8Array,
    destinationChainSigner: ChainSigner<Signer<Curve>>
  ) {
    const signedTx = destinationChainSigner.finalizeMPCTransaction(
      message,
      signature
    );
    return signedTx;
  }

  async requestExchangeGasTokenMsg(amount: number, isGasTokenIn: boolean) {
    const data = await this.getResponderData(this.heimChainSigner.getAddress());

    if (!data) {
      throw new Error("Unable to retrieve requester data");
    }

    if (!data.heimAddress) {
      throw new Error("Account not finalized");
    }

    const message = new SimpleMessage<MsgExchangeGasToken>(
      MessageTypeUrl.ExchangeGasToken,
      MsgExchangeGasToken.fromPartial,
      {
        creator: data.heimAddress,
        amount: Long.fromNumber(amount),
        isGasTokenIn,
      },
      true
    );

    const twoPartyPublicKey = this.heimChainSigner.getTwoPartyPublicKey(
      Buffer.from(data.cosigner.ecdsaPublic, "base64")
    );

    const { signBytes } = await message.getUnsignedData(
      data.heimAddress,
      twoPartyPublicKey,
      this
    );

    return await this.requestSignature(
      Buffer.from(signBytes),
      this.heimChainSigner
    );
  }

  async requestSendTokens(
    toAddress: string,
    amount: Coin[],
    secondary?: SecondaryParams
  ) {
    const data = await this.getRequesterData(this.heimChainSigner.getAddress());

    if (!data) {
      throw new Error("Unable to retrieve requester data");
    }

    if (!data.heimAddress) {
      throw new Error("Account not finalized");
    }

    const heimAccount = await this.getHeimAccountData(data.heimAddress);

    if (!heimAccount) {
      throw new Error("Heim account not found");
    }
    const fromAddress = heimAccount.workerAddress;

    const partner = await this.getResponderData(data.responderAddress);

    let cosignerPublic = partner.cosigner.ecdsaPublic;

    if (secondary) {
      if (!heimAccount.workerVenue) {
        throw new Error("Secondary account not found");
      }
      cosignerPublic = partner.secondCosigner.ecdsaPublic;
    }

    const twoPartyPublicKey = this.heimChainSigner.getTwoPartyPublicKey(
      Buffer.from(cosignerPublic, "base64")
    );

    const message = new SimpleMessage<MsgSend>(
      "/cosmos.bank.v1beta1.MsgSend" as MessageTypeUrl,
      MsgSend.fromPartial,
      {
        fromAddress,
        toAddress,
        amount,
      },
      true
    );

    const { signBytes } = await message.getUnsignedData(
      fromAddress,
      twoPartyPublicKey,
      this
    );

    return await this.requestSignature(
      Buffer.from(signBytes),
      this.heimChainSigner,
      secondary
    );
  }

  async getAgentInfo() {
    const agentPublicKeyJson = (await fetch(
      `${this.agentEndpoint}/public_key`
    ).then((res) => res.json())) as { publicKey: string };
    const agentPublicKey = base64ToBytes(agentPublicKeyJson.publicKey);

    // we can prove proof that address from public key
    // or just calculate address from pub
    const agentAddressJson = (await fetch(
      `${this.agentEndpoint}/heim_address`
    ).then((res) => res.json())) as { address: string };
    const agentAddress = agentAddressJson.address;

    return { agentPublicKey, agentAddress };
  }

  async createResponder({
    heimAddress,
    agentAddress,
    cosignerBData,
    secondaryAddress,
    heimName,
  }: CreateResponderData) {
    // check if heimName already exists
    const doesHeimNameExist = await this.heimQuery.checkHeimNameExist(heimName);
    if (doesHeimNameExist) {
      throw new Error("Heim name already exists");
    }

    // get secondCosignerBData from agent 's /get_cosigner_b_public_key
    const responderAddress = this.heimChainSigner.getAddress();
    const responderData = await this.getResponderData(responderAddress);
    if (!responderData) {
      throw new Error("Responder data not found");
    }
    const requesterAddress = responderData.requesterAddress;

    const secondCosignerBDataRaw = (await fetch(
      `${this.agentEndpoint
      }/decentralized_party_dkg_output?requester_address=${requesterAddress}`
    ).then((res) => res.json())) as {
      decentralized_party_dkg_output: {
        UniversalPublicDKGOutput: {
          output: {
            public_key_share: string;
          }
        }
      },
      decentralized_party_dkg_output_ed25519: {
        UniversalPublicDKGOutput: {
          output: {
            public_key_share: number[]
          }
        }
      }
    };

    const ecdsaPublicKey = secondCosignerBDataRaw.decentralized_party_dkg_output.UniversalPublicDKGOutput.output.public_key_share;
    const ed25519PublicKey = secondCosignerBDataRaw.decentralized_party_dkg_output_ed25519.UniversalPublicDKGOutput.output.public_key_share;
    const secondCosignerBData: CosignerBData = {
      ecdsaPublicKey: ecdsaPublicKey ? hexToBytes(ecdsaPublicKey) : new Uint8Array(),
      ed25519PublicKey: ed25519PublicKey ? new Uint8Array(ed25519PublicKey) : new Uint8Array(),
    };

    const message = new CreateResponderMessage({
      responderAddress,
      agentAddress,
      heimAddress,
      ecdsaPublicKey: cosignerBData.ecdsaPublicKey,
      ed25519PublicKey: cosignerBData.ed25519PublicKey,
      secondEcdsaPublicKey: secondCosignerBData.ecdsaPublicKey,
      secondEd25519PublicKey: secondCosignerBData.ed25519PublicKey,
      secondaryAddress: secondaryAddress,
      heimName,
    });
    const response = await this.signAndSend(message);
    return { response };
  }

  async respondToSignatureRequest(
    signatureResponseInput: SignatureResponseInput
  ) {

    let heimResponse;

    // perform pre checks; if anything fails we fall back to a simple
    // signAndSend without a granter address
    let workerAddress: string | undefined = undefined;
    let requestIndex: Long | undefined = undefined;

    try {
      const responderAddress =
        signatureResponseInput.responderAddress ||
        this.heimChainSigner.getAddress();
      const responderData = await this.getResponderData(responderAddress);

      const { requestIndex: requestIndexValue, workerAddress: workerAddressValue } = await this.getHeimAccountData(
        responderData.heimAddress
      );

      workerAddress = workerAddressValue;
      requestIndex = requestIndexValue;
    } catch (err) {
      // problably institutional account
      const institutionalAccountData = await this.getHeimInstitutionalAccountData(
        signatureResponseInput.requesterAddress
      )
      requestIndex = institutionalAccountData?.requestIndex;
    }

    const message = new SignatureResponseMessage({
      requestIndex,
      responderAddress: this.heimChainSigner.getAddress(),
      r2: signatureResponseInput.r2,
      c3: signatureResponseInput.c3,
    });

    if (workerAddress) {
      heimResponse = await this.signAndSend(
        message,
        workerAddress
      );
    } else {
      heimResponse = await this.signAndSend(message);
    }

    return heimResponse;
  }


  async cancelSignatureRequest() {
    const responderData = await this.getResponderData(
      this.heimChainSigner.getAddress()
    );

    const { workerAddress } = await this.getHeimAccountData(
      responderData.heimAddress
    );

    const message = new CancelSignatureMessage({
      creator: this.heimChainSigner.getAddress(),
    });

    const response = await this.signAndSend(message, workerAddress);
    return response;
  }

  async buyTicket(amount: Long, ticketLeaf: string) {

    const message = new SimpleMessage<MsgBuyTicket>(
      MessageTypeUrl.BuyTicket,
      MsgBuyTicket.fromPartial,
      {
        creator: this.heimChainSigner.getAddress(),
        amount: amount,
        ticketLeaf,
      },
      true
    );


    const response = await this.signAndSend(message);
    return response;
  }

  async resolveAdminRequest(confirm: boolean) {
    const creator = this.heimChainSigner.getAddress();
    const message = new ResolveAdminRequestMessage({
      creator,
      confirm,
    });

    const response = await this.signAndSend(message);

    return response;
  }

  async addVenueScope(message: Omit<MsgAddVenueScope, "creator">) {
    const creator = this.heimChainSigner.getAddress();
    const addVenueScopeMessage = new AddVenueScopeMessage({
      creator,
      ...message,
    });

    const response = await this.signAndSend(addVenueScopeMessage);

    return response;
  }

  async updateVenueScope(message: Omit<MsgUpdateVenueScope, "creator">) {
    const creator = this.heimChainSigner.getAddress();
    const updateVenueScopeMessage = new UpdateVenueScopeMessage({
      creator,
      ...message,
    });

    const response = await this.signAndSend(updateVenueScopeMessage);
    return response;
  }

  async updateFreebie(ownedAddress: string, active: boolean, amountLimit: bigint, dayLength: number) {
    const message = new UpdateFreebieMessage({
      creator: this.heimChainSigner.getAddress(),
      ownedAddress,
      active,
      amountLimit: Long.fromNumber(Number(amountLimit)),
      dayLength,
    });

    await this.signAndSend(message);
  }

  async terminateVenueScope(ownedAddress: string, venueScopeIndex: number) {
    const message = new TerminateVenueScopeMessage({
      creator: this.heimChainSigner.getAddress(),
      ownedAddress,
      venueScopeIndex,
    });

    const response = await this.signAndSend(message);
    return response;
  }

  async getPendingAction(heimAddress: string) {
    const queryResult = await this.heimQuery.getPendingAction(heimAddress);

    return queryResult;
  }

  async getSignatureRequest(requestIndex: Long) {
    const queryResult = await this.heimQuery.getSignatureRequest(requestIndex);

    return queryResult;
  }

  async requestCreateOwnedAccount(
    ecdsaPublicKey: Uint8Array,
    eddsaPublicKey: Uint8Array,
    ownedAccountRequester: string
  ) {
    const message = new RequestCreateOwnedAccountMessage({
      creator: this.heimChainSigner.getAddress(),
      ecdsaPublicKey: Buffer.from(ecdsaPublicKey).toString("base64"),
      eddsaPublicKey: Buffer.from(eddsaPublicKey).toString("base64"),
      ownedAccountRequester,
    });

    const response = await this.signAndSend(message);
    return response;
  }

  async respondCreateOwnedAccount() {
    const message = new RespondCreateOwnedAccountMessage({
      creator: this.heimChainSigner.getAddress(),
    });

    const response = await this.signAndSend(message);
    return response;
  }

  async requestSignatureOwned(
    r1: Uint8Array,
    tx: Uint8Array,
    networkId: Network,
    venueScopeIndex: number,
    granter: string,
  ) {
    const message = new RequestSignatureOwnedMessage({
      creator: this.heimChainSigner.getAddress(),
      r1,
      tx,
      networkId,
      venueScopeIndex,
    });

    const response = await this.signAndSend(message, granter);
    return response;
  }

  async respondSignatureOwned(
    workerAddress: string,
    requestId: string,
    r2: Uint8Array,
    c3: Uint8Array
  ) {
    const message = new RespondSignatureOwnedMessage({
      creator: this.heimChainSigner.getAddress(),
      requestId,
      r2,
      c3,
    });

    const response = await this.signAndSend(message, workerAddress);
    return response;
  }

  async getAccountAllBalances(address: string) {
    const balances = await this.stargateClient.getAllBalances(address);
    return balances;
  }

  async getSignatureRequestOwned(requestId: string) {
    const queryResult = await this.heimQuery.getSignatureRequestOwned(requestId);
    return queryResult;
  }

  async getSignatureResponseOwned(requestId: string) {
    const queryResult = await this.heimQuery.getSignatureResponseOwned(requestId);
    return queryResult;
  }

  async requestTradeIntention(message: Omit<MsgCreateTradeIntentionRequests, "creator">) {
    const creator = this.heimChainSigner.getAddress();
    const parsedMessage = new CreateTradeIntentionMessage({
      creator,
      ...message,
    });
    const requesterData = await this.getRequesterData(
      creator
    );
    const { workerAddress } = await this.getHeimAccountData(
      requesterData.heimAddress
    );

    const response = await this.signAndSend(parsedMessage, workerAddress);
    return response;
  }

  async respondTradeIntention(message: Omit<MsgCreateTradeIntentionResponses, "creator">) {
    const creator = this.heimChainSigner.getAddress();
    const parsedMessage = new RespondTradeIntentionMessage({
      creator,
      ...message,
    });
    const responderData = await this.getResponderData(
      creator
    );
    const { workerAddress } = await this.getHeimAccountData(
      responderData.heimAddress
    );
    const response = await this.signAndSend(parsedMessage, workerAddress);
    return response;
  }

  async brokerMatchTradeIntentions(message: Omit<MsgBrokerMatchIntentions, "creator">) {
    const creator = this.heimChainSigner.getAddress();
    const parsedMessage = new CreateBrokerMatchIntentionsMessage({
      creator,
      ...message,
    });
    const response = await this.signAndSend(parsedMessage);
    return response;
  }
  async finalizeTradeIntentions(message: Omit<MsgFinalizeTradeIntentions, "creator">) {
    const creator = this.heimChainSigner.getAddress();
    const parsedMessage = new CreateFinalizeTradeIntentionsMessage({
      creator,
      ...message,
    });
    const response = await this.signAndSend(parsedMessage);
    return response;
  }

  async getMerkleLeafAll() {
    const data = await this.heimQuery.getMerkleLeafAll();
    return data;
  }

  async getMerkleLeaf(id: Long | number) {
    const data = await this.heimQuery.getMerkleLeaf(id);
    return data;
  }

  async isSpentNullifier(nullifier: string) {
    const data = await this.heimQuery.isSpentNullifier(nullifier);
    return data;
  }
}
