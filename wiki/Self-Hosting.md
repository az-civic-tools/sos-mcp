# Self-Hosting

You don't need to self-host to use this — `sos.cactus.watch` is free and public. But if you want your own copy (different rate, different cache TTL, fork for another state), here's the playbook.

## Prerequisites

- Node.js 20+
- A Cloudflare account (free tier is fine)
- `wrangler` CLI: `npm install -g wrangler`

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/az-civic-tools/sos-mcp.git
cd sos-mcp/workers/api
npm install
```

### 2. Create a KV namespace for the cache

```bash
npx wrangler kv:namespace create CACHE
```

Wrangler will print an ID. Copy it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-id-here"
```

### 3. Update routes (optional)

If you want a custom domain, update the `routes` block in `wrangler.toml`:

```toml
routes = [
  { pattern = "your-domain.example.com", custom_domain = true }
]
```

If you don't want a custom domain, just delete the `routes` block. The Worker will be available at `<worker-name>.<your-account>.workers.dev`.

### 4. Deploy

```bash
npx wrangler deploy
```

You're live. The Worker handles `/`, `/api/sos/*`, and `/mcp`.

### 5. Verify

```bash
curl https://your-domain/health
# -> ok

curl https://your-domain/api/sos/cycles
# -> {"cycles": [...], "disclaimer": "..."}
```

## Configuration

The Worker reads three env vars from `wrangler.toml`:

| Var | Default | Notes |
|-----|---------|-------|
| `USER_AGENT` | `sos-mcp/0.1 ...` | Identifies your traffic to azsos.gov |
| `SITE_NAME` | `Arizona SOS Campaign Finance` | Cosmetic |
| `CACHE_TTL_SECONDS` | `1800` | KV cache TTL (30 min default) |

Update `USER_AGENT` to identify your fork — include a contact (email, domain) so azsos.gov can reach you if something goes wrong.

## Cost

Cloudflare Workers free tier:
- 100,000 requests / day
- 10ms CPU per request

KV free tier:
- 100,000 reads / day
- 1,000 writes / day
- 1 GB storage

Realistically you'll never hit the free-tier limits unless this becomes a popular service. The current `sos.cactus.watch` deployment runs entirely free.

## Forking for another state

The architecture generalizes to any DataTables-style state campaign finance API. To fork for, say, Texas:

1. **Reverse-engineer the upstream.** Use browser DevTools to watch network traffic. Document endpoints, parameters, response shapes. (We did this in `~/Documents/development/az-campaign-finance/reference/seethemoney_api_reference.md` for AZ.)

2. **Replace `seethemoney.ts` with `tx-state.ts`** (or whatever). Same shape: a `dataTablesPost()` helper plus per-endpoint wrappers.

3. **Update `cycles.ts` and `entities.ts`** for the new state's cycle conventions and entity type IDs.

4. **Update `normalize.ts`** for whatever quirks the new upstream has (different date format, different HTML embeds, etc.).

5. **Tools in `mcp.ts` mostly stay the same** — `tx_lookup`, `tx_search_transactions`, `tx_list_by_type`, etc.

6. **Repo / domain:** create `<state>-campaign-finance-mcp` and a subdomain (e.g. `tx.cactus.watch`).

The hardest part is step 1. Once you have a documented API, the rest is mostly mechanical translation.

## Production hardening

If you're running this for serious traffic:

- **Increase KV TTL** to reduce upstream pressure
- **Add a stricter rate limit** in front of the MCP/REST endpoints (Cloudflare WAF can handle this)
- **Monitor with Cloudflare Workers Analytics**
- **Set up alerting** on upstream 5xx responses
- **Pin upstream User-Agent** to a contact email so the agency can reach you

## Contributing back

If you find a new upstream gotcha, a missing cycle, a better normalization — please open a PR against the upstream `az-civic-tools/sos-mcp` repo. The goal is for any AZ user (and any forker) to benefit from the same canonical reverse-engineering.
