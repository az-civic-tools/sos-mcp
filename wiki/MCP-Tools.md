# MCP Tools

Reference for all 7 tools exposed by the SOS MCP server. Every response includes a disclaimer footer pointing to seethemoney.az.gov as the authoritative source.

## sos_lookup

Find an entity (candidate, donor, PAC, party, etc.) by name.

| Input | Type | Notes |
|-------|------|-------|
| `query` | string, ≥6 chars | Upstream silently returns nothing for shorter queries |

**Returns:** matching entities with `entity_id`, `type`, `display_name`.

**Example:**
```
sos_lookup(query="vanderwey")
→
[Candidate] Vanderwey, John — entity_id=12345
[Individual] Nicholas Vanderwey 5901 E... — entity_id=2986992
[Individual] Michael Vanderwey 5901 E... — entity_id=2983454
...
```

---

## sos_get_committee / sos_committee_transactions

Pull all transactions for a committee or candidate by EntityID.

| Input | Type | Default |
|-------|------|---------|
| `entity_id` | int | required |
| `type` | "Candidate" \| "PAC" \| "Party" \| "Organization" \| "IE" \| "BallotMeasure" | "Candidate" |
| `cycle` | int (e.g. 2026) | 2026 |
| `page` | int 1–99 | type default (Candidate=24, PAC=36, Party=42, etc.) |
| `start` | int | 0 |
| `length` | int 1–200 | 50 |

The `page` parameter selects which transaction slice to return. Page numbers are entity-type-specific:

| Type | Detail page range |
|------|-------------------|
| Candidate | 20–24 |
| PAC | 30–36 |
| Party | 40–42 |
| Organization | 50–54 |
| IE | 60–62 |
| Ballot Measure | 70–72 |

The default for each type is the "everything" page (24, 36, 42, etc.). See [Cycles and Entity Types](Cycles-and-Entity-Types) for the full Page enum.

**Returns:** normalized transactions with date (ISO), amount, type, committee, counterparty (name, employer, occupation, location), position (Supported/Opposed for IE), memo, and a `raw` field with the full upstream row.

---

## sos_search_transactions

The big one. Wrapper around `AdvancedSearch` with all filters exposed.

| Input | Type | Default |
|-------|------|---------|
| `category` | "Income" \| "Expenditures" \| "IndependentExpenditures" \| "BallotMeasures" | "Income" |
| `cycle` | int | 2026 |
| `position` | "Support" \| "Opposition" | "Support" |
| `donor_name` | string (partial) | — |
| `vendor_name` | string (partial) | — |
| `employer` | string (partial) | — |
| `occupation` | string (partial) | — |
| `city` | string | — |
| `state` | string (2-letter) | — |
| `filer_name` | string (partial) | — |
| `filer_id` | int | — |
| `filer_type_id` | int 1–8 (1 cand, 2 PAC, 3 party, 4 officeholder) | — |
| `low_amount` | int | — |
| `high_amount` | int | — |
| `start` | int | 0 |
| `length` | int 1–200 | 50 |

**Common patterns:**

- *Every donation by a person:* `donor_name="Vanderwey"`
- *Every payment to a vendor:* `vendor_name="Sandpiper", category="Expenditures"`
- *IE opposition spending from PACs:* `category="IndependentExpenditures", filer_type_id=2, position="Opposition"`
- *High-dollar contributions:* `low_amount=10000`
- *Donors at a specific employer:* `employer="Grand View Dairy"`

**Note:** the upstream sorts by transaction date desc by default. To find largest amounts, fetch a wide page (`length=200`) and sort client-side, or use `low_amount` to filter.

---

## sos_list_by_type

Browse every entity of a given type for a cycle.

| Input | Type | Default |
|-------|------|---------|
| `type` | "Candidate" \| "PAC" \| "Party" \| "Organization" \| "IE" \| "BallotMeasure" | required |
| `cycle` | int | 2026 |
| `start` | int | 0 |
| `length` | int 1–200 | 50 |

**Returns:** each row has entity_id, display_name, committee_name, office, party, income, expense, IE support/opposition, cash balance.

Useful for surveying the field: "what PACs exist", "every candidate for State Rep", etc.

---

## sos_vrka_search

Prop 211 Voter's Right To Know Act filings.

| Input | Type | Default |
|-------|------|---------|
| `cycle` | int | 2026 |
| `filer_name` | string | — |
| `filer_id` | int | — |
| `start` | int | 0 |
| `length` | int 1–200 | 50 |

**IMPORTANT — this returns FILINGS, not transactions.** Each row is `{ committee_id, committee_name, report_id (UUID), filed_at }`. To see the actual original-source contributors disclosed in a VRKA filing, you need to either:

- Use `sos_search_transactions` with `category="IndependentExpenditures"`
- Fetch the raw PDF from azsos.gov using the `report_id`

See [VRKA and Prop 211](VRKA-and-Prop-211) for context.

---

## sos_committee_reports

List the campaign-finance reports a committee has filed.

| Input | Type | Default |
|-------|------|---------|
| `filer_id` | int | required |
| `cycle` | int | 2026 |
| `start` | int | 0 |
| `length` | int 1–200 | 50 |

**Returns:** report name, report type, filing date, period begin/end, total income/expense, cash on hand.

Useful for verifying compliance ("did this PAC file all its required quarterly reports") or pulling raw filing metadata.

---

## Common patterns across all tools

- **Cycle defaulting:** all tools default to cycle 2026. Pass `cycle=2024` etc. for historical data.
- **Pagination:** `start` is 0-based offset, `length` is page size. Tool responses include `total` so you know when to stop.
- **Caching:** GET-shaped responses are cached in KV for 30 minutes. Pass `nocache=1` to the REST equivalents to bypass.
- **Disclaimer:** every response carries the "not authoritative" footer. Don't strip it.
- **Raw data:** detail responses include a `raw` field with the original SeeTheMoney row for power users.
