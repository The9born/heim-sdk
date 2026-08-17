import {
  hexToBigInt,
  bigIntToBytes,
  bytesToHex,
  bytesToBigInt,
  hexToBytes,
  hexStringToBase64,
  numberToBytes,
  bigIntToHex,
  base64ToBytes,
  bytesToString,
  bigintFromByteArray,
  zeros,
  setLength,
  setupMessage,
  validateHeimAddress,
  validateNetworkId,
  validateEvmAddress,
  validateSolanaAddress,
  validateAddressByNetworkId,
  validateAlias,
} from "../src";

describe("Conversion utilities", () => {
  it("should convert hex to bigint and vice versa", () => {
    const hex = "0x1234abcd";
    const bi = hexToBigInt(hex);
    expect(bi).toBe(BigInt("0x1234abcd"));
    expect(bigIntToHex(bi)).toBe(hex);

    // without 0x prefix
    const biNoPrefix = hexToBigInt("1234abcd");
    expect(biNoPrefix).toBe(BigInt("0x1234abcd"));
  });

  it("should convert bigint to bytes and bytes to bigint", () => {
    const bi = BigInt(123456789);
    const bytes = bigIntToBytes(bi);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const roundtripBi = bytesToBigInt(bytes);
    expect(roundtripBi).toBe(bi);
  });

  it("should convert bytes to hex and hex to bytes", () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = bytesToHex(bytes);
    expect(hex.toLowerCase()).toBe("0xdeadbeef");
    const roundtripBytes = hexToBytes(hex);
    expect(Array.from(roundtripBytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);

    // hex without prefix
    const bytesNoPrefix = hexToBytes("deadbeef");
    expect(Array.from(bytesNoPrefix)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("should convert hex string to base64 and base64 to bytes", () => {
    const hex = "0xdeadbeef";
    const b64 = hexStringToBase64(hex);
    const bytes = base64ToBytes(b64);
    expect(bytesToHex(bytes).toLowerCase()).toBe("0xdeadbeef");
  });

  it("should convert number to bytes", () => {
    const bytes = numberToBytes(255);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytesToHex(bytes).toLowerCase()).toBe("0xff");
  });

  it("should convert bytes to string", () => {
    const text = "Hello Heim SDK";
    const bytes = new TextEncoder().encode(text);
    expect(bytesToString(bytes)).toBe(text);
  });

  it("should convert byte array to bigint using bigintFromByteArray", () => {
    const bytes = new Uint8Array([0x01, 0x00]);
    expect(bigintFromByteArray(bytes)).toBe(BigInt(256));
  });

  it("should create zeros buffer", () => {
    const z = zeros(16);
    expect(z.length).toBe(16);
    expect(Array.from(z).every((b) => b === 0)).toBe(true);
  });

  it("should pad or slice buffer with setLength", () => {
    const data = new Uint8Array([1, 2, 3, 4]);

    // Pad right
    const paddedRight = setLength(data, 6, true);
    expect(paddedRight.length).toBe(6);
    expect(Array.from(paddedRight)).toEqual([1, 2, 3, 4, 0, 0]);

    // Pad left
    const paddedLeft = setLength(data, 6, false);
    expect(paddedLeft.length).toBe(6);
    expect(Array.from(paddedLeft)).toEqual([0, 0, 1, 2, 3, 4]);

    // Truncate right
    const slicedRight = setLength(data, 2, true);
    expect(Array.from(slicedRight)).toEqual([1, 2]);

    // Truncate left
    const slicedLeft = setLength(data, 2, false);
    expect(Array.from(slicedLeft)).toEqual([3, 4]);
  });

  it("should format setupMessage", () => {
    const msg = setupMessage({
      requesterAddress: "heim1req",
      responderAddress: "heim1res",
    });
    expect(msg.toString()).toBe("heim1reqheim1res");
  });
});

describe("Address validation", () => {
  it("should return true if evm address is valid", () => {
    expect(validateEvmAddress("0x1234567890123456789012345678901234567890")).toBe(true);
  });

  it("should return true if heim address is valid", () => {
    expect(validateHeimAddress("heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj")).toBe(true);
  });

  it("should return false if heim address is invalid", () => {
    expect(validateHeimAddress("heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsn")).toBe(false);
    expect(validateHeimAddress("cosmos1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsn")).toBe(false);
    expect(validateHeimAddress("heim1234")).toBe(false);
    expect(validateHeimAddress("invalid")).toBe(false);
  });

  it("should return false if evm address is invalid", () => {
    expect(validateEvmAddress("0x123456789012345678901234567890123456789")).toBe(false);
    expect(validateEvmAddress("0x12345")).toBe(false);
    expect(validateEvmAddress("not-an-address")).toBe(false);
  });

  it("should validate solana address", () => {
    expect(validateSolanaAddress("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")).toBe(true);
    expect(validateSolanaAddress("invalid_solana_address!")).toBe(false);
  });
});

describe("Network ID validation", () => {
  it("should return true if networkId is valid", () => {
    expect(validateNetworkId("cosmos--heim")).toBe(true);
    expect(validateNetworkId("evm--sepolia")).toBe(true);
    expect(validateNetworkId("sol--101")).toBe(true);
  });

  it("should return false if networkId is invalid", () => {
    expect(validateNetworkId("cosmos")).toBe(false);
    expect(validateNetworkId("cosmos-heim")).toBe(false);
    expect(validateNetworkId("a--b--c")).toBe(false);
  });
});

describe("Address validation by networkId", () => {
  it("should validate addresses according to network prefix", () => {
    expect(
      validateAddressByNetworkId(
        "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj",
        "cosmos--heim"
      )
    ).toBe(true);
    expect(
      validateAddressByNetworkId(
        "0x1234567890123456789012345678901234567890",
        "evm--1"
      )
    ).toBe(true);
    expect(
      validateAddressByNetworkId(
        "0xinvalid",
        "evm--1"
      )
    ).toBe(false);
    expect(
      validateAddressByNetworkId(
        "invalidheim",
        "cosmos--heim"
      )
    ).toBe(false);
    expect(
      validateAddressByNetworkId(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "sol--101"
      )
    ).toBe(true);
  });
});

describe("Alias validation", () => {
  it("should validate alias string correctly", () => {
    expect(validateAlias("my_wallet 01")).toBe(true);
    expect(validateAlias("validAlias")).toBe(true);
    expect(validateAlias("")).toBe(false);
    expect(validateAlias("a".repeat(21))).toBe(false);
    expect(validateAlias("invalid@alias!")).toBe(false);
  });
});
