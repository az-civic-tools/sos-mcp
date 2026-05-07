export const LANDING_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AZ SOS Campaign Finance — MCP &amp; REST proxy</title>
<meta name="description" content="Free MCP server and REST proxy for the Arizona Secretary of State campaign finance portal (SeeTheMoney + VRKA). Plug it into Claude, Cursor, Cline, or just curl." />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='28'%3E%F0%9F%92%B0%3C/text%3E%3C/svg%3E" />
<style>
  :root {
    --bg: #0f1218;
    --bg-2: #161b25;
    --ink: #e8e1d3;
    --ink-soft: #93a0b8;
    --accent: #ffb347;
    --accent-2: #6ee7b7;
    --rule: #2a3344;
    --code-bg: #060810;
    --code-ink: #e8e1d3;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background:
      radial-gradient(ellipse 80% 60% at 30% 0%, rgba(255, 179, 71, 0.06), transparent 70%),
      radial-gradient(ellipse 60% 50% at 80% 100%, rgba(110, 231, 183, 0.05), transparent 70%),
      var(--bg);
    color: var(--ink);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .wrap { max-width: 820px; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
  .stamp {
    display: inline-flex; align-items: center; gap: 0.5rem;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 0.25rem 0.75rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .stamp::before {
    content: ""; width: 6px; height: 6px; background: var(--accent); border-radius: 50%;
    animation: pulse 2.5s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  h1 {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: clamp(2.4rem, 6vw, 3.8rem);
    line-height: 1.04;
    margin: 1rem 0 0.7rem;
    letter-spacing: -0.025em;
    font-weight: 700;
  }
  h1 .accent { color: var(--accent); }
  .lede {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 1.05rem;
    color: var(--ink-soft);
    max-width: 62ch;
  }
  hr.rule { border: none; border-top: 1px solid var(--rule); margin: 2.4rem 0 1.4rem; }
  h2 {
    color: var(--accent-2);
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 2.2rem 0 0.7rem;
  }
  h2::before { content: "// "; opacity: 0.6; }
  pre, code { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.85rem; }
  pre {
    background: var(--code-bg);
    color: var(--code-ink);
    padding: 1.1rem 1.2rem;
    border: 1px solid var(--rule);
    border-left: 2px solid var(--accent);
    overflow-x: auto;
    line-height: 1.6;
  }
  code:not(pre code) { background: var(--bg-2); padding: 0.1rem 0.4rem; color: var(--accent); }
  ul.routes { list-style: none; padding: 0; margin: 0.6rem 0; }
  ul.routes li {
    padding: 0.55rem 0; border-bottom: 1px dashed var(--rule);
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; align-items: baseline;
  }
  ul.routes li:last-child { border-bottom: none; }
  ul.routes code { background: transparent; padding: 0; color: var(--ink); }
  ul.routes .desc { color: var(--ink-soft); font-size: 0.86rem; text-align: right; }
  .tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.7rem; margin: 0.6rem 0; }
  .tool {
    padding: 0.85rem 1rem;
    background: var(--bg-2);
    border-left: 2px solid var(--accent-2);
  }
  .tool code { background: transparent; padding: 0; }
  .tool .name { color: var(--accent); font-size: 0.92rem; font-weight: 600; }
  .tool .desc { font-size: 0.85rem; color: var(--ink-soft); margin-top: 0.2rem; line-height: 1.45; }
  .disclaimer {
    background: var(--bg-2);
    border-left: 2px solid var(--accent);
    padding: 0.95rem 1.1rem;
    margin-top: 1.4rem;
    font-size: 0.86rem;
    color: var(--ink-soft);
  }
  footer {
    margin-top: 3rem; padding-top: 1.2rem;
    border-top: 1px solid var(--rule);
    color: var(--ink-soft); font-size: 0.84rem;
  }
  footer a { color: var(--accent-2); }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent); }
  a:hover { color: var(--ink); }
</style>
</head>
<body>
<main class="wrap">
  <span class="stamp">live · proxy · 2026</span>
  <h1>AZ SOS<br/>Campaign <span class="accent">Finance</span>.</h1>
  <p class="lede">
    Free MCP server and REST proxy for the Arizona Secretary of State campaign finance portal — SeeTheMoney + Prop 211 VRKA filings. AI-friendly. No auth. Rate-friendly via 30-min KV cache.
  </p>

  <hr class="rule" />

  <h2>Add to Claude Code</h2>
  <pre><code>claude mcp add --scope user --transport http arizona-campaign-finance \\
  https://sos.cactus.watch/mcp</code></pre>

  <h2>Add to Claude Desktop</h2>
  <pre><code>{
  "mcpServers": {
    "arizona-campaign-finance": {
      "url": "https://sos.cactus.watch/mcp"
    }
  }
}</code></pre>

  <h2>MCP Tools</h2>
  <div class="tools">
    <div class="tool"><div class="name">sos_lookup</div><div class="desc">Find an entity by name (≥6 chars).</div></div>
    <div class="tool"><div class="name">sos_get_committee</div><div class="desc">Committee profile by EntityID.</div></div>
    <div class="tool"><div class="name">sos_committee_transactions</div><div class="desc">All transactions for a committee.</div></div>
    <div class="tool"><div class="name">sos_search_transactions</div><div class="desc">Full AdvancedSearch — donor, vendor, employer, ZIP, amount range.</div></div>
    <div class="tool"><div class="name">sos_list_by_type</div><div class="desc">Browse all PACs / candidates / parties / IE / BMC for a cycle.</div></div>
    <div class="tool"><div class="name">sos_vrka_search</div><div class="desc">Prop 211 VRKA filings — original-source disclosures.</div></div>
    <div class="tool"><div class="name">sos_committee_reports</div><div class="desc">Filed campaign-finance reports for a committee.</div></div>
  </div>

  <h2>REST Endpoints</h2>
  <ul class="routes">
    <li><code>GET /api/sos/lookup?q=</code><span class="desc">Entity autocomplete</span></li>
    <li><code>GET /api/sos/list/:type</code><span class="desc">Browse by type + cycle</span></li>
    <li><code>GET /api/sos/committee/:id</code><span class="desc">Committee transactions</span></li>
    <li><code>GET /api/sos/search</code><span class="desc">AdvancedSearch full filters</span></li>
    <li><code>GET /api/sos/vrka</code><span class="desc">Prop 211 VRKA filings</span></li>
    <li><code>GET /api/sos/reports/:id</code><span class="desc">Filed reports for a committee</span></li>
    <li><code>GET /api/sos/cycles</code><span class="desc">Known election cycles</span></li>
  </ul>

  <pre><code>curl "https://sos.cactus.watch/api/sos/lookup?q=vanderwey"
curl "https://sos.cactus.watch/api/sos/search?donor=Vanderwey&amp;cycle=2024"
curl "https://sos.cactus.watch/api/sos/vrka?cycle=2026"</code></pre>

  <div class="disclaimer">
    <strong>This proxy is not authoritative.</strong> Live data flows from <a href="https://seethemoney.az.gov">seethemoney.az.gov</a>. For complaints, court filings, or anything official, verify directly against the SOS portal.
  </div>

  <footer>
    Built by <a href="https://cactus.watch">Cactus Watch</a> ·
    Source on <a href="https://github.com/az-civic-tools/sos-mcp">GitHub</a> ·
    <a href="https://github.com/az-civic-tools/sos-mcp/blob/main/LICENSE">MIT</a> ·
    Sister: <a href="https://ars.cactus.watch">ARS MCP</a>
  </footer>
</main>
</body>
</html>`;
