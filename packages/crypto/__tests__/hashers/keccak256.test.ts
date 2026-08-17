import { keccak256Hasher } from "../../src/hashers/keccak256";

describe("keccak256Hasher", () => {
  it("should hash a message correctly", () => {
    const message = Buffer.from("hello world");
    const expectedHash =
      "47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";

    const hash = keccak256Hasher.hash(message);

    expect(hash.toString("hex")).toBe(expectedHash);
  });

  it("should hash an empty message", () => {
    const message = Buffer.from("");
    const expectedHash =
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";

    const hash = keccak256Hasher.hash(message);

    expect(hash.toString("hex")).toBe(expectedHash);
  });
});
