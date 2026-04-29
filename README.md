# WAJBot

WhatsApp bot built on Baileys with a Next.js 16 web dashboard for multi-session management.

## Web Stack

- Next.js 16
- shadcn-style UI components
- Tailwind CSS 4.x
- Prisma + SQLite

Note: Tailwind CSS `v6` is not an official release as of April 27, 2026. This project uses the current official Tailwind 4.x line instead.

## Web Features

- Multi-session management
- Sessions Dashboard
- Create new session
- Start and stop session
- Delete session
- Session status and QR visibility

## Commands

- `.ping`
- `.help`
- `.sticker`
- `.toimg`
- `.meme`
- `.everyone`
- `.tv`
- `.tvanal`
- `.saham`

## Run

1. Install dependencies:

```bash
pnpm install
```

2. Generate Prisma client:

```bash
pnpm prisma generate
```

3. Start the dashboard:

```bash
pnpm dev
```

4. Open:

```text
http://localhost:3000
```

## Environment

Current project `.env` supports:

```env
DATABASE_URL='file:./dev.db'
WA_ALLOWED_CHATS=120363417180316944@g.us
OPENROUTER_API_KEY=...
```

Optional env:

```env
OPENROUTER_TV_MODEL=x-ai/grok-4.1-fast
OPENROUTER_TV_MAX_COMPLETION_TOKENS=520
OPENROUTER_TV_SHOW_USAGE=true
CHROME_PATH=/usr/bin/google-chrome
```

## Chat Restriction

Use `WA_ALLOWED_CHATS` as a comma-separated allowlist:

```bash
WA_ALLOWED_CHATS=6281234567890@s.whatsapp.net,1203630xxxxxxx@g.us pnpm dev
```

- Private chat format: `<phone>@s.whatsapp.net`
- Group format: `<group-id>@g.us`

## Stock Commands

- `.tv BBCA` opens TradingView and sends a chart screenshot.
- `.saham BBCA` opens Google Finance and sends a chart screenshot.
- `.tvanal` must be sent with an image caption or as a reply to an image.
- Chrome or Chromium must be installed locally for `.tv` and `.saham`.
- `OPENROUTER_API_KEY` is required for `.tvanal`.

## Legacy Single-Session Scripts

The old Express/single-session flow is kept only as fallback:

```bash
pnpm legacy:start
pnpm legacy:dev
pnpm legacy:pairing
```
