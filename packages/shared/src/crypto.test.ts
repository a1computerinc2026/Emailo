import { describe, it, expect, beforeAll } from "vitest";
import {
  encrypt,
  decrypt,
  decryptOrNull,
  hashApiKey,
  generateApiKey,
} from "./crypto";

describe("crypto", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      "0000000000000000000000000000000000000000000000000000000000000000";
  });

  it("round-trips encryption", () => {
    const secret = "sk-super-secret-api-key";
    const enc = encrypt(secret);
    expect(enc).not.toBe(secret);
    expect(decrypt(enc)).toBe(secret);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("decryptOrNull returns null for empty", () => {
    expect(decryptOrNull(null)).toBeNull();
    expect(decryptOrNull(undefined)).toBeNull();
    expect(decryptOrNull("")).toBeNull();
  });

  it("hashes API keys deterministically", () => {
    const a = hashApiKey("key123");
    const b = hashApiKey("key123");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).not.toBe(hashApiKey("key456"));
  });

  it("generates prefixed API keys", () => {
    const { plaintext, prefix } = generateApiKey();
    expect(plaintext.startsWith("eo_")).toBe(true);
    expect(prefix).toBe("eo_" + plaintext.slice(3, 11).slice(0, 8));
    expect(prefix).toBe(plaintext.slice(0, 11));
  });

  it("rejects tampered ciphertext", () => {
    const enc = encrypt("secret");
    expect(() => decrypt(enc + "ff")).toThrow();
  });
});