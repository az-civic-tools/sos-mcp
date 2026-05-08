# Architecture

The full design rationale for the SOS MCP. Useful if you're contributing, self-hosting, or building a similar wrapper for another data source.

## Tradeoff: proxy vs mirror

The two natural designs for "wrap an upstream API" are:

**Mirror** — scrape upstream periodically, store locally (in D1, SQLite, Postgres), serve from your own database. Examples: [ARS MCP](https://github.com/az-civic-tools/ars-mcp), Cactus Watch.

**Proxy** — serve every request from upstream live, optionally cache briefly. Examples: this project.

The right shape depends on:

| Factor | Favors mirror | Favors proxy |
|--------|---------------|--------------|
| Data size | Small | Large |
| Update frequency | Rare | Frequent |
| Schema complexity | Static | Relational |
| Upstream reliability | Flaky | Solid |
| Authority | OK to be stale | Must be fresh |

Campaign finance is **large** (millions of transactions), **frequently updated** (filings happen continuously), **relational** (committees → reports → transactions → donors), and the upstream is **reliable enough**. Proxy wins.

By contrast, the Arizona Revised Statutes are **small** (~50 MB), **rarely updated** (annual cadence), **flat** (just text), and we want **fast full-text search**. Mirror wins.

## Stack

```
sos.cactus.watch
    │
    ▼
┌────────────────────────────────────────┐
│  Cloudflare Worker (sos-api)          │
│  ─ Web Standards APIs                 │
│  ─ TypeScript, no build step          │
│  ─ Deploys via wrangler               │
└────────────────────────────────────────┘
        │              │
        │              │ KV cache (30 min)
        │              ▼
        │     ┌─────────────────┐
        │     │ sos-mcp-cache   │
        │     │ (KV namespace)  │
        │     └─────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  seethemoney.az.gov                    │
│  ─ ASP.NET MVC 5.2                     │
│  ─ DataTables.js front-end             │
│  ─ Public, no auth                     │
└────────────────────────────────────────┘
```

One Worker, one KV namespace. Everything else is upstream.

## Code layout

```
workers/api/
├── src/
│   ├── index.ts        Entry: route dispatch
│   ├── rest.ts         REST endpoint routing
│   ├── mcp.ts          Streamable HTTP MCP server
│   ├── seethemoney.ts  Core upstream client (DataTables POST builder)
│   ├── queries.ts      High-level query functions per endpoint
│   ├── normalize.ts    Date/HTML/pipe-blob helpers
│   ├── cycles.ts       Hardcoded cycle table + resolver
│   ├── entities.ts     Entity types + page enum
│   ├── cache.ts        KV cache wrapper
│   ├── types.ts        Env + interface types
│   └── landing.ts      Static HTML for /
├── wrangler.toml
├── package.json
└── tsconfig.json
```

Each file is focused and small. `seethemoney.ts` is the only place that knows about DataTables protocol. `normalize.ts` is the only place that handles upstream quirks. Everything else builds on those.

## Why Streamable HTTP for MCP (not SSE)

We learned this the hard way on the [ARS MCP](https://github.com/az-civic-tools/ars-mcp). The `agents@0.12.x` SDK uses SSE transport, which:

- Requires a persistent GET stream open between client and server
- Holds session state in a Durable Object
- Drops mid-session under Cloudflare's edge timeouts, returning "Connection closed" to clients

We switched to `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` directly. This:

- Is stateless (no DO needed)
- Returns plain JSON responses to POST requests (`enableJsonResponse: true`)
- Works perfectly with Cloudflare Workers
- Is the modern recommended transport per the MCP spec

For SOS MCP we used Streamable HTTP from day one.

## Why KV cache and not no cache

Two reasons:

1. **Be a polite citizen.** azsos.gov is a state agency website. We don't want to hammer it. 30 minutes of staleness is fine for campaign finance research.
2. **Cloudflare bot management.** The upstream has `__cf_bm` challenges on sustained high-rate traffic. Caching aggressively keeps us under the radar.

Cache key is built from the request path + every query parameter. Identical queries within the TTL hit the cache instantly. Override with `?nocache=1` for live data.

## Why no D1

D1 implies storage. We're not storing anything — just translating and proxying. KV is enough for the cache. Adding D1 would mean schema migrations, eventual consistency concerns, and write-path complexity for zero benefit.

## Why TypeScript and not plain JS

The MCP SDK and Zod both benefit hugely from types. The SeeTheMoney response shapes are gnarly enough that having compile-time checking on field names catches bugs early. Wrangler handles TS natively, so there's no separate build step.

## Why no scraping / no scheduled jobs

Campaign finance data updates continuously. A scheduled scraper would either:
- Run too often (waste resources, annoy upstream)
- Run too rarely (return stale data)

A live proxy with a 30-minute cache splits the difference: most queries are recent enough that the cache is hot, but every query eventually pulls fresh data when the TTL expires.

## Why deploy to Cloudflare Workers (vs alternatives)

- **Edge deployment** — close to wherever the user is, low latency
- **Free tier covers everything** — no cost concerns
- **Same platform as ars.cactus.watch and Cactus Watch** — operational consistency
- **Handles MCP transport natively** via Web Standards APIs
- **No cold starts** for a frequently-hit Worker

## How to extend

Adding a new tool:

1. Add a query function in `queries.ts` that wraps the upstream
2. Add normalization logic in `normalize.ts` if the upstream returns weird shapes
3. Add a REST handler in `rest.ts` if you want a curl-able route
4. Add an MCP tool in `mcp.ts` with a Zod input schema
5. Update the wiki

Adding a new data source (e.g. AZCC business search):

1. Create `azcc.ts` parallel to `seethemoney.ts`
2. Add normalization helpers
3. Add tools that use the new client

The architecture deliberately keeps each upstream isolated — no cross-talk between SOS and any future AZCC integration.

## Limits and constraints

- **Page size:** AdvancedSearch tested up to 200 records per page. Higher caps untested.
- **Rate limits:** Cloudflare's edge handles inbound; outbound to azsos.gov is unmetered but bot-managed.
- **Cycle bounds:** Hardcoded to known cycles 1998–2026. Update `cycles.ts` when new cycles are added (they bump the CycleId every two years).
- **Streamable HTTP only:** No SSE or stdio support. If you need stdio, fork and add a wrapper.
