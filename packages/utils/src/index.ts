import { ethers, BigNumber } from "ethers";
import { arrayify, hexlify } from "ethers/lib/utils";
import { fromBech32 } from "@cosmjs/encoding";

export const hexToBigInt = (hex: string | bigint): bigint => {
  if (typeof hex === "string" && !hex.startsWith("0x")) {
    hex = `0x${hex}`;
  }
  return BigNumber.from(hex).toBigInt();
};

export const bigIntToBytes = (bigInt: bigint): Uint8Array => {
  return arrayify(BigNumber.from(bigInt));
};

export const bytesToHex = (bytes: Uint8Array | string): string => {
  return hexlify(bytes, { allowMissingPrefix: true });
};

export const bytesToBigInt = (bytes: Uint8Array | bigint): bigint => {
  return BigNumber.from(bytes).toBigInt();
};

export const hexToBytes = (hex: string | Uint8Array): Uint8Array => {
  if (typeof hex === "string" && !hex.startsWith("0x")) {
    hex = `0x${hex}`;
  }

  return arrayify(hex);
};

export const hexStringToBase64 = (hexString: string) => {
  if (hexString.startsWith("0x")) {
    hexString = hexString.substring(2);
  }

  return Buffer.from(hexString, "hex").toString("base64");
};

export const numberToBytes = (num: number): Uint8Array => {
  return arrayify(hexlify(num));
};

export const bigIntToHex = (bigInt: bigint): string => {
  return BigNumber.from(bigInt).toHexString();
};

export const base64ToBytes = (base64: string): Buffer => {
  return Buffer.from(base64, "base64");
};

export const bytesToString = (bytes: Uint8Array): string => {
  return new TextDecoder().decode(bytes);
};

export const bigintFromByteArray = (array: Uint8Array) => {
  return BigInt(`0x${Buffer.from(array).toString("hex")}`);
};

export const zeros = (bytes: number) => {
  return Buffer.allocUnsafe(bytes).fill(0);
};

export const setLength = (
  msgArray: Uint8Array,
  length: number,
  right: boolean
) => {
  const msg = Buffer.from(msgArray);
  const buf = zeros(length);
  if (right) {
    if (msg.length < length) {
      msg.copy(buf);
      return buf;
    }
    return msg.slice(0, length);
  } else {
    if (msg.length < length) {
      msg.copy(buf, length - msg.length);
      return buf;
    }
    return msg.slice(-length);
  }
};

export const setupMessage = ({
  requesterAddress,
  responderAddress,
}: {
  requesterAddress: string;
  responderAddress: string;
}) => {
  const message = `${requesterAddress}${responderAddress}`;

  return Buffer.from(message);
};

export const validateHeimAddress = (address: string) => {
  try {
    const decoded = fromBech32(address);
    if (decoded.prefix !== "heim") {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

export const validateNetworkId = (networkId: string) => {
  const chainPrefixSuffix = networkId.split("--");
  return chainPrefixSuffix.length === 2;
}

export const validateEvmAddress = (address: string) => {
  return ethers.utils.isAddress(address);
}

export const validateSolanaAddress = (address: string) => {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}


export const validateAddressByNetworkId = (address: string, networkId: string) => {
  let isAddressValid = true;
  const chainPrefix = networkId.split("--")[0];
  const chainSuffix = networkId.split("--")[1];
  if (chainPrefix === "evm") {
    if (!validateEvmAddress(address)) {
      isAddressValid = false;
    }
  } else if (chainPrefix === "cosmos" && chainSuffix === "heim") {
    if (!validateHeimAddress(address)) {
      isAddressValid = false;
    }
  } else if (chainPrefix === "sol") {
    if (!validateSolanaAddress(address)) {
      isAddressValid = false;
    }
  }
  return isAddressValid;
}

export const validateAlias = (alias: string) => {
  // english letters, numbers, underscore and space
  const regex = /^[a-zA-Z0-9_ ]+$/;
  if (!regex.test(alias)) {
    return false;
  }
  // check length
  if (alias.length < 1 || alias.length > 20) {
    return false;
  }
  return true;
}