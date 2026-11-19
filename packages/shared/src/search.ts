/**
 * Gmail-style search query parser. Turns `from:me is:unread has:attachment`
 * into a structured filter the DB layer can translate to SQL.
 */
export interface ParsedSearchQuery {
  text: string;
  from?: string;
  to?: string;
  subject?: string;
  label?: string;
  category?: string;
  isUnread?: boolean;
  isStarred?: boolean;
  hasAttachment?: boolean;
  after?: Date;
  before?: Date;
}

const OPERATORS: Record<string, keyof ParsedSearchQuery> = {
  from: "from",
  to: "to",
  subject: "subject",
  label: "label",
  category: "category",
  after: "after",
  before: "before",
};

export function parseSearchQuery(q: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = { text: "" };
  const words: string[] = [];

  // Tokenize respecting quotes.
  const tokens = q.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];

  for (const token of tokens) {
    const colon = token.indexOf(":");
    if (colon > 0) {
      const op = token.slice(0, colon).toLowerCase();
      const rawValue = token.slice(colon + 1).replace(/^"|"$/g, "");

      if (op === "is") {
        const v = rawValue.toLowerCase();
        if (v === "unread") result.isUnread = true;
        else if (v === "read") result.isUnread = false;
        else if (v === "starred") result.isStarred = true;
        continue;
      }
      if (op === "has" && rawValue.toLowerCase() === "attachment") {
        result.hasAttachment = true;
        continue;
      }
      const key = OPERATORS[op];
      if (key) {
        if (key === "after" || key === "before") {
          const d = parseDate(rawValue);
          if (d) (result as unknown as Record<string, unknown>)[key] = d;
        } else {
          (result as unknown as Record<string, unknown>)[key] = rawValue;
        }
        continue;
      }
    }
    words.push(token.replace(/^"|"$/g, ""));
  }

  result.text = words.join(" ");
  return result;
}

function parseDate(value: string): Date | undefined {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Convert a Gmail-style query to a human-readable description (for the search
 * bar placeholder / saved-search labels).
 */
export function describeQuery(q: ParsedSearchQuery): string {
  const parts: string[] = [];
  if (q.from) parts.push(`from:${q.from}`);
  if (q.to) parts.push(`to:${q.to}`);
  if (q.subject) parts.push(`subject:${q.subject}`);
  if (q.isUnread) parts.push("is:unread");
  if (q.isStarred) parts.push("is:starred");
  if (q.hasAttachment) parts.push("has:attachment");
  if (q.category) parts.push(`category:${q.category}`);
  if (q.text) parts.push(q.text);
  return parts.join(" ") || "all mail";
}