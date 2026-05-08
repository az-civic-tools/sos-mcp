# Why MCP?

This page makes the case for why a Model Context Protocol server is worth standing up at all, instead of just letting your AI curl the upstream directly. It's about three things: **knowledge, tokens, and reliability**.

## What is MCP exactly?

MCP (Model Context Protocol) is an open spec from Anthropic that defines a standard way for AI assistants to call external tools. Three pieces:

1. **Tools** — typed functions with input schemas and structured outputs
2. **Transport** — how the call moves between client and server (stdio for local, Streamable HTTP for remote)
3. **Discovery** — a handshake (`initialize` → `tools/list`) so the client knows what's available

There's no special model, no proprietary fine-tuning, no platform lock-in. The same MCP server works in Claude Desktop, Claude Code, Cursor, Cline, Continue, Zed — anything that speaks MCP.

## Three reasons MCPs beat raw curl

### 1. Knowledge encapsulation

The SeeTheMoney portal is open data, but its undocumented API has at least 13 gotchas. A non-exhaustive list:

- Filter parameters go in the URL query string, **not the body** (body is for DataTables pagination state)
- `Position=Support` is required on AdvancedSearch — omit it = empty results
- `StartDate` and `EndDate` are required even when CycleId is set
- `CycleId` is a compound string `id~start~end`, not a bare number
- The `Expense` value silently returns 0 rows; you have to use `Expenditures` (plural)
- `CommiteeReportId` is the misspelled correct param name. Don't fix it.
- Dates round-trip as `/Date(ms)/`, MS-JSON format
- `EntityLastName` has embedded HTML: `"Alston, Lela <br>(101817)"`

Without an MCP, every time you ask Claude to query SeeTheMoney, it has to either (a) load the full API reference into its context window, or (b) guess and hit dead ends.

With an MCP, the gotchas live inside the server **once**. The model sees a clean tool: `sos_search_transactions(donor_name, cycle, ...)`. The proxy handles the rest.

### 2. Token economy

Compare a real task end-to-end.

#### Task: "Find the top 5 PAC IE spends in the 2026 cycle."

**Without MCP:**

| Step | Tokens |
|------|--------|
| Read API reference (or fail without it) | ~12,000 |
| Construct curl with all 13 gotchas correct | ~600 |
| Upstream returns 78 KB SPA wrapper + ~25 KB JSON | ~26,000 |
| Parse `/Date(ms)/`, strip embedded HTML, sort | ~1,500 |
| Format an answer | ~400 |
| **Total** | **~40,500 tokens** |

**With MCP:**

| Step | Tokens |
|------|--------|
| Tool schema (loaded once per session) | ~200 |
| Tool call payload (JSON args) | ~80 |
| Tool response (clean, normalized, sorted) | ~1,800 |
| Format an answer | ~400 |
| **Total** | **~2,480 tokens** |

That's roughly **16x less context burned** for the same answer. And the savings compound: every follow-up question reuses the in-context schema rather than re-learning the API.

This matters because:
- Anthropic charges per token
- Context windows are finite (you'll run out before you finish a real investigation)
- Latency scales with token count

### 3. Reliability and reproducibility

When a model curls a JS-heavy site, it can:
- Hallucinate URL parameters
- Misparse HTML
- Get stuck in error loops
- Burn 10x more tokens than expected

When the model calls a typed MCP tool, the input is validated by Zod, the output is structured JSON, and the model can reason about it cleanly. **The MCP is a contract.**

## When NOT to use an MCP

There are real cases where curl is fine:

1. **One-shot, manual investigations.** If you're hand-tweaking a query in a terminal session, curl is faster than building an MCP.
2. **Data you scrape once and forget.** If you're going to query it once for a one-off report, the upfront cost of building an MCP isn't worth it.
3. **Highly bespoke transformations.** If every query needs different post-processing, a generic MCP tool may not save much.

But if you (or an AI assistant) will hit this data **many times across sessions** — and the underlying API is at all messy — an MCP is the right shape.

## Why this MCP is a *proxy*, not a *mirror*

For static data (like the [Arizona Revised Statutes](https://github.com/az-civic-tools/ars-mcp)) we mirror — scrape weekly, store in D1, serve from local. Cheap and fast.

For continuously-updating relational data (campaign finance), mirroring gets ugly fast: millions of transactions, multiple report types, frequent filings. So this MCP is a live proxy with a 30-minute KV cache. Every query goes upstream, but identical queries are cached briefly to avoid hammering azsos.gov.

See [Architecture](Architecture) for more on the design choices.

## Further reading

- [Anthropic's MCP announcement](https://www.anthropic.com/news/model-context-protocol)
- [MCP specification](https://modelcontextprotocol.io)
- [Examples and Recipes](Examples) — real investigations using the SOS MCP
