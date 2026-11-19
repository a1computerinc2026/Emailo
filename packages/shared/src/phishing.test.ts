import { describe, it, expect } from "vitest";
import { detectPhishing, parseAuthResults } from "./phishing";

describe("detectPhishing", () => {
  it("flags raw IP URLs", () => {
    const r = detectPhishing("click http://192.168.1.1/login", [
      { href: "http://192.168.1.1/login" },
    ]);
    expect(r.score).toBeGreaterThanOrEqual(25);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("flags brand impersonation on non-matching domains", () => {
    const r = detectPhishing("verify your account", [
      { href: "https://paypal-secure.tk/login" },
    ]);
    expect(r.score).toBeGreaterThan(0);
  });

  it("does not flag legit brand domains", () => {
    const r = detectPhishing("hello", [
      { href: "https://www.paypal.com/home" },
    ]);
    expect(r.score).toBe(0);
  });

  it("flags display/href mismatch", () => {
    const r = detectPhishing("see paypal.com", [
      { href: "https://evil.tk/x", displayText: "paypal.com" },
    ]);
    expect(r.score).toBeGreaterThan(0);
  });

  it("flags credential-in-URL", () => {
    const r = detectPhishing("x", [{ href: "https://user:pass@evil.com" }]);
    expect(r.score).toBeGreaterThanOrEqual(20);
  });

  it("caps score at 100", () => {
    const links = Array.from({ length: 10 }, () => ({ href: "http://192.168.1.1" }));
    const r = detectPhishing("urgent verify", links);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("parseAuthResults", () => {
  it("returns unknown when empty", () => {
    expect(parseAuthResults(null).summary).toBe("unknown");
  });

  it("parses spf/dkim/dmarc pass", () => {
    const r = parseAuthResults("mx.google.com; spf=pass; dkim=pass; dmarc=pass");
    expect(r.spf).toBe("pass");
    expect(r.dkim).toBe("pass");
    expect(r.dmarc).toBe("pass");
    expect(r.summary).toBe("pass");
  });

  it("flags fail", () => {
    const r = parseAuthResults("spf=fail; dkim=none; dmarc=fail");
    expect(r.summary).toBe("fail");
  });
});