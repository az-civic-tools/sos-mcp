# SOS MCP

Free, open-source MCP server and REST proxy for the Arizona Secretary of State campaign finance portal (SeeTheMoney + VRKA).

Live at **https://sos.cactus.watch**.

## What this is

A clean, AI-friendly wrapper around `seethemoney.az.gov` — Arizona's official campaign finance portal. The portal is open data but its undocumented JSON API has a long list of gotchas (DataTables-style POSTs, `Position=Support` required, MS-JSON dates, embedded HTML, parameter-name typos). This service hides all of that.

## Why

- The official UI is a SPA with no real bulk search across donors, employers, or transactions
- Curling the underlying endpoints requires knowing 13 different gotchas before you get a non-empty response
- AI assistants can't easily reason about raw DataTables payloads

This MCP gives you (and Claude) a normalized view of every committee, candidate, PAC, donor, transaction, IE, and VRKA filing in Arizona, 1998–present.

## Add to Claude Desktop / Claude Code

```bash
# Claude Code
claude mcp add --scope user --transport http arizona-campaign-finance https://sos.cactus.watch/mcp
```

```json
// Claude Desktop config
{
  "mcpServers": {
    "arizona-campaign-finance": {
      "url": "https://sos.cactus.watch/mcp"
    }
  }
}
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `sos_lookup` | Autocomplete / find an entity by name (returns IDs and types) |
| `sos_get_committee` | Committee profile — name, office, party, cycle totals |
| `sos_committee_transactions` | All transactions for a committee, filterable by income/expense/IE |
| `sos_search_transactions` | Full-text search across donors, employers, vendors, ZIPs, dates, amounts |
| `sos_list_by_type` | Browse all candidates / PACs / parties / IE committees in a cycle |
| `sos_vrka_search` | Prop 211 Voter's Right To Know filings (the separate VRKA endpoint) |
| `sos_committee_reports` | List filed campaign-finance reports for a committee |

## REST API

No key. No auth. Just fetch.

```bash
# Look up an entity
curl "https://sos.cactus.watch/api/sos/lookup?q=vanderwey"

# Pull every Vanderwey contribution in the 2024 cycle
curl "https://sos.cactus.watch/api/sos/search?donor=Vanderwey&cycle=2024"

# Committee profile + transactions
curl "https://sos.cactus.watch/api/sos/committee/101878?cycle=2026"

# VRKA filings
curl "https://sos.cactus.watch/api/sos/vrka?cycle=2026"

# All PACs in the 2026 cycle
curl "https://sos.cactus.watch/api/sos/list/PAC?cycle=2026"
```

Every response includes:
- A `disclaimer` pointing back to seethemoney.az.gov as the authoritative source
- Normalized fields (ISO dates, no embedded HTML, decoded pipe blobs)
- A `raw` field on detail responses if you want the original SeeTheMoney row

## Architecture

One Cloudflare Worker. No D1, no scraping, no scheduled jobs. The Worker is a polite proxy that:

1. Translates clean inputs into SeeTheMoney's DataTables protocol
2. Strips embedded HTML, parses MS-JSON dates, decodes pipe-delimited blobs
3. Caches GET-shaped responses in KV for 30 minutes to spare azsos.gov

```
sos.cactus.watch
  ├── /                Static landing page
  ├── /api/sos/*       REST endpoints
  └── /mcp             MCP server (Streamable HTTP)
```

## Run it yourself

```bash
git clone https://github.com/az-civic-tools/sos-mcp.git
cd sos-mcp/workers/api
npm install
npx wrangler kv:namespace create CACHE
# Copy the id into wrangler.toml
npx wrangler deploy
```

## Disclaimer

This is a community proxy. **It is not the authoritative source.** All data flows live from `https://seethemoney.az.gov`. For court filings, complaints, or anything where accuracy matters, verify directly against seethemoney.az.gov.

The data is provided "as is" with no warranty. See [LICENSE](LICENSE).

## License

[MIT](LICENSE).

## Sister projects

- [ars-mcp](https://github.com/az-civic-tools/ars-mcp) — MCP server for the Arizona Revised Statutes (ars.cactus.watch)
- [Cactus Watch](https://cactus.watch) — Arizona bill tracker with free public API
- [az-civic-tools](https://github.com/az-civic-tools/az-civic-tools) — District finder, civics education guide
