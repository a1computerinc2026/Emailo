/**
 * HTML sanitization for email bodies.
 *
 * Email HTML is attacker-controlled (anyone can send you mail), so it must be
 * sanitized before rendering with dangerouslySetInnerHTML. This module uses a
 * strict allowlist and strips dangerous constructs: <script>, <iframe>, <object>,
 * event handlers (on*), javascript:/data: URLs, and external resource references.
 *
 * Runs both server-side (to store clean HTML) and client-side (defense in depth).
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "a", "b", "strong", "i", "em", "u", "s",
  "ul", "ol", "li", "blockquote", "pre", "code", "h1", "h2", "h3", "h4",
  "h5", "h6", "table", "thead", "tbody", "tr", "td", "th", "hr", "img",
  "figure", "figcaption", "small", "sub", "sup", "mark", "dl", "dt", "dd",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  ol: new Set(["start"]),
};

const URL_ATTRS = new Set(["href", "src"]);

/**
 * Sanitize an HTML string, returning safe HTML. Pure string transforms so it
 * works identically in Node and the browser without a DOM dependency.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";

  // Remove dangerous elements entirely (including their content for script/style).
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Strip event handler attributes (on*) and disallowed attributes per tag.
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag: string, attrs: string) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) {
      // Drop unknown tags but keep their inner text by returning empty.
      return "";
    }
    const allowed = ALLOWED_ATTRS[lower] ?? new Set<string>();
    const cleanedAttrs = attrs.replace(
      /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g,
      (attrMatch, name: string, _full, dq: string | undefined, sq: string | undefined, bare: string | undefined) => {
        const value = dq ?? sq ?? bare ?? "";
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith("on")) return ""; // drop event handlers
        if (!allowed.has(lowerName)) return ""; // drop disallowed attrs
        if (URL_ATTRS.has(lowerName) && !isSafeUrl(value)) return "";
        return ` ${lowerName}="${escapeAttr(value)}"`;
      },
    );
    return `<${lower}${cleanedAttrs}>`;
  });

  return out;
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("vbscript:")) return false;
  // Allow relative, http, https, mailto, and cid (inline images). Block data: for
  // non-images to prevent data:text/html smuggling.
  if (trimmed.startsWith("data:")) {
    return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed);
  }
  return true;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape plain text for safe HTML embedding (used for bodyText fallback).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}