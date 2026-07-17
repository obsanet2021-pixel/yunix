# Yunix MCP Server

An MCP (Model Context Protocol) server that exposes your Yunix trading journal — trades, analytics, prop firm accounts, playbooks, backtests, and certificates — as tools an LLM like Claude can call directly.

Once deployed, you connect it to Claude exactly like you'd connect Notion, Google Drive, or any other custom connector: paste in the server URL, no separate app needed.

## Tools included

| Tool | What it does |
|---|---|
| `yunix_list_trades` | List trades, filterable by status/symbol/prop firm account |
| `yunix_get_trade` | Full detail (incl. notes) for one trade |
| `yunix_log_trade` | Log a new open trade |
| `yunix_close_trade` | Close an open trade with an exit price |
| `yunix_get_analytics_summary` | Win rate, total P&L, avg R-multiple, best/worst trade |
| `yunix_list_prop_firms` | Prop firm accounts with balance/target/drawdown |
| `yunix_list_playbooks` | Strategy playbooks with rules and win rate |
| `yunix_list_backtest_sessions` | Backtest history by strategy |
| `yunix_list_certificates` | Earned achievement certificates |

All read tools are non-destructive (`readOnlyHint: true`). Only `yunix_log_trade` and `yunix_close_trade` write data.

## Auth model — read this first

This scaffold ships in **personal mode**: one server, scoped to one Yunix account, using your Supabase **service role key** plus a fixed `YUNIX_USER_ID`. Every query is manually filtered to that user, so it never touches anyone else's data. This is the right setup for "connect my own Yunix to my own Claude."

If you ever want to let other Yunix users connect their own accounts through this same server, you'd swap this for per-request OAuth against Supabase Auth (see the comment block in `src/services/supabase.ts`) so Postgres RLS enforces access naturally instead of the service role bypassing it. Not needed for solo use.

**Never commit `.env` or the service role key.** It bypasses Row Level Security entirely.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — same Supabase project Yunix's frontend uses (Project Settings > API)
- `YUNIX_USER_ID` — your `auth.users.id`. Find it with:
  ```sql
  SELECT id, email FROM auth.users WHERE email = 'you@example.com';
  ```

```bash
npm run build
npm run start:http   # Streamable HTTP on :3000/mcp — what you'll point Claude at
# or
npm start             # stdio — for local tools like Claude Desktop's local MCP config
```

## ⚠️ Schema assumptions

`src/types.ts` defines the expected shape of your `trades`, `prop_firms`, `playbooks`, `backtest_sessions`, and `certificates` tables. I inferred these from your README's feature list (Trade Journal, Prop Firm Tracking, Playbooks, Backtesting, Certificates) since I didn't have direct access to your actual `supabase/migrations/`. **Before this will work, check your real column names against `src/types.ts` and the `.select()`/`.insert()` calls in `src/tools/*.ts`, and adjust to match.** The fastest way: run `supabase gen types typescript` in the Yunix repo and diff it against `types.ts`.

## Deploying so Claude can reach it

Claude connects to custom connectors from Anthropic's cloud, not your device — the server must be reachable over the public internet. Good options given your stack:
- **Cloudflare Workers** — Yunix already ships a `wrangler.jsonc`; a small adapter can run this same Express app on Workers, or deploy as a standalone Worker.
- **A cheap always-on box / Fly.io / Render** — simplest: just `npm run start:http` behind HTTPS.

Once it's live at `https://your-domain/mcp`:
1. In Claude, go to **Customize > Connectors > +**
2. Enter the name (e.g. "Yunix") and the URL
3. Add it, enable it for a conversation, and ask things like *"What's my win rate this week?"* or *"Log a long XAUUSD trade at 2385, 0.5 lots."*

## Testing locally before deploying

```bash
npx @modelcontextprotocol/inspector
```
Point it at `http://localhost:3000/mcp` (after `npm run start:http`) to call tools manually and confirm the Supabase queries return what you expect.

## Extending

Add a new domain (e.g. courses, MT5 connection status) by copying the pattern in `src/tools/certificates.ts`: a Zod input schema, a `registerTool` call with a thorough description, and a query scoped by `getScopedUserId()`. Wire it up in `src/index.ts`.
