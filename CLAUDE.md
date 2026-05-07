# SOS MCP

Polite proxy MCP server + REST API wrapping `seethemoney.az.gov`, Arizona's campaign finance portal. Deployed to `sos.cactus.watch`.

## Architecture

ONE Cloudflare Worker. No D1, no scraping, no cron. Live proxy with KV cache.

| Cloudflare resource | Name |
|---------------------|------|
| API Worker | `sos-api` |
| KV Namespace | `sos-mcp-cache` (30-min TTL) |
| Subdomain | `sos.cactus.watch` |

## Conventions

- TypeScript Worker, wrangler handles TS natively, no separate build step
- Stateless Streamable HTTP MCP via `@modelcontextprotocol/sdk` `WebStandardStreamableHTTPServerTransport` (NOT agents/mcp — that uses SSE which drops mid-session)
- Files under 800 lines, functions under 50
- Every response includes a "not authoritative" disclaimer
- Normalize SeeTheMoney's quirks before returning anything to the user:
  - `/Date(ms)/` → ISO 8601
  - `<br>(id)` stripped from EntityLastName
  - `ReceivedFromOrPaidTo` pipe blob decoded into structured fields

## SeeTheMoney API gotchas (memorized so you don't have to suffer)

1. Filter params go in the **URL** query string. DataTables state (`draw`, `columns[N]`, `start`, `length`, `order`) goes in the **body**. Swap them = empty results.
2. `Position=Support` is REQUIRED on AdvancedSearch. Omit it = empty results regardless of other filters.
3. `StartDate` and `EndDate` are required on AdvancedSearch even when CycleId is set.
4. CycleId is a compound string: `44~1/1/2025 12:00:00 AM~12/31/2026 11:59:59 PM`. NOT just `44`.
5. CategoryType for expenses is `Expenditures` (plural). `Expense` silently returns 0 rows.
6. Parameter `CommiteeReportId` is mis-spelled missing the second `t`. Sending the correct spelling silently does nothing.
7. Dates round-trip as `/Date(ms)/`. Parse before returning.
8. `EntityLastName` has embedded HTML: `"Alston, Lela <br>(101817)"`. Strip the `<br>(...)`.
9. `Page` enum is entity-type-specific. Page=20 means "contributions" for candidates (1), but PACs (2) use 30–36. Match the Page range to the entity type.
10. `GetData` autocomplete needs ≥6 character queries. Shorter = empty array.
11. Content-Type must be `application/x-www-form-urlencoded`. Sending JSON body returns 200 with empty data.
12. Cloudflare's `__cf_bm` bot management can gate sustained crawling. Cache aggressively, identify our UA.

The full reverse-engineering doc lives in `~/Documents/development/az-campaign-finance/reference/seethemoney_api_reference.md`.

## MCP Tools exposed

- `sos_lookup(query)` — autocomplete entity search (≥6 chars)
- `sos_get_committee(id, cycle?)` — committee profile + recent transactions
- `sos_committee_transactions(id, page?, cycle?)` — all transactions for a committee
- `sos_search_transactions(filters)` — full AdvancedSearch wrapper
- `sos_list_by_type(type, cycle?)` — browse PACs/candidates/parties/etc
- `sos_vrka_search(filters)` — Prop 211 VRKA filings
- `sos_committee_reports(id)` — filed reports for a committee

## Disclaimer policy

Every response (REST and MCP) MUST include a "not authoritative" disclaimer pointing to seethemoney.az.gov. Non-negotiable.
