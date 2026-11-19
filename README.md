# Emailo

**AI-enabled email management SaaS** — an open, self-hostable alternative inspired by
[inbox-zero](https://github.com/elie222/inbox-zero) (AI email assistant) and
[velo](https://github.com/avihaymenahem/velo) (pro email client features).

Emailo combines an AI email assistant that works in the background with a fast,
keyboard-friendly web client — all on your own infrastructure.

## Features

### AI email assistant
- **AI summaries** — TL;DR, key points, action items, and sentiment per thread
- **Smart replies** — drafts in your tone (optional writing-style learning)
- **AI compose** — turn a short instruction into a full email
- **AI rules** — plain-English rules that triage mail automatically
- **Cold email blocker** — auto-detects and archives unsolicited outreach
- **Ask my inbox** — natural-language Q&A across your mail with citations
- **Auto-categorization** — Primary / Updates / Promotions / Social / Newsletters / Cold

### Email client (velo-inspired pro features)
- Split inbox with category tabs and unread counts
- Three-pane layout with resizable reading pane
- Command palette (`⌘K` / `Ctrl+K`)
- Keyboard-first navigation
- Star, pin, archive, snooze, needs-reply tracking
- Rich thread view with SPF/DKIM/DMARC badges and phishing warnings
- Gmail-style search operators (`from:`, `is:unread`, `has:attachment`, …)

### AI providers (bring your own key)
| Provider | Default model |
|----------|---------------|
| OpenAI | `gpt-4o-mini` |
| Anthropic Claude | `claude-haiku-4-5` |
| Google Gemini | `gemini-2.5-flash` |

API keys are **encrypted at rest** (AES-256-GCM). Server-level keys are used as a
fallback when a user hasn't added their own.

### Account providers
- **Google** (Gmail API via OAuth)
- **Microsoft** (Graph API via OAuth)
- **IMAP/SMTP** (Outlook, Yahoo, iCloud, Fastmail, and any IMAP server)

## Quick start (Docker — Linux / WSL)

```bash
cp .env.example .env
# Edit .env: set AUTH_SECRET, ENCRYPTION_KEY, and OAuth credentials
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY

docker compose up -d
open http://localhost:3000
```

## Quick start (WSL / bare metal)

```bash
./scripts/start-wsl-linux.sh
# Web: http://localhost:3000
# Worker (separate terminal): pnpm worker
```

## Local development

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev        # web on :3000
pnpm worker     # background sync + AI triage
```

Demo login after seeding: `demo@emailo.dev`.

## Architecture

```
emailo/
├── apps/
│   ├── web/          # Next.js 15 App Router SaaS (UI + server actions + API)
│   └── worker/       # Background sync, AI triage, snooze & follow-up processor
├── packages/
│   ├── shared/       # AI client, email provider interface, phishing/search utils
│   └── db/           # Prisma schema, migrations, seed
├── docker/           # Dockerfiles + entrypoints
├── docker-compose.yml
└── scripts/          # WSL/Linux helpers
```

- **Web**: Next.js 15, React 19, Tailwind CSS, NextAuth v5 (Google/Microsoft OAuth)
- **Worker**: Node service running sync, AI triage, snooze, and follow-up loops
- **DB**: PostgreSQL via Prisma
- **AI**: provider-agnostic client supporting OpenAI, Anthropic, Google Gemini

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web + worker (Turbo) |
| `pnpm build` | Build all packages |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm worker` | Run the background worker |

## Security

- OAuth tokens & API keys encrypted with AES-256-GCM (`ENCRYPTION_KEY`)
- Phishing link detection with heuristic scoring
- SPF/DKIM/DMARC parsing with auth badges
- Per-user data isolation enforced in server actions

## License

MIT