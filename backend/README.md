# mfmfintro-backend

Backend APIs for the project (Vercel + Hono + Supabase).

## Local Development

### 1) Install

```bash
npm install
```

### 2) Environment Variables

Create `.env.local` (this file is gitignored):

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Run

```bash
npm run dev
```

Local dev server: `http://localhost:3000`

## API

### GET /

Response:

```json
{"message":"API is running"}
```

## Quick Test (PowerShell)

PowerShell `curl` is an alias, so use `curl.exe`.

```powershell
curl.exe -X POST http://localhost:3000/api/XXXXXX
curl.exe -X GET http://localhost:3000/api/XXXXXX
```

## Format

```bash
npm run format
```

## Deploy (Vercel)

```bash
npm run deploy
```

## Notes

- This repo is Vercel-ready via [api/[[...route]].ts](api/[[...route]].ts).
- Local development uses a Node server (`tsx watch src/server.ts`) to avoid `vercel dev` recursive invocation.
