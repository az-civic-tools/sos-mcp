# REST API

Every MCP tool has an equivalent REST endpoint. No key, no auth, just fetch.

Base: `https://sos.cactus.watch`

## GET /api/sos/cycles

List known election cycles with their compound CycleId strings.

```bash
curl "https://sos.cactus.watch/api/sos/cycles"
```

Returns:
```json
{
  "cycles": [
    { "year": 2026, "cycleId": "44~1/1/2025 12:00:00 AM~12/31/2026 11:59:59 PM" },
    { "year": 2024, "cycleId": "43~..." },
    ...
  ],
  "disclaimer": "..."
}
```

## GET /api/sos/lookup

Autocomplete entity search.

| Param | Notes |
|-------|-------|
| `q` | Search string, ≥6 chars (upstream requirement) |

```bash
curl "https://sos.cactus.watch/api/sos/lookup?q=vanderwey"
```

## GET /api/sos/list/:type

Browse entities of a type for a cycle.

| Path | Notes |
|------|-------|
| `:type` | Candidate, PAC, Party, Organization, IE, BallotMeasure |

| Query | Default |
|-------|---------|
| `cycle` | 2026 |
| `start` | 0 |
| `length` | 50 |

```bash
curl "https://sos.cactus.watch/api/sos/list/PAC?cycle=2026&length=100"
```

## GET /api/sos/committee/:id

Pull committee transactions.

| Path | Notes |
|------|-------|
| `:id` | EntityID |

| Query | Default |
|-------|---------|
| `cycle` | 2026 |
| `type` | Candidate |
| `page` | type default |
| `start` | 0 |
| `length` | 50 |

```bash
curl "https://sos.cactus.watch/api/sos/committee/101878?cycle=2026&type=PAC"
```

## GET /api/sos/reports/:id

List filed reports for a committee.

```bash
curl "https://sos.cactus.watch/api/sos/reports/101878?cycle=2026"
```

## GET /api/sos/search

Full AdvancedSearch wrapper.

| Query | Default |
|-------|---------|
| `category` | Income |
| `cycle` | 2026 |
| `position` | Support |
| `donor` | (none) |
| `vendor` | (none) |
| `employer` | (none) |
| `occupation` | (none) |
| `city` | (none) |
| `state` | (none) |
| `filer` | filer name (partial) |
| `filer_id` | exact |
| `filer_type_id` | 1 cand, 2 PAC, 3 party, 4 officeholder |
| `min` | LowAmount |
| `max` | HighAmount |
| `start_date` | YYYY-MM-DD (overrides cycle bounds) |
| `end_date` | YYYY-MM-DD |
| `start` | 0 |
| `length` | 50 |
| `nocache` | `1` to bypass KV cache |

```bash
# Top IE Opposition spends from PACs in 2026
curl "https://sos.cactus.watch/api/sos/search?category=IndependentExpenditures&filer_type_id=2&position=Opposition&cycle=2026&length=20"

# All Vanderwey contributions in 2024
curl "https://sos.cactus.watch/api/sos/search?donor=Vanderwey&cycle=2024"

# All payments to Sandpiper
curl "https://sos.cactus.watch/api/sos/search?vendor=Sandpiper&category=Expenditures&cycle=2026"

# Donors employed by Grand View Dairy
curl "https://sos.cactus.watch/api/sos/search?employer=Grand+View+Dairy&cycle=2024"
```

## GET /api/sos/vrka

VRKA (Prop 211) filings.

| Query | Default |
|-------|---------|
| `cycle` | 2026 |
| `filer` | filer name (partial) |
| `filer_id` | exact |
| `donor` | (none, may be no-op for VRKA) |
| `min` | (none) |
| `start` | 0 |
| `length` | 50 |

```bash
curl "https://sos.cactus.watch/api/sos/vrka?cycle=2026"
```

Returns FILING records (committee, report UUID, filed_at). See [VRKA and Prop 211](VRKA-and-Prop-211).

## Response shape

All endpoints return JSON with:
- The query echoed back (for clarity)
- A `rows` or `results` or domain-specific array
- A `total` count when paginated
- A `disclaimer` field — don't strip it

Errors return `{ "error": "...", ... }` with appropriate HTTP status.

## Caching

All GET responses are cached in the Worker's KV namespace for 30 minutes. Add `?nocache=1` to bypass for live data.

The cache key is built from the path and all query parameters. Identical queries within the TTL hit the cache instantly.
