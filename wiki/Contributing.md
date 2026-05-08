# Contributing

Welcome. Contributions of any size are genuinely useful — bug reports, doc corrections, missing endpoints, or full new tools.

## What we want

- **Bug reports.** Especially upstream quirks we haven't caught yet (response shape changes, new gotchas, broken endpoints).
- **Doc corrections.** Wiki pages out of date, examples that no longer return what they promise.
- **New tools.** Wrappers around upstream endpoints we haven't covered (chart-data endpoints, GetCommitteeName, etc.).
- **Test coverage.** Currently the project has no automated tests — we'd take a Vitest setup.
- **Forks for other states.** If you stand one up, link it from the README.

## How to contribute

### Quick fix (typo, doc correction)

1. Edit on GitHub directly via the "Edit" button
2. Submit a PR against `main`

### Code change

1. Fork → branch → commit → push
2. Run `npx tsc --noEmit` to check types
3. `npx wrangler deploy --dry-run` to verify the build
4. Open a PR with:
   - What changed
   - How it was tested
   - Any new env vars or migrations

### Reporting an upstream change

The upstream API isn't versioned and could shift without warning. If you find a query that returns differently than the docs claim:

1. Reproduce with a minimal `curl` command
2. Note the date and time
3. Open an issue with the curl + the unexpected response
4. If you know the fix, include it in the PR

## Code style

- TypeScript, strict mode
- Files under 800 lines, functions under 50
- Match the existing structure: `seethemoney.ts` for upstream calls, `normalize.ts` for shape transforms, `queries.ts` for high-level functions
- No mutation in helpers — return new objects
- Every external boundary (input from REST, MCP, upstream) gets validated or normalized

## Naming

- REST routes: `/api/sos/<resource>` or `/api/sos/<resource>/:id`
- MCP tools: `sos_<verb>_<resource>` (snake_case for tool names)
- Internal functions: `camelCase`

## Testing locally

```bash
cd workers/api
npm install
npx wrangler dev
```

This starts a local Worker at `http://localhost:8787`. Hit `/health`, `/api/sos/cycles`, etc. to verify.

For MCP testing, use the `@modelcontextprotocol/inspector`:

```bash
npx @modelcontextprotocol/inspector
```

Point it at `http://localhost:8787/mcp`.

## License

By contributing, you agree your changes are MIT-licensed under [LICENSE](https://github.com/az-civic-tools/sos-mcp/blob/main/LICENSE).

## Code of conduct

Be cool. This is a civic tool meant to make AZ campaign finance data more accessible. Don't use it to harass donors or doxx individuals — that's not what this is for.
