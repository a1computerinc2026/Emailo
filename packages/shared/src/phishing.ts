/**
 * Phishing link detection (velo-style heuristics) and SPF/DKIM/DMARC parsing.
 * Pure functions so they run identically in the web app and the worker.
 */

export interface PhishingResult {
  score: number; // 0-100, higher = riskier
  reasons: string[];
}

const SUSPICIOUS_TLDS = [
  ".zip", ".mov", ".xyz", ".top", ".work", ".click", ".link", ".gq",
  ".tk", ".ml", ".cf", ".buzz", ".rest",
];

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "rb.gy", "shorturl.at",
];

const BRAND_IMPERSONATION = [
  "paypal", "apple", "microsoft", "google", "amazon", "netflix", "dhl",
  "fedex", "linkedin", "facebook", "instagram", "coinbase", "binance",
];

export function detectPhishing(
  text: string,
  links: { href: string; displayText?: string }[],
): PhishingResult {
  let score = 0;
  const reasons: string[] = [];

  for (const link of links) {
    const href = link.href.toLowerCase();
    const display = (link.displayText ?? "").toLowerCase();

    // IP-address URLs
    if (/https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(href)) {
      score += 25;
      reasons.push(`Link uses a raw IP address: ${link.href}`);
    }

    // Suspicious TLDs
    if (SUSPICIOUS_TLDS.some((tld) => href.endsWith(tld) || href.includes(tld + "/"))) {
      score += 15;
      reasons.push(`Link uses a high-risk TLD: ${link.href}`);
    }

    // URL shorteners
    try {
      const host = new URL(link.href).hostname;
      if (SHORTENERS.includes(host)) {
        score += 12;
        reasons.push(`Link uses an anonymizing shortener: ${host}`);
      }
    } catch {
      // ignore malformed
    }

    // Display/href mismatch (e.g. shows paypal.com, links elsewhere)
    if (display && display.includes(".") && !href.includes(display)) {
      score += 18;
      reasons.push(`Link text "${link.displayText}" does not match destination`);
    }

    // Brand impersonation with non-matching domain
    for (const brand of BRAND_IMPERSONATION) {
      if (href.includes(brand)) {
        let legit = false;
        try {
          const host = new URL(link.href).hostname;
          legit = host === `${brand}.com` || host.endsWith(`.${brand}.com`);
        } catch {
          /* ignore */
        }
        if (!legit) {
          score += 20;
          reasons.push(`Possible ${brand} brand impersonation: ${link.href}`);
          break;
        }
      }
    }

    // Credentials in URL
    if (/https?:\/\/[^/]*@/.test(href)) {
      score += 20;
      reasons.push(`Link contains embedded credentials: ${link.href}`);
    }
  }

  // Urgency / threat keywords in body
  const lower = text.toLowerCase();
  const urgencyPatterns = [
    /\burgent\b/, /\bverify your account\b/, /\bsuspended\b/,
    /\bclick here immediately\b/, /\bact now\b/, /\bexpires? (today|soon)\b/,
  ];
  for (const p of urgencyPatterns) {
    if (p.test(lower)) {
      score += 8;
      reasons.push(`Urgency/threat language detected: ${p.source}`);
      break;
    }
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * Parse an Authentication-Results header into structured SPF/DKIM/DMARC verdicts.
 */
export function parseAuthResults(header: string | null | undefined): {
  spf?: string;
  dkim?: string;
  dmarc?: string;
  summary: "pass" | "fail" | "warning" | "unknown";
} {
  if (!header) return { summary: "unknown" };
  const lower = header.toLowerCase();

  const spf = extractMechanism(lower, "spf");
  const dkim = extractMechanism(lower, "dkim");
  const dmarc = extractMechanism(lower, "dmarc");

  const results = [spf, dkim, dmarc].filter(Boolean) as string[];
  let summary: "pass" | "fail" | "warning" | "unknown" = "unknown";
  if (results.length > 0) {
    if (results.every((r) => r === "pass")) summary = "pass";
    else if (results.some((r) => r === "fail")) summary = "fail";
    else summary = "warning";
  }

  return { spf, dkim, dmarc, summary };
}

function extractMechanism(header: string, mech: string): string | undefined {
  const re = new RegExp(`${mech}\\s*=\\s*([a-z]+)`);
  const m = header.match(re);
  return m?.[1];
}