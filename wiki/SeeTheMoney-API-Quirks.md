# SeeTheMoney API Quirks

This page documents every gotcha in the upstream `seethemoney.az.gov` API and how this proxy absorbs them. Useful if you're considering self-hosting, contributing, or building your own client.

The full reverse-engineering reference (670 lines, all endpoints, every parameter) lives in the [az-campaign-finance project](https://github.com/Logvin/az-campaign-finance/blob/main/reference/seethemoney_api_reference.md).

## Quick architecture

`seethemoney.az.gov` is an ASP.NET MVC 5.2 app behind Cloudflare. Its UI is built on DataTables.js, and the data backing those tables comes from undocumented JSON endpoints. There's no published API, no key, no rate limit, no auth — but you have to know how the DataTables protocol works to talk to it.

Two endpoint patterns:

### Pattern A — DataTables server-side endpoint
```
POST /Reporting/{Endpoint}/?<filter-params-in-query-string>
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest

draw=1
&columns[0][data]=TransactionDate&columns[0][searchable]=true&...
&order[0][column]=0&order[0][dir]=desc
&start=0&length=10
&search[value]=
```

Returns:
```json
{
  "draw": "1",
  "recordsTotal": 21,
  "recordsFiltered": 21,
  "data": [ {...}, {...} ]
}
```

### Pattern B — Simple GET lookup
```
GET /Reporting/{Lookup}?Id=123
```
Returns small JSON.

## The 13 gotchas

### 1. Filter params go in the URL, body holds DataTables state

The single biggest timesink reverse-engineering this. Filters like `CycleId`, `JurisdictionId`, `ContributorName` go in the **query string**. The DataTables pagination bits (`draw`, `columns[N]`, `start`, `length`, `order`, `search`) go in the **body**.

Putting filters in the body returns `{"data":[],"recordsTotal":0}`.

### 2. Position=Support is required on AdvancedSearch

Leave off `Position=Support` and every AdvancedSearch query returns zero records, regardless of other filters. There's no error, just empty. Set it always; for opposition data, use `Position=Opposition`.

### 3. StartDate and EndDate are required on AdvancedSearch

Picking a `CycleId` alone is not enough. The UI auto-populates `StartDate` and `EndDate` whenever a cycle is selected; we do the same in the proxy.

### 4. CycleId is a compound string

`CycleId=44` returns nothing. The correct form is `CycleId=44~1/1/2025 12:00:00 AM~12/31/2026 11:59:59 PM` — the cycle ID, the start datetime, and the end datetime, separated by `~`. URL-encoding `~` as `%7E` works; spaces must be `+` or `%20`.

The proxy hardcodes the known cycles in `cycles.ts` — see [Cycles and Entity Types](Cycles-and-Entity-Types).

### 5. CategoryType=Expense silently returns 0 rows

The expense-side category is `Expenditures` (plural). `Expense` is silently wrong.

### 6. The CommiteeReportId typo

The query parameter is `CommiteeReportId` — missing the second `t`. Sending the correct spelling silently does nothing. Don't fix it.

### 7. Dates round-trip as MS-JSON

```json
"TransactionDate": "/Date(1735801200000)/"
```

That's `Date(epoch_milliseconds)`. The proxy parses these into ISO 8601 in `normalize.ts`:

```typescript
function parseMSDate(value: string): string | null {
  const m = value.match(/Date\((\d+)/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10)).toISOString();
}
```

### 8. EntityLastName has embedded HTML

```
"EntityLastName": "Alston, Lela <br>(101817)"
```

The display name is suffixed with the EntityID in parens, separated by a `<br>` tag. The proxy strips it:

```typescript
function stripEntityHTML(value: string): { name: string, id: number | null } {
  const idMatch = value.match(/\((\d+)\)\s*$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : null;
  const name = value.replace(/<br[^>]*>/gi, " ")
                    .replace(/\(\d+\)\s*$/, "")
                    .replace(/\s+/g, " ").trim();
  return { name, id };
}
```

### 9. The Page enum is entity-type-specific

`Page=20` means "contributions" for a Candidate (range 20–24), but PACs use 30–36, Parties 40–42, Organizations 50–54, IE 60–62, etc.

If you mix-and-match (Page=20 against an entity_type=2 PAC), you'll get inconsistent results. The proxy maps entity type → default page in `entities.ts`.

See [Cycles and Entity Types](Cycles-and-Entity-Types) for the full enum.

### 10. GetData autocomplete needs ≥6 characters

The autocomplete endpoint silently returns an empty array for queries shorter than 6 chars. The proxy mirrors this requirement and rejects shorter queries with a clear error.

### 11. Content-Type must be application/x-www-form-urlencoded

Sending JSON bodies returns 200 with empty data. The proxy uses `URLSearchParams` to ensure correct encoding.

### 12. ReceivedFromOrPaidTo is a pipe-delimited blob

```
"ReceivedFromOrPaidTo": "1927548|Freeport-Mcmoran Inc. Az Pac #1139|||48|2|1927548|||Freeport-Mcmoran Inc. Az Pac #1139"
```

The format is `{nameId}|{displayName}|{middleName}|{firstName}|{entityTypeId}|{transactionGroup}|{nameGroupId}|||{displayName}`. The proxy decodes this in `normalize.ts → decodePipeBlob()`.

### 13. Cloudflare bot management

The upstream is fronted by Cloudflare with `__cf_bm` bot management. Sustained high-rate polling will get challenged. The proxy:

- Uses a polite identifying User-Agent (`sos-mcp/0.1 (+https://github.com/az-civic-tools/sos-mcp; alex@log.vin)`)
- Caches GET responses in KV for 30 minutes
- Sets `X-Requested-With: XMLHttpRequest` to match UI behavior

If you self-host and run sustained crawls, expect the bot challenge. Drive via headless browser (Playwright/Puppeteer) for export-tier scraping if you must.

## What this means for self-hosting

If you fork this for another state or another quirky upstream, the patterns to replicate are:

1. **Centralize the gotchas** in one client module (`seethemoney.ts`)
2. **Normalize once** at the boundary, not in every consumer
3. **Cache aggressively** to be a polite citizen
4. **Identify your traffic** with a User-Agent that includes a contact

The proxy approach (vs. mirroring) trades freshness for simplicity. For data that changes constantly (campaign filings happen weekly to monthly), live proxy is the right shape.
