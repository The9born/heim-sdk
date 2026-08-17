import { Network } from "./config";

export const chainIdToPrefix = {
  "btc-mainnet": "bc",
  "btc-signet": "tb",
  "osmosis-1": "osmo",
  "osmo-test-5": "osmo",
  "cosmoshub-4": "cosmos",
  "agoric-3": "agoric",
  "heim": "heim",
};

export const getPrefixFromNetworkId = (networkId: Network) => {
  const chainId = networkId.split("--")[1];
  if (!chainId) {
    throw new Error(`Invalid chain id for network: ${networkId}`);
  }

  const prefix = chainIdToPrefix[chainId];
  if (!prefix) {
    throw new Error(`Invalid prefix for network: ${networkId}`);
  }

  return prefix;
};

export const testnetNetworks: Network[] = [
  Network.BitcoinSignet,
  Network.Sepolia,
  Network.OsmosisTestnet,
  Network.LightningSignet,
  Network.TSolana,
  Network.Heim,
];

export const isTestnet = (networkId: Network | string): boolean => {
  return testnetNetworks.includes(networkId as Network);
};
