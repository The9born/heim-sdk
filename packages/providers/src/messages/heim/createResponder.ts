import { bytesToHex, hexStringToBase64 } from "@the9born/utils";
import { Message } from "./message";
import { StdFee } from "@cosmjs/launchpad";
import { MsgCreateResponderAccount } from "../../ts-proto/heim/heim/tx";
import { GasDenom, MessageTypeUrl } from "../typeUrl";

export type CreateResponderMessageParams = {
  responderAddress: string;
  heimAddress: string;
  ecdsaPublicKey: Uint8Array;
  ed25519PublicKey: Uint8Array;
  secondEcdsaPublicKey: Uint8Array;
  secondEd25519PublicKey: Uint8Array;
  secondaryAddress: string;
  agentAddress: string;
  heimName: string;
};

export type CreateResponderMessageFromSeedParams = Omit<
  Omit<
    Omit<CreateResponderMessageParams, "ecdsaPrivateKey">,
    "ed25519PrivateKey"
  >,
  "responderAddress"
> & { seed: string | Uint8Array };

export class CreateResponderMessage extends Message {
  private responderAddress: string;
  private heimAddress: string;
  private ecdsaPubKey: string;
  private ed25519PubPoint: string;
  private secondEcdsaPubKey: string;
  private secondEd25519PubPoint: string;
  private secondaryAddress: string;
  private agentAddress: string;
  private heimName: string;

  constructor({
    responderAddress,
    heimAddress,
    ecdsaPublicKey,
    ed25519PublicKey,
    secondEcdsaPublicKey,
    secondEd25519PublicKey,
    secondaryAddress,
    agentAddress,
    heimName,
  }: CreateResponderMessageParams) {
    super(MessageTypeUrl.CreateResponderAccount, GasDenom.WelcomeToken);

    this.heimAddress = heimAddress;
    this.ed25519PubPoint = bytesToHex(ed25519PublicKey);
    this.responderAddress = responderAddress;
    this.ecdsaPubKey = bytesToHex(ecdsaPublicKey);

    this.agentAddress = agentAddress;
    this.secondEcdsaPubKey = bytesToHex(secondEcdsaPublicKey);
    this.secondEd25519PubPoint = bytesToHex(secondEd25519PublicKey);
    this.secondaryAddress = secondaryAddress;
    this.heimName = heimName;
  }

  serialize() {
    const message = {
      creator: this.responderAddress,
      heimAddress: this.heimAddress,
      agentAddress: this.agentAddress,
      cosigner: {
        ecdsaPublic: hexStringToBase64(this.ecdsaPubKey),
        ed25519Public: hexStringToBase64(this.ed25519PubPoint),
      },
      secondCosigner: {
        ecdsaPublic: hexStringToBase64(this.secondEcdsaPubKey),
        ed25519Public: hexStringToBase64(this.secondEd25519PubPoint),
      },
      secondaryAddress: this.secondaryAddress,
      heimName: this.heimName,
    };

    const serializedMessage = {
      typeUrl: this.typeUrl,
      value: MsgCreateResponderAccount.fromPartial(message),
    };

    return serializedMessage;
  }

  formatFee(estimatedGas: string | number): StdFee {
    const feeAmount = [
      {
        denom: this.gasDenom,
        amount: "1",
      },
    ];

    return {
      amount: feeAmount,
      gas: estimatedGas.toString(),
    };
  }
}
