import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Emailo — AI Email Management",
    template: "%s · Emailo",
  },
  description:
    "Emailo is an AI-enabled email management SaaS: smart inbox, AI replies, rules, and analytics. Organize your inbox on autopilot with the AI provider you choose.",
  keywords: [
    "AI email",
    "email management",
    "email client",
    "AI email assistant",
    "inbox zero",
    "smart inbox",
    "email automation",
  ],
  authors: [{ name: "Emailo" }],
  creator: "Emailo",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "Emailo",
    title: "Emailo — AI Email Management",
    description:
      "Your inbox, on autopilot. AI summaries, smart replies, rules, and analytics — self-hostable.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Emailo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Emailo — AI Email Management",
    description:
      "Your inbox, on autopilot. AI summaries, smart replies, rules, and analytics.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Emailo",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-enabled email management SaaS with smart inbox, AI replies, rules, and analytics.",
  url: APP_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}