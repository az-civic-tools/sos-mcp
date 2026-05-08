# SOS MCP

Free, open-source MCP server and REST proxy for the Arizona Secretary of State campaign finance portal (SeeTheMoney + VRKA).

Live at **https://sos.cactus.watch**.

## What this is

A clean, AI-friendly wrapper around `seethemoney.az.gov` — Arizona's official campaign finance portal. The portal is open data but its undocumented JSON API has a long list of gotchas (DataTables-style POSTs, `Position=Support` required, MS-JSON dates, embedded HTML, parameter-name typos). This service hides all of that.

> **Full documentation lives in the [Wiki](https://github.com/az-civic-tools/sos-mcp/wiki).**

## What is an MCP?

**MCP** stands for **Model Context Protocol** — an open standard that lets AI assistants (Claude, Cursor, Cline, etc.) call external tools in a structured, predictable way. Think of it like a Lego brick that snaps onto your AI: instead of asking your assistant to scrape a website, you give it a tool that returns clean JSON.

The protocol defines:
- **Tools** the AI can call (with typed inputs and outputs)
- **A transport** that carries the calls between client and server (we use Streamable HTTP)
- **A discovery handshake** so the AI knows what's available

That's it. No special model, no fine-tuning, no proprietary glue. Any MCP-compatible client (Claude Desktop, Claude Code, Cursor, Cline, Continue, Zed, etc.) can use this server.

Want a deeper read? See [Why MCP?](https://github.com/az-civic-tools/sos-mcp/wiki/Why-MCP) in the wiki.

## Why use an MCP (vs just curl-ing the SOS site)?

Three reasons.

**1. The model doesn't have to know SeeTheMoney's quirks.** The seethemoney.az.gov API has at least 13 gotchas (`Position=Support` required, the `CommiteeReportId` typo, MS-JSON dates, etc.). Without an MCP, every time you ask Claude to look something up, it either has to learn those gotchas inside its context window, or guess and fail.

**2. Token economy.** A single curl to the SOS portal pulls down a 78 KB ASP.NET SPA wrapper before you ever see a record. The MCP returns ~1 KB of clean text per query — the same data, normalized.

**3. The model can call it natively.** Tool calls aren't web fetches. They're a structured request/response that the AI knows how to compose. Less round-tripping through a search agent, no HTML parsing, no hallucinated URLs.

### Token usage example (real numbers)

**Task:** "Find the top 5 PAC IE spends in the 2026 cycle."

**Without MCP** (Claude curls SeeTheMoney directly):

| Step | Approx tokens |
|------|---------------|
| Read the API reference doc to learn the endpoint shape | ~12,000 |
| Construct a curl command with all 13 gotchas right | ~600 |
| Curl returns 78 KB SPA wrapper + ~25 KB JSON of data | ~26,000 |
| Parse `/Date(ms)/`, strip `<br>(id)`, sort by amount | ~1,500 |
| Format an answer | ~400 |
| **Total** | **~40,500 tokens** |

**With MCP** (Claude calls `sos_search_transactions`):

| Step | Approx tokens |
|------|---------------|
| Tool schema (loaded once per session) | ~200 |
| Tool call payload (JSON args) | ~80 |
| Tool response (clean, normalized, sorted) | ~1,800 |
| Format an answer | ~400 |
| **Total** | **~2,480 tokens** |

That's roughly a **16x reduction** for one query. The savings compound: every follow-up question reuses the same in-context tools rather than re-learning the API.

The same logic applies to ARS (statute lookups), GitHub MCP (PR data), and any other domain where the underlying API is messy or verbose. **MCPs are how you give AI assistants leverage on real-world data without burning context.**

---

## Add to Claude Code

```bash
claude mcp add --scope user --transport http arizona-campaign-finance \
  https://sos.cactus.watch/mcp
```

## Add to Claude Desktop

```json
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
| `sos_lookup` | Autocomplete / find an entity by name (≥6 chars, returns IDs and types) |
| `sos_get_committee` | Committee profile by EntityID |
| `sos_committee_transactions` | All transactions for a committee, filterable by detail page |
| `sos_search_transactions` | AdvancedSearch: donor, vendor, employer, ZIP, amount range, position |
| `sos_list_by_type` | Browse all candidates / PACs / parties / IE / ballot measures in a cycle |
| `sos_vrka_search` | Prop 211 VRKA filings (returns FILINGS not transactions — see wiki) |
| `sos_committee_reports` | Filed campaign-finance reports for a committee |

Full reference: [Wiki — MCP Tools](https://github.com/az-civic-tools/sos-mcp/wiki/MCP-Tools).

## REST API

No key. No auth. Just fetch.

```bash
# Look up an entity
curl "https://sos.cactus.watch/api/sos/lookup?q=vanderwey"

# Pull every Vanderwey contribution in the 2024 cycle
curl "https://sos.cactus.watch/api/sos/search?donor=Vanderwey&cycle=2024"

# Top IE *opposition* spending from PACs in 2026
curl "https://sos.cactus.watch/api/sos/search?category=IndependentExpenditures&filer_type_id=2&position=Opposition&cycle=2026"

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

Full reference: [Wiki — REST API](https://github.com/az-civic-tools/sos-mcp/wiki/REST-API).

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

See [Wiki — Self Hosting](https://github.com/az-civic-tools/sos-mcp/wiki/Self-Hosting) for a fork-and-run guide.

## Disclaimer

This is a community proxy. **It is not the authoritative source.** All data flows live from `https://seethemoney.az.gov`. For court filings, complaints, or anything where accuracy matters, verify directly against seethemoney.az.gov.

The data is provided "as is" with no warranty. See [LICENSE](LICENSE).

## License

[MIT](LICENSE).

## Sister projects

- [ars-mcp](https://github.com/az-civic-tools/ars-mcp) — MCP server for the Arizona Revised Statutes (ars.cactus.watch)
- [Cactus Watch](https://cactus.watch) — Arizona bill tracker with free public API
- [az-civic-tools](https://github.com/az-civic-tools/az-civic-tools) — District finder, civics education guide
