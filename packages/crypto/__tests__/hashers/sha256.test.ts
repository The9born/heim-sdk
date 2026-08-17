import { sha256Hasher } from "../../src/hashers/sha256";

describe("sha256Hasher", () => {
  it("should hash a message correctly", () => {
    const message = Buffer.from("hello world");
    const expectedHash =
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

    const hash = sha256Hasher.hash(message);

    expect(hash.toString("hex")).toBe(expectedHash);
  });

  it("should hash an empty message", () => {
    const message = Buffer.from("");
    const expectedHash =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    const hash = sha256Hasher.hash(message);

    expect(hash.toString("hex")).toBe(expectedHash);
  });
});
