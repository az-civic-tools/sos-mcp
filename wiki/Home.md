# SOS MCP Wiki

Welcome to the SOS MCP wiki — comprehensive docs for the free, open-source MCP server and REST proxy in front of `seethemoney.az.gov`, Arizona's official campaign finance portal.

**Live at:** https://sos.cactus.watch

## What's inside

### Getting started
- **[Getting Started](Getting-Started)** — install, first query, both REST and MCP
- **[Why MCP?](Why-MCP)** — what an MCP is, why it beats curling, real token-savings numbers

### Reference
- **[MCP Tools](MCP-Tools)** — full reference for all 7 tools with input schemas and example responses
- **[REST API](REST-API)** — full reference for every endpoint
- **[Cycles and Entity Types](Cycles-and-Entity-Types)** — known cycle IDs, entity type IDs, page enums

### Going deeper
- **[SeeTheMoney API Quirks](SeeTheMoney-API-Quirks)** — every gotcha in the upstream API and how this proxy absorbs it
- **[VRKA and Prop 211](VRKA-and-Prop-211)** — Voter's Right To Know Act filings — what the data actually contains
- **[Examples and Recipes](Examples)** — real-world investigations: "every donation by X", "vendor network mapping", "$X+ contributors only"

### Operations
- **[Architecture](Architecture)** — how the Worker is structured, why we proxy instead of mirror
- **[Self-Hosting](Self-Hosting)** — fork and run your own copy (e.g., for another state)
- **[Contributing](Contributing)** — how to help

---

## At a glance

```
┌──────────────────────────────────────────────────────────────────┐
│  Claude Desktop / Claude Code / Cursor / Cline                  │
│                          │                                       │
│              MCP request │ (Streamable HTTP)                    │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  sos.cactus.watch (Cloudflare Worker)                   │   │
│  │  ─ Translates clean inputs → DataTables POST           │   │
│  │  ─ Strips HTML, parses /Date(ms)/, decodes pipe blobs  │   │
│  │  ─ KV cache, 30 min TTL                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                       │
│            DataTables    │ POST + form-urlencoded               │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  seethemoney.az.gov (AZ Secretary of State)             │   │
│  │  ─ ASP.NET MVC 5.2 + DataTables.js                      │   │
│  │  ─ Open data, 1998–present                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Disclaimer

This proxy is a community tool. It is **not authoritative**. For court filings, formal complaints, or any official use, verify directly against [seethemoney.az.gov](https://seethemoney.az.gov).

## License

[MIT](https://github.com/az-civic-tools/sos-mcp/blob/main/LICENSE) — fork it, run it, change it. No attribution required (a star helps).
