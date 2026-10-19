# backend

Hono API on Cloudflare Workers, backed by D1 (`DB`) and R2 (`ICONS`). The same Worker serves the static export of `../frontend` through Workers Static Assets, so the API and the site share one origin.

## Local Development

Run from the repository root:

```bash
pnpm install
pnpm --filter backend db:migrate:local
pnpm --filter frontend build   # static assets served by `wrangler dev`
pnpm dev                       # next dev on :3000 (proxies /api and /icons) + wrangler dev on :8787
```

Regenerate binding types after changing `wrangler.jsonc`:

```bash
pnpm --filter backend types
```

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api` | Health check |
| POST | `/api/register` | |
| POST | `/api/login` | |
| POST | `/api/account` | Own profile, friends and friends of friends |
| POST | `/api/change` | Update name, affiliation, social links |
| POST | `/api/qr` | Issue or reuse a QR string valid for 5 minutes |
| POST | `/api/exchange` | Exchange cards via QR (view-only without credentials) |
| POST | `/api/icon` | multipart `icon`: square PNG up to 512px, cropped by the frontend |
| GET | `/api/user` | Public profile; includes `friends` when the requester is a friend |
| GET | `/icons/:id.png` | Icon from R2 |

## Deploy

```bash
pnpm run deploy                             # from the repository root
pnpm --filter backend db:migrate:remote     # when migrations change
```

## Migrating from Supabase

`scripts/migrate-from-supabase.mjs` copies profiles, friendships and icons into D1 and R2. Put `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env.migrate`, then run from `backend/`:

```bash
node --env-file=.env.migrate scripts/migrate-from-supabase.mjs --dry-run
node --env-file=.env.migrate scripts/migrate-from-supabase.mjs --remote
```

The script replaces all D1 rows on each run, so run it again right before switching DNS.
