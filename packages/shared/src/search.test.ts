import { describe, it, expect } from "vitest";
import { parseSearchQuery, describeQuery } from "./search";

describe("parseSearchQuery", () => {
  it("parses from and is:unread", () => {
    const q = parseSearchQuery("from:alice is:unread");
    expect(q.from).toBe("alice");
    expect(q.isUnread).toBe(true);
    expect(q.text).toBe("");
  });

  it("parses has:attachment and is:starred", () => {
    const q = parseSearchQuery("is:starred has:attachment invoice");
    expect(q.isStarred).toBe(true);
    expect(q.hasAttachment).toBe(true);
    expect(q.text).toBe("invoice");
  });

  it("parses after: date", () => {
    const q = parseSearchQuery("after:2026/01/01");
    expect(q.after).toBeInstanceOf(Date);
  });

  it("keeps free text", () => {
    const q = parseSearchQuery("quarterly report");
    expect(q.text).toBe("quarterly report");
  });

  it("describeQuery round-trips", () => {
    const q = parseSearchQuery("from:bob is:unread hello");
    expect(describeQuery(q)).toContain("from:bob");
    expect(describeQuery(q)).toContain("is:unread");
  });
});