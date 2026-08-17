import axios, { AxiosInstance } from "axios";
import { sha256 } from "js-sha256";
import { secp256k1 } from "@noble/curves/secp256k1";
import { toBase64 } from "@cosmjs/encoding";

type SideChannelResponse = {
  result: string;
  chainResponse?: {
    check_tx: object;
    deliver_tx: object;
    hash: string;
    height: number;
  };
};

export class SideChannelApi {
  private apiClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async signatureRequest(
    message: { networkId: string; r1: string; tx: string },
    twoPartyAddressHeim: string,
    privateKey: Uint8Array,
  ) {
    const signatureRequestFullHashed = sha256(
      Buffer.from(JSON.stringify(message)),
    );

    const sigReqFullSigObj = secp256k1.sign(
      signatureRequestFullHashed,
      privateKey,
    );

    const signatureRequestFullSigned = `0x${sigReqFullSigObj.toCompactHex()}${sigReqFullSigObj.recovery
      .toString(16)
      .padStart(2, "0")}`;

    const signatureRequestFullSignature = toBase64(
      Buffer.from(signatureRequestFullSigned.slice(2), "hex"),
    );

    const sideMessage = {
      heimAddress: twoPartyAddressHeim,
      signatureRequestFull: message,
      signatureRequestFullSignature,
      chainTxBytes: "",
    };

    try {
      const response = await this.apiClient.post(
        "/side_signature_request",
        sideMessage,
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data.result as SideChannelResponse;
    } catch (error) {
      console.error("Error sending signature request to side channel:", error);
      throw new Error("Unable to send signature request to side channel");
    }
  }

  async signatureResponse(message: object) {
    try {
      const response = await this.apiClient.post(
        "side_signature_respond",
        message,
      );

      console.log(response.data);

      return response.data.result as SideChannelResponse;
    } catch (error) {
      console.error("Error sending signature response to side channel:", error);
      throw new Error("Unable to send signature response to side channel");
    }
  }
}
