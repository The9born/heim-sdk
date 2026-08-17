import { bigIntToHex, bytesToHex, hexStringToBase64 } from "@the9born/utils";

import { MsgCreateRequesterAccount } from "../../ts-proto/heim/heim/tx";
import { Message } from "./message";
import { GasDenom, MessageTypeUrl } from "../typeUrl";

export type CreateRequesterMessageParams = {
  encryptedEcdsaPrivateKey: bigint;
  paillierPublicKeyN: bigint;
  responderAddress: string;
  requesterAddress: string;
  ed25519PublicKey: Uint8Array;
  ecdsaPublicKey: Uint8Array;
};

export type CreateRequesterFromSeedParams = Omit<
  Omit<
    Omit<CreateRequesterMessageParams, "ecdsaPrivateKey">,
    "ed25519PrivateKey"
  >,
  "requesterAddress"
> & { seed: string };

export class CreateRequesterMessage extends Message {
  private requesterAddress: string;
  private responderAddress: string;
  private ecdsaPubKeyM: string;
  private ecdsaDE: string;
  private ed25519PubPoint: string;
  private paillierPubNString: string;

  constructor({
    requesterAddress,
    responderAddress,
    paillierPublicKeyN,
    encryptedEcdsaPrivateKey,
    ed25519PublicKey,
    ecdsaPublicKey,
  }: CreateRequesterMessageParams) {
    super(MessageTypeUrl.CreateRequesterAccount, GasDenom.WelcomeToken);

    this.requesterAddress = requesterAddress;
    this.responderAddress = responderAddress;
    this.paillierPubNString = bigIntToHex(paillierPublicKeyN);
    this.ecdsaDE = bigIntToHex(encryptedEcdsaPrivateKey);
    this.ecdsaPubKeyM = bytesToHex(ecdsaPublicKey);
    this.ed25519PubPoint = bytesToHex(ed25519PublicKey);
  }

  serialize() {
    const message = {
      creator: this.requesterAddress,
      responderAddress: this.responderAddress,
      cosigner: {
        ecdsaPrivateEncrypted: hexStringToBase64(this.ecdsaDE),
        ecdsaPublic: hexStringToBase64(this.ecdsaPubKeyM),
        ed25519Public: hexStringToBase64(this.ed25519PubPoint),
        paillierPublic: hexStringToBase64(this.paillierPubNString),
      },
    };

    const serializedMessage = {
      typeUrl: this.typeUrl,
      value: MsgCreateRequesterAccount.fromPartial(message),
    };

    return serializedMessage;
  }

  formatFee(estimatedGas: string | number) {
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
