import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { QueryClientImpl } from "../ts-proto/heim/heim/query";
import { QueryClientImpl as OracleQueryClientImpl } from "../ts-proto/oracle/query";
import { StargateClient } from "@cosmjs/stargate";
import Long from "long";
import { PageRequest } from "../ts-proto/cosmos/base/query/v1beta1/pagination";

export class HeimQuery {
  private queryService: QueryClientImpl;
  private oracleQueryService: OracleQueryClientImpl;
  private tendermintClient: Tendermint34Client;
  private stargateClient: StargateClient;

  constructor(tendermintClient: Tendermint34Client, stargateClient: StargateClient) {
    const queryClient = new QueryClient(tendermintClient);
    const rpcClient = createProtobufRpcClient(queryClient);

    this.tendermintClient = tendermintClient;
    this.queryService = new QueryClientImpl(rpcClient);
    this.oracleQueryService = new OracleQueryClientImpl(rpcClient);
    this.stargateClient = stargateClient;

  }

  static async connect(url: string) {
    const tendermintClient = await Tendermint34Client.connect(url);
    const stargateClient = await StargateClient.connect(url);
    return new HeimQuery(tendermintClient, stargateClient);
  }

  async requesterData(address: string) {
    const queryResult = await this.queryService.RequesterAccount({
      index: address,
    });

    return queryResult.requesterAccount;
  }

  public async responderData(address: string) {
    const queryResult = await this.queryService.ResponderAccount({
      index: address,
    });

    return queryResult.responderAccount;
  }

  public async heimAccount(address: string) {
    const queryResult = await this.queryService.HeimAccount({
      index: address,
    });

    return queryResult.heimAccount;
  }
  public async heimInstitutionalAccount(address: string) {
    const queryResult = await this.queryService.HeimInstitutionalAccount({
      index: address,
    });

    return queryResult.heimInstitutionalAccount;
  }

  public async heimInstitutionalProof(proofIndex: Long) {
    const queryResult = await this.queryService.InstitutionalProof({
      id: proofIndex,
    });

    return queryResult.InstitutionalProof;
  }

  public async getSignatureRequest(requestIndex: Long) {
    const queryResult = await this.queryService.SignatureRequests({
      id: requestIndex,
    });

    return queryResult.SignatureRequests;
  }

  public async getSignatureResponse(requestIndex: Long) {
    const queryResult = await this.queryService.SignatureResponses({
      id: requestIndex,
    });

    return queryResult.SignatureResponses;
  }

  public async getBlockHash(height?: number) {
    const block = await this.tendermintClient.block(height);

    return block.blockId.hash;
  }

  public async checkHeimNameExist(heimName: string) {
    try {
      const queryResult = await this.queryService.HeimName({
        index: heimName,
      });
      if (queryResult.heimName) {
        return true;
      }
    } catch (e) { }
    return false;
  }

  public async getAddressByHeimName(heimName: string) {
    const queryResult = await this.queryService.HeimName({
      index: heimName,
    });

    if (!queryResult.heimName) {
      return null;
    }

    return queryResult.heimName.creator;
  }

  public async getExchangeRates() {
    const pageRequest = PageRequest.fromPartial({
      key: new Uint8Array(),
      countTotal: false,
    });

    const queryResult = await this.oracleQueryService.ExchangeRates({
      pagination: pageRequest,
    });

    const pairs = queryResult.denomOracleExchangeRatePairs as any;
    if (pairs) {
      pairs.unifiedRoot = queryResult.unifiedRoot;
    }
    return pairs;
  }

  public async getPendingAction(heimAddress: string) {
    const queryResult = await this.queryService.GetPendingAction({
      address: heimAddress,
    });

    return queryResult;
  }

  public async getSignatureRequestOwned(id: string) {
    const queryResult = await this.queryService.GetSignatureRequestOwned({
      id: id,
    });

    return queryResult;
  }

  public async getSignatureResponseOwned(id: string) {
    const queryResult = await this.queryService.GetSignatureResponseOwned({
      id: id,
    });

    return queryResult;
  }

  public async getAccountAllBalances(address: string) {
    const balances = await this.stargateClient.getAllBalances(address);

    return balances;
  }

  public async getTradeIntentionRequest(requestIndex: Long) {
    const queryResult = await this.queryService.TradeIntentionRequests({
      id: requestIndex,
    });

    return queryResult.TradeIntentionRequests;
  }

  public async getTradeIntentionResponse(requestIndex: Long) {
    const queryResult = await this.queryService.TradeIntentionResponses({
      id: requestIndex,
    });

    return queryResult.TradeIntentionResponses;
  }

  public async getMerkleLeafAll() {
    const pageRequest = PageRequest.fromPartial({
      key: new Uint8Array(),
      countTotal: false,
    });
    const queryResult = await this.queryService.MerkleLeafAll({
      pagination: pageRequest,
    });

    return queryResult.MerkleLeaf;
  }

  public async getMerkleLeaf(id: Long | number) {
    const idVal = typeof id === "number" ? Long.fromNumber(id) : id;
    const queryResult = await this.queryService.MerkleLeaf({
      id: idVal,
    });

    return queryResult.MerkleLeaf;
  }

  public async isSpentNullifier(nullifier: string) {
    const queryResult = await this.queryService.IsSpentNullifier({
      nullifier,
    });
    return queryResult.isSpent;
  }
}
