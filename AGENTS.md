# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## Best Practices (conditional)

If the application uses Durable Objects or Workflows, refer to the relevant best practices:

- Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/

## Required Secrets (`wrangler secret put`)

| Secret | Zorunlu? | Açıklama |
|--------|----------|----------|
| `DISCORD_TOKEN` | ✅ Zorunlu | Ana bot token |
| `HABER_DISCORD_TOKEN` | ✅ Zorunlu | Haber botu token |
| `GITHUB_TOKEN` | ❌ Opsiyonel | GitHub API rate limit aşımı (60 → 5000 req/saat). Yoksa limitsiz çalışır, exploit-ara komutu public API'e düşer |
| `HIBP_API_KEY` | ❌ Opsiyonel | Have I Been Pwned sızıntı sorgusu. Yoksa psbdmp.cc ücretsiz API kullanılır |
| `VIRUSTOTAL_API_KEY` | ❌ Opsiyonel | VirusTotal tehdit analizi. Yoksa AlienVault OTX ücretsiz kullanılır |
| `ABUSEIPDB_API_KEY` | ❌ Opsiyonel | AbuseIPDB saldırganlık skoru. Yoksa atlanır, temel bilgiler yine gelir |
| `HUNTER_API_KEY` | ❌ Opsiyonel | Hunter.io kurumsal e-posta taraması. Yoksa pattern tahmini kullanılır |
| `NUMVERIFY_API_KEY` | ❌ Opsiyonel | Numverify telefon doğrulama. Yoksa ülke kodu tespiti yapılır |
| `SERPAPI_API_KEY` | ❌ Opsiyonel | SerpAPI Google Lens. Yoksa sadece AI görsel analizi çalışır |

### Enrichment Mantığı

Token/API key varsa → **HEM ücretli API HEM ücretsiz API birlikte çalışır**, sonuçlar tek bir raporda birleşir (duplicate olmaz):

- `HIBP_API_KEY` + `psbdmp.cc` (her zaman) → En zengin sızıntı taraması
- `VIRUSTOTAL_API_KEY` + `AlienVault OTX` (her zaman) → En kapsamlı tehdit analizi
- `ABUSEIPDB_API_KEY` + `ip-api.com` (her zaman) → IP lokasyon + saldırganlık
- `GITHUB_TOKEN` + public GitHub API (rate-limit düşünce) → Kesintisiz tarama
- `SERPAPI_API_KEY` + Workers AI Vision (her zaman) → Görsel + metin analizi
