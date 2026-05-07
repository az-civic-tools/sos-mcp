// Core SeeTheMoney API client. Translates clean inputs into the DataTables
// protocol the upstream demands, and returns the raw JSON response.

import type { Env } from "./types";

const BASE = "https://seethemoney.az.gov";

export interface DataTablesResponse<T = Record<string, unknown>> {
  draw?: string;
  recordsTotal?: number;
  recordsFiltered?: number;
  data: T[];
}

export interface PostOptions {
  // Query-string filter params (the upstream demands these in the URL, NOT body)
  query: Record<string, string | number | boolean | undefined>;
  // Column data names in DataTables order
  columns: string[];
  // 0-based offset
  start?: number;
  // page size
  length?: number;
  orderColumn?: number;
  orderDir?: "asc" | "desc";
  searchValue?: string;
}

/**
 * Generic DataTables POST against a SeeTheMoney /Reporting/{endpoint}.
 * Filter params go in the URL query string; DataTables state goes in the body.
 * Swap them and the upstream silently returns recordsTotal: 0.
 */
export async function dataTablesPost<T = Record<string, unknown>>(
  env: Env,
  endpoint: string,
  options: PostOptions
): Promise<DataTablesResponse<T>> {
  const url = new URL(`${BASE}/Reporting/${endpoint}`);
  for (const [k, v] of Object.entries(options.query)) {
    if (v === undefined || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const body = new URLSearchParams();
  body.set("draw", "1");
  options.columns.forEach((name, i) => {
    body.set(`columns[${i}][data]`, name);
    body.set(`columns[${i}][searchable]`, "true");
    body.set(`columns[${i}][orderable]`, "true");
  });
  body.set("order[0][column]", String(options.orderColumn ?? 0));
  body.set("order[0][dir]", options.orderDir ?? "desc");
  body.set("start", String(options.start ?? 0));
  body.set("length", String(options.length ?? 50));
  body.set("search[value]", options.searchValue ?? "");

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": env.USER_AGENT,
      accept: "application/json, text/javascript, */*; q=0.01",
    },
    body,
  });
  if (!r.ok) {
    throw new Error(`SeeTheMoney ${endpoint} returned ${r.status} ${r.statusText}`);
  }
  return (await r.json()) as DataTablesResponse<T>;
}

/** Simple GET against /Reporting/{endpoint}?...params. */
export async function getJson<T>(
  env: Env,
  endpoint: string,
  query: Record<string, string | number | undefined> = {}
): Promise<T> {
  const url = new URL(`${BASE}/Reporting/${endpoint}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const r = await fetch(url, {
    headers: {
      "user-agent": env.USER_AGENT,
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json, */*",
    },
  });
  if (!r.ok) {
    throw new Error(`SeeTheMoney ${endpoint} returned ${r.status} ${r.statusText}`);
  }
  return (await r.json()) as T;
}
