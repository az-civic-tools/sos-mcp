import {
  advancedSearch,
  committeeReports,
  committeeTransactions,
  listByType,
  listCycles,
  lookupEntity,
  vrkaSearch,
} from "./queries";
import { withCache, cacheKey } from "./cache";
import { DISCLAIMER, type EntityKind, type Env } from "./types";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

function int(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const VALID_TYPES: EntityKind[] = [
  "Candidate",
  "PAC",
  "Party",
  "Organization",
  "IE",
  "BallotMeasure",
];

export async function handleRest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return json({ error: "method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const qp = url.searchParams;
  const bypass = qp.get("nocache") === "1";

  // GET /api/sos/cycles
  if (path === "/api/sos/cycles") {
    return json({ cycles: listCycles(), disclaimer: DISCLAIMER });
  }

  // GET /api/sos/lookup?q=
  if (path === "/api/sos/lookup") {
    const q = qp.get("q") ?? "";
    if (q.trim().length < 6) {
      return json(
        { error: "q must be at least 6 characters", disclaimer: DISCLAIMER },
        { status: 400 }
      );
    }
    const results = await withCache(env, cacheKey(["lookup", q.toLowerCase()]), bypass, () =>
      lookupEntity(env, q)
    );
    return json({ q, results, disclaimer: DISCLAIMER });
  }

  // GET /api/sos/list/:type?cycle=&start=&length=
  let m = path.match(/^\/api\/sos\/list\/([A-Za-z]+)$/);
  if (m) {
    const type = m[1] as EntityKind;
    if (!VALID_TYPES.includes(type)) {
      return json({ error: `invalid type ${type}; valid: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }
    const cycle = int(qp.get("cycle"), 2026);
    const start = int(qp.get("start"), 0);
    const length = int(qp.get("length"), 50);
    const data = await withCache(
      env,
      cacheKey(["list", type, cycle, start, length]),
      bypass,
      () => listByType(env, type, cycle, start, length)
    );
    return json({ type, cycle, ...data, disclaimer: DISCLAIMER });
  }

  // GET /api/sos/committee/:id?cycle=&type=&page=&start=&length=
  m = path.match(/^\/api\/sos\/committee\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    const cycle = int(qp.get("cycle"), 2026);
    const type = (qp.get("type") as EntityKind | null) ?? "Candidate";
    const page = qp.get("page") ? parseInt(qp.get("page")!, 10) : undefined;
    const start = int(qp.get("start"), 0);
    const length = int(qp.get("length"), 50);
    const data = await withCache(
      env,
      cacheKey(["cttx", id, cycle, type, page, start, length]),
      bypass,
      () => committeeTransactions(env, id, cycle, page, start, length, type)
    );
    return json({ entity_id: id, cycle, ...data, disclaimer: DISCLAIMER });
  }

  // GET /api/sos/reports/:id?cycle=&start=&length=
  m = path.match(/^\/api\/sos\/reports\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    const cycle = int(qp.get("cycle"), 2026);
    const start = int(qp.get("start"), 0);
    const length = int(qp.get("length"), 50);
    const data = await withCache(
      env,
      cacheKey(["rep", id, cycle, start, length]),
      bypass,
      () => committeeReports(env, id, cycle, start, length)
    );
    return json({ filer_id: id, cycle, ...data, disclaimer: DISCLAIMER });
  }

  // GET /api/sos/search?...
  if (path === "/api/sos/search") {
    const input = {
      category: (qp.get("category") as
        | "Income"
        | "Expenditures"
        | "IndependentExpenditures"
        | "BallotMeasures"
        | null) ?? "Income",
      cycle: int(qp.get("cycle"), 2026),
      startDate: qp.get("start_date") ?? undefined,
      endDate: qp.get("end_date") ?? undefined,
      filer_name: qp.get("filer") ?? undefined,
      filer_id: qp.get("filer_id") ? parseInt(qp.get("filer_id")!, 10) : undefined,
      donor_name: qp.get("donor") ?? undefined,
      vendor_name: qp.get("vendor") ?? undefined,
      employer: qp.get("employer") ?? undefined,
      occupation: qp.get("occupation") ?? undefined,
      city: qp.get("city") ?? undefined,
      state: qp.get("state") ?? undefined,
      low_amount: qp.get("min") ? parseInt(qp.get("min")!, 10) : undefined,
      high_amount: qp.get("max") ? parseInt(qp.get("max")!, 10) : undefined,
      start: int(qp.get("start"), 0),
      length: int(qp.get("length"), 50),
    };
    const data = await withCache(
      env,
      cacheKey(["search", JSON.stringify(input)]),
      bypass,
      () => advancedSearch(env, input)
    );
    return json({ filters: input, ...data, disclaimer: DISCLAIMER });
  }

  // GET /api/sos/vrka?...
  if (path === "/api/sos/vrka") {
    const input = {
      cycle: int(qp.get("cycle"), 2026),
      filer_name: qp.get("filer") ?? undefined,
      filer_id: qp.get("filer_id") ? parseInt(qp.get("filer_id")!, 10) : undefined,
      donor_name: qp.get("donor") ?? undefined,
      low_amount: qp.get("min") ? parseInt(qp.get("min")!, 10) : undefined,
      start: int(qp.get("start"), 0),
      length: int(qp.get("length"), 50),
    };
    const data = await withCache(env, cacheKey(["vrka", JSON.stringify(input)]), bypass, () =>
      vrkaSearch(env, input)
    );
    return json({ filters: input, ...data, disclaimer: DISCLAIMER });
  }

  return json({ error: "not found", path }, { status: 404 });
}
