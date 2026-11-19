import { describe, it, expect } from "vitest";
import {
  sanitizeEmailHtml,
  escapeHtml,
} from "./sanitize";

describe("sanitizeEmailHtml", () => {
  it("removes script tags", () => {
    const out = sanitizeEmailHtml('<p>Hi</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>Hi</p>");
  });

  it("strips on* event handlers", () => {
    const out = sanitizeEmailHtml('<a href="/x" onclick="steal()">click</a>');
    expect(out).not.toContain("onclick");
    expect(out).toContain('href="/x"');
  });

  it("blocks javascript: URLs", () => {
    const out = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("blocks data:text/html but allows data:image", () => {
    const bad = sanitizeEmailHtml('<img src="data:text/html,<script>1</script>">');
    expect(bad).not.toContain("data:text/html");
    const good = sanitizeEmailHtml('<img src="data:image/png;base64,iVBORw0KGgo=">');
    expect(good).toContain("data:image/png;base64");
  });

  it("drops disallowed tags but keeps inner text", () => {
    const out = sanitizeEmailHtml("<foo>hello</foo>");
    expect(out).not.toContain("<foo");
    expect(out).toContain("hello");
  });

  it("removes iframes and objects entirely", () => {
    expect(sanitizeEmailHtml('<iframe src="evil"></iframe>')).toBe("");
    expect(sanitizeEmailHtml('<object data="x"></object>')).toBe("");
  });

  it("keeps safe formatting tags", () => {
    const out = sanitizeEmailHtml("<p><strong>bold</strong> and <em>italic</em></p>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("escapes quotes in attributes", () => {
    const out = sanitizeEmailHtml('<a href="/x" title=\'a"b\'>x</a>');
    expect(out).toContain("&quot;");
  });
});

describe("escapeHtml", () => {
  it("escapes html special chars and newlines", () => {
    expect(escapeHtml("<script>&\n")).toBe("&lt;script&gt;&amp;<br/>");
  });
});