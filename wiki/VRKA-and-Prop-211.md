# VRKA and Prop 211

The Voter's Right To Know Act (VRKA), passed by AZ voters as Prop 211 in 2022, requires committees that spend $50K+ on AZ campaigns within a calendar year to disclose the original source of every contributor of $5K+ that ultimately funded those expenditures. The intent: pierce the dark-money veil between donors and ads.

A.R.S. § 16-971 through § 16-979 codify the rules. Implementation lives in the Arizona Citizens Clean Elections Commission's regulations (R2-20-801 et seq.).

## What `sos_vrka_search` returns

The upstream `VRKASearch` endpoint returns **filing records**, not transaction-level disclosures. Each row is:

| Field | Type | Notes |
|-------|------|-------|
| `committee_id` | int | EntityID of the committee that filed |
| `committee_name` | string | Display name |
| `report_id` | string (UUID) | The filing's report identifier |
| `filed_at` | ISO 8601 | When the report was submitted |

So a query for `cycle=2026` returns "every committee that filed a VRKA report in this cycle, and when". It does **not** return the original-source contributor data inside each filing.

## How to get the contributor data

Three options, ordered roughly by ease:

### 1. Use `sos_search_transactions` with the appropriate filter

The contributor data inside a VRKA filing usually corresponds to IE-category transactions on the underlying committee. Run:

```
sos_search_transactions(
  category="IndependentExpenditures",
  filer_id=<committee_id from VRKA result>,
  cycle=...
)
```

This won't be a perfect 1:1 match (VRKA reports include original-source pass-through donors that aren't on the underlying transaction record), but it's the closest structured data.

### 2. Fetch the raw PDF from azsos.gov

The `report_id` UUID maps to a public URL pattern at azsos.gov. The endpoint to discover the path prefix is `POST /Reporting/GetPublicReportsPath/`. Once you have the prefix, the URL pattern is roughly:

```
https://azsos.gov/<path>/<report_id>.pdf
```

This isn't proxied yet by the MCP. To pull the PDF, you'd need to:

1. Hit `GetPublicReportsPath` to get the current path prefix
2. Construct the full URL with the `report_id`
3. Download and parse the PDF

The PDFs include the original-source contributor list in a structured format.

### 3. Local archive

For Alex's own committees of interest, local copies of VRKA filings live in `~/Documents/development/az-campaign-finance/vrka_filings/` (currently AZFRG only). Worth expanding.

## Why VRKA matters

Prop 211 was designed to expose money laundering through 501(c)(4)s and shell PACs. Before VRKA, a committee could receive a $1M contribution from "Americans for Freedom Inc." with no way to trace where that money actually came from. After VRKA, that committee must disclose every original $5K+ source that contributed to the funding.

The CEC handles enforcement. Common failure modes:

- **Late filings.** VRKA is due within 5 business days of crossing the $50K threshold (or for IEs, before the IE).
- **Missing original-source disclosures.** Reports list quarterly contributors but omit the chain back to the actual donor.
- **No filing at all.** Some committees that have crossed the threshold simply never file.
- **Partial filings.** Reports that disclose some but not all $5K+ contributors.

The az-campaign-finance project tracks specific compliance failures. See:
- `vrka_filings/INDEX.md`
- `worker-vrka-watch/` — Worker that polls every 3 hours and emails on new filings
- `cec_filings/` — Outbound complaints to the CEC

## Known VRKA filers (2026 cycle)

As of the most recent check:

- Our Voice Our Vote Arizona PAC
- Solutions for Arizona
- Arizona for Abortion Access
- Roberts (committee name)
- Arizona Taxpayers for a Secure Border
- Organize Arizona!
- Open Society Action Fund
- AZ LD25 Democrats
- Residents for Accountability
- Responsible Leadership for AZ
- Chispa AZ PAC

11 total. Run `sos_vrka_search(cycle=2026)` for the live list.

## Known *should-be-filing-but-isn't* committees

Several committees have crossed the $50K threshold but haven't filed VRKA reports. See `~/Documents/development/az-campaign-finance/research/sos_committees/vrka_gap_analysis_2026-04-23.md` for the working list.

These gaps are the basis for several pending CEC complaints — see [Disclosure Watchdog](https://github.com/az-civic-tools/disclosure-watchdog) and the AZ Campaign Finance project.

## How to report a missing filing

If you find a committee that should have filed VRKA but didn't:

1. Verify the committee's IE spending crossed $50K in the calendar year (use `sos_committee_transactions` filtered to IE)
2. Verify no VRKA filing exists (use `sos_vrka_search(filer_id=...)`)
3. File a complaint with the AZ CEC under R2-20-808

Templates and prior complaints live in the [az-campaign-finance project](https://github.com/Logvin/az-campaign-finance/tree/main/complaints).
