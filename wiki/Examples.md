# Examples and Recipes

Real-world investigative queries you can run today. Each example shows the MCP tool call, the equivalent curl, and what to expect back.

## Find every donation by a specific person

```
sos_search_transactions(donor_name="Vanderwey", cycle=2024)
```

```bash
curl "https://sos.cactus.watch/api/sos/search?donor=Vanderwey&cycle=2024"
```

Returns 21 records. First row: $130 to Salt River Valley Water Users Assn PIC, 2024-10-03, from Nicholas Vanderwey, Phoenix AZ, Self Employed Dairy Farmer at Grand View Dairy LLC.

## Top PAC IE spends in a cycle

```
sos_search_transactions(
  category="IndependentExpenditures",
  filer_type_id=2,
  cycle=2026,
  length=200
)
```

Then sort the response by amount descending. Top 5 in 2026 (Support side):

| Date | Amount | PAC | Vendor |
|------|-------:|-----|--------|
| 2025-06-02 | $352,000 | Turning Point PAC | 1Ten LLC |
| 2025-12-04 | $300,830 | Building A Better Arizona | MHB Media |
| 2026-01-02 | $200,321 | Building A Better Arizona | MHB Media |
| 2025-12-09 | $55,500 | Win Arizona | Red Eagle Media |
| 2025-02-11 | $50,000 | Building A Better Arizona | DDI Media |

## Every payment to a vendor across all committees

```
sos_search_transactions(
  vendor_name="Sandpiper",
  category="Expenditures",
  cycle=2026
)
```

Maps a vendor's footprint across the entire AZ committee landscape — useful for tracking consultant networks.

## High-dollar contributors only

```
sos_search_transactions(
  cycle=2026,
  low_amount=10000
)
```

Anyone giving $10K+. Combine with `donor_name` or `employer` to narrow.

## Donors employed at a specific company

```
sos_search_transactions(
  employer="Grand View Dairy",
  cycle=2024
)
```

Useful for "who at this company gave to whom".

## Compare two PACs side-by-side

```
sos_committee_transactions(entity_id=101878, type="PAC", cycle=2026)
sos_committee_transactions(entity_id=101981, type="PAC", cycle=2026)
```

Then compare totals, top vendors, top donors.

## VRKA filings in a cycle

```
sos_vrka_search(cycle=2026)
```

Returns FILING records (committee + report UUID + filing date). 11 filings in 2026 as of writing — Our Voice Our Vote AZ PAC, Solutions for AZ, Arizona for Abortion Access, Open Society Action Fund, Chispa AZ PAC, etc.

To see what's *inside* a VRKA filing, fetch the PDF directly from azsos.gov using the report UUID, or use `sos_search_transactions` with `category="IndependentExpenditures"`.

## Identify suspicious patterns

### Vendors that are also LLCs (potential pass-through)

Search expenditures, look for vendor names ending in "LLC":

```
sos_search_transactions(
  category="Expenditures",
  cycle=2026,
  vendor_name="LLC"
)
```

(Partial match, will return all vendors with "LLC" in their name.)

### Out-of-state contributors

```
sos_search_transactions(
  cycle=2026,
  state="CA"
)
```

Filter to non-AZ donors. Helpful for VRKA % calculations.

### Common donor across multiple PACs

Search for a donor name; look at distinct `committee.id` values in the response. If a single person funds many committees, that's a network.

## Self-survey: every PAC in the current cycle

```
sos_list_by_type(type="PAC", cycle=2026, length=200)
```

Returns every registered PAC with its income, expense, IE, and cash on hand for the cycle. Useful for "what PACs do I not know about yet".

## Compliance check: did a committee file all its reports?

```
sos_committee_reports(filer_id=101878, cycle=2026)
```

Returns every filed report with periods. Cross-reference against the AZ filing schedule to see if anything was missed.

## Composing investigations

A typical multi-step investigation:

1. **Find the entity:** `sos_lookup(query="building a better arizona")` → entity_id
2. **Profile its money:** `sos_committee_transactions(entity_id=..., cycle=2026)`
3. **Map the vendors:** for each unique vendor in the results, `sos_search_transactions(vendor_name=..., category="Expenditures")` to see who else paid them
4. **Map the donors:** for each unique donor, `sos_search_transactions(donor_name=..., category="Income")` to see who else they gave to
5. **Check VRKA compliance:** `sos_vrka_search(filer_id=...)` to see if they filed when they crossed the threshold

That's the standard investigative loop. The MCP makes each step a single tool call instead of a curl + parse + normalize cycle.
