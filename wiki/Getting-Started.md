# Getting Started

Two paths: use the MCP server in your AI tools, or hit the REST API directly with curl. They're the same data; the MCP is just structured for AI consumption.

## Option A — Add to Claude Code

```bash
claude mcp add --scope user --transport http arizona-campaign-finance \
  https://sos.cactus.watch/mcp
```

Restart Claude Code. Verify with:
```bash
claude mcp list
```

You'll get 7 new tools: `sos_lookup`, `sos_get_committee`, `sos_committee_transactions`, `sos_search_transactions`, `sos_list_by_type`, `sos_vrka_search`, `sos_committee_reports`.

## Option B — Add to Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or the equivalent on Windows/Linux:

```json
{
  "mcpServers": {
    "arizona-campaign-finance": {
      "url": "https://sos.cactus.watch/mcp"
    }
  }
}
```

Quit and relaunch Claude Desktop.

## Option C — Cursor / Cline / other MCP clients

Same URL, same Streamable HTTP transport. Wherever your client lets you add a remote MCP server, drop in `https://sos.cactus.watch/mcp`.

## Option D — Just curl

No client at all. The REST API is fully public:

```bash
curl "https://sos.cactus.watch/api/sos/lookup?q=vanderwey"
```

## First query — five things to try

### 1. Find an entity by name

```
sos_lookup(query="vanderwey")
```
Returns matching candidates, donors, PACs. Note: the upstream requires ≥6 characters or it returns nothing.

### 2. Pull every contribution by a person

```
sos_search_transactions(donor_name="Vanderwey", cycle=2024)
```
Returns 21 records (verified) — every committee that received money from a Vanderwey in 2024.

### 3. Top IE spending from PACs

```
sos_search_transactions(
  category="IndependentExpenditures",
  filer_type_id=2,
  cycle=2026
)
```
Returns Independent Expenditure transactions filed by PACs in the 2026 cycle.

### 4. List every PAC in a cycle

```
sos_list_by_type(type="PAC", cycle=2026)
```
Returns all registered PACs with their cycle income, expense, IE, and cash balance.

### 5. Browse VRKA (Prop 211) filings

```
sos_vrka_search(cycle=2026)
```
Returns the list of committees that filed VRKA reports in the 2026 cycle. **Note:** VRKA returns filing records (committee + report UUID + filing date), not transactions. See [VRKA and Prop 211](VRKA-and-Prop-211).

## Next steps

- Read [Examples and Recipes](Examples) for real-world investigations
- Read [SeeTheMoney API Quirks](SeeTheMoney-API-Quirks) if you're considering self-hosting
- Read [Why MCP?](Why-MCP) if you're convincing someone (or yourself) to use this instead of curl
