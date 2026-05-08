# Cycles and Entity Types

Reference data tables. The proxy hardcodes these because the upstream doesn't expose them via API.

## Election cycles

CycleId is a compound string `{id}~{startDate}~{endDate}`. Pass the year as `cycle=2026` and the proxy handles the rest.

| Cycle Year | CycleId |
|-----------:|---------|
| 2026 | `44~1/1/2025 12:00:00 AM~12/31/2026 11:59:59 PM` |
| 2024 | `43~1/1/2023 12:00:00 AM~12/31/2024 11:59:59 PM` |
| 2022 | `39~1/1/2021 12:00:00 AM~12/31/2022 11:59:59 PM` |
| Recall - Fann SD1 | `40~7/1/2021 12:00:00 AM~3/31/2022 11:59:59 PM` |
| 2020 | `30~1/1/2019 12:00:00 AM~12/31/2020 11:59:59 PM` |
| 2018 | `29~11/9/2016 12:00:00 AM~12/31/2018 11:59:59 PM` |
| 2016 | `28~11/25/2014 12:00:00 AM~11/8/2016 11:59:59 PM` |
| 2014 | `27~11/27/2012 12:00:00 AM~11/24/2014 11:59:59 PM` |
| 2012 | `26~11/23/2010 12:00:00 AM~11/26/2012 11:59:59 PM` |
| 2010 | `25~11/25/2008 12:00:00 AM~11/22/2010 11:59:59 PM` |
| 2008 | `8~...` |
| 2006 | `7~...` |
| 2004 | `6~...` |
| 2002 | `5~...` |
| 2000 | `4~...` |
| 1998 | `3~...` |

`GET /api/sos/cycles` returns this list live.

## Entity types

Returned in some responses as `EntityTypeId` / `entityTypeId`.

| Type ID | Name | Default detail Page |
|---------|------|---------------------|
| 1 | Candidate | 24 |
| 2 | PAC (Political Action Committee) | 36 |
| 3 | Political Party | 42 |
| 4 | Organization | 54 |
| 5 | Independent Expenditure committee | 62 |
| 6 | Ballot Measure Committee | 72 |
| 7 | Individual Contributor | 80 |
| 8 | Vendor | 90 |

The MCP tools accept these as friendly names: `Candidate`, `PAC`, `Party`, `Organization`, `IE`, `BallotMeasure`, `Individual`, `Vendor`.

## Page enum (detail view selector)

The `Page` parameter on `GetNEWDetailedTableData` selects which transaction slice to return for an entity. Page numbers are entity-type-specific.

| Range | Meaning (inferred) |
|-------|-------------------|
| 1–8 | Overview / summary widgets |
| 10, 11 | Search/autocomplete result pages |
| 20–24 | Candidate transaction slices |
| 30–36 | PAC transaction slices |
| 40–42 | Party transaction slices |
| 50–54 | Organization transaction slices |
| 60–62 | Independent Expenditure transaction slices |
| 70–72 | Ballot Measure transaction slices |
| 80 | Individual contributor transaction slices |
| 90 | Vendor transaction slices |

Within each range, lower numbers = specific slices (income only, expenses only, IE in/out), highest = "everything for this entity".

For a candidate (entity_id=101817, Lela Alston, 2025–2026 cycle), observed:

| Page | recordsTotal | First-row TransactionType |
|------|--------------|---------------------------|
| 20 | 5 | "Contributions from PACs" |
| 21 | 3 | "Operating Expense - Pay Cash/Check" |
| 22 | 0 | — |
| 23 | 0 | — |
| 24 | 8 | "Contributions from PACs" (combined) |

The proxy defaults to the highest page in each range when you don't specify. Override with `page=` in the REST API or `page` in the MCP tool.

## CategoryType (AdvancedSearch)

| Value | Notes |
|-------|-------|
| `Income` | Contributions / receipts |
| `Expenditures` | Disbursements (note: plural — `Expense` returns 0 rows) |
| `IndependentExpenditures` | IE in support or opposition |
| `BallotMeasures` | Ballot measure related |
| `Reports` | Filed campaign-finance reports (used by `ReportSearch`) |

## Position (AdvancedSearch)

| Value | Notes |
|-------|-------|
| `Support` | Contributions, IE in support |
| `Opposition` | IE in opposition |

This must always be set on AdvancedSearch — the upstream returns zero records if it's missing.

## FilerTypeId (AdvancedSearch)

| ID | Name |
|----|------|
| 1 | Candidate |
| 2 | PAC |
| 3 | Party |
| 4 | Officeholder |

Useful to scope a search to "PAC-filed transactions only", etc.

## OfficeTypeId

| ID | Scope |
|----|-------|
| 1 | Statewide |
| 2 | Legislative |
| 3 | Local |

## PartyId

The most common values:

| ID | Party |
|----|-------|
| 30 | Republican |
| 20 | Democratic |
| 10 | Libertarian (varies) |

Other party IDs exist but aren't documented. Use `sos_lookup` to find specific party committees.
