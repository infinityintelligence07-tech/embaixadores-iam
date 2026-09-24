# Embaixadores da Corda — Captura + Admin

Landing de candidatura e painel de aprovação/rejeição, com identidade visual Embaixadores, Supabase e Cloudflare Workers.

## Live

- Landing: https://embaixadores-forms.infinityintelligence07.workers.dev
- Admin: https://embaixadores-forms.infinityintelligence07.workers.dev/admin

## Stack

- React + Vite + Cloudflare Vite Plugin
- Worker API (Hono) em `/api/*`
- Supabase Postgres (`applications`)

## Desenvolvimento

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Secrets locais ficam em `.dev.vars` (não versionado).

## Deploy

```bash
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_API_TOKEN
npm run deploy
```

`ADMIN_API_TOKEN` precisa bater com `private.admin_config` no Supabase.

## Domínio customizado

No `wrangler.jsonc`, adicione (domínio precisa estar na mesma conta Cloudflare):

```jsonc
"routes": [{ "pattern": "embaixadores.seudominio.com", "custom_domain": true }]
```

## Rotas

- `/` — landing + formulário
- `/sucesso` — confirmação
- `/admin` — login + aprovar/rejeitar
