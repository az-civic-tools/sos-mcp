// High-level query functions. Wrap the upstream's quirks; return clean shapes.

import { dataTablesPost, getJson } from "./seethemoney";
import { resolveCycle, listCycles } from "./cycles";
import {
  ENTITY_TYPES,
  ENTITY_TYPE_IDS,
  DEFAULT_DETAIL_PAGE,
  LANDING_PAGE,
  entityKindFromTypeId,
} from "./entities";
import { parseMSDate, stripEntityHTML, decodePipeBlob } from "./normalize";
import type {
  CategoryType,
  CommitteeRow,
  EntityKind,
  Env,
  NormalizedEntity,
  NormalizedTransaction,
  Position,
  VRKAFiling,
} from "./types";

/* ──────────────────────────  Lookup  ────────────────────────── */

export async function lookupEntity(
  env: Env,
  query: string
): Promise<NormalizedEntity[]> {
  if (query.trim().length < 6) return []; // upstream silently returns nothing for <6
  const data = await getJson<Array<{ label: string; value: string }>>(
    env,
    "GetData",
    { search: query.trim() }
  );
  return data.map((row) => {
    const [typeIdStr, idStr] = row.value.split("~");
    const typeId = parseInt(typeIdStr, 10);
    const id = parseInt(idStr, 10);
    // label is "[Candidate] Vanderwey, John" — strip the type prefix
    const display = row.label.replace(/^\[[^\]]+\]\s*/, "").trim();
    return {
      id,
      type: entityKindFromTypeId(typeId),
      type_id: typeId,
      display_name: display,
    };
  });
}

/* ──────────────────────────  List by type  ────────────────────────── */

export async function listByType(
  env: Env,
  type: EntityKind,
  cycleYear: number,
  start: number = 0,
  length: number = 50
): Promise<{ rows: CommitteeRow[]; total: number }> {
  const cycle = resolveCycle(cycleYear);
  if (!cycle) throw new Error(`Unknown cycle year ${cycleYear}`);

  const page = LANDING_PAGE[type];
  const resp = await dataTablesPost<Record<string, unknown>>(
    env,
    "GetNEWTableData/",
    {
      query: {
        Page: page,
        ChartName: page,
        startYear: cycle.startYear,
        endYear: cycle.endYear,
        JurisdictionId: 0,
        TablePage: 1,
        TableLength: length,
        IsLessActive: false,
        ShowOfficeHolder: false,
      },
      columns: [
        "EntityLastName",
        "CommitteeName",
        "OfficeName",
        "PartyName",
        "Income",
        "Expense",
        "CashBalance",
        "IESupport",
        "IEOpposition",
      ],
      start,
      length,
      orderColumn: 0,
      orderDir: "asc",
    }
  );

  return {
    total: resp.recordsTotal ?? 0,
    rows: resp.data.map((r) => {
      const cleaned = stripEntityHTML(r.EntityLastName);
      return {
        entity_id: cleaned.id ?? (typeof r.EntityID === "number" ? r.EntityID : 0),
        display_name: cleaned.name,
        committee_name: (r.CommitteeName as string | null) ?? null,
        office: (r.OfficeName as string | null) ?? null,
        party: (r.PartyName as string | null) ?? null,
        income: Number(r.Income ?? 0),
        expense: Number(r.Expense ?? 0),
        ie_support: Number(r.IESupport ?? 0),
        ie_opposition: Number(r.IEOpposition ?? 0),
        cash_balance: Number(r.CashBalance ?? 0),
        type: (r.EntityTypeName as string | undefined) ?? type,
      };
    }),
  };
}

/* ──────────────────────────  Committee transactions  ────────────────────────── */

export async function committeeTransactions(
  env: Env,
  entityId: number,
  cycleYear: number,
  page?: number,
  start: number = 0,
  length: number = 50,
  type: EntityKind = "Candidate"
): Promise<{ rows: NormalizedTransaction[]; total: number }> {
  const cycle = resolveCycle(cycleYear);
  if (!cycle) throw new Error(`Unknown cycle year ${cycleYear}`);

  const detailPage = page ?? DEFAULT_DETAIL_PAGE[type];
  const typeId = ENTITY_TYPE_IDS[type];

  const resp = await dataTablesPost<Record<string, unknown>>(
    env,
    "GetNEWDetailedTableData",
    {
      query: {
        Page: detailPage,
        ChartName: detailPage,
        startYear: cycle.startYear,
        endYear: cycle.endYear,
        JurisdictionId: 0,
        Name: `${typeId}~${entityId}`,
        entityId,
        TablePage: 1,
        TableLength: length,
        IsLessActive: false,
        ShowOfficeHolder: false,
      },
      columns: ["TransactionDate"],
      start,
      length,
      orderDir: "desc",
    }
  );

  return {
    total: resp.recordsTotal ?? 0,
    rows: resp.data.map((r) => normalizeDetailedTx(r)),
  };
}

/* ──────────────────────────  Advanced Search  ────────────────────────── */

export interface AdvancedSearchInput {
  category?: CategoryType;
  cycle?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  position?: Position;
  filer_name?: string;
  filer_id?: number;
  filer_type_id?: number; // 1 cand, 2 PAC, 3 party, 4 officeholder
  donor_name?: string;
  vendor_name?: string;
  employer?: string;
  occupation?: string;
  city?: string;
  state?: string;
  low_amount?: number;
  high_amount?: number;
  start?: number;
  length?: number;
}

export async function advancedSearch(
  env: Env,
  input: AdvancedSearchInput
): Promise<{ rows: NormalizedTransaction[]; total: number }> {
  const cycle = resolveCycle(input.cycle ?? 2026);
  if (!cycle) throw new Error(`Unknown cycle ${input.cycle}`);

  const resp = await dataTablesPost<Record<string, unknown>>(
    env,
    "AdvancedSearch/",
    {
      query: {
        JurisdictionId: 0,
        CategoryType: input.category ?? "Income",
        CycleId: cycle.cycleId,
        StartDate: input.startDate ?? cycle.startDate,
        EndDate: input.endDate ?? cycle.endDate,
        // Position is REQUIRED — empty string returns 0 rows.
        Position: input.position ?? "Support",
        FilerName: input.filer_name,
        FilerId: input.filer_id,
        FilerTypeId: input.filer_type_id,
        ContributorName: input.donor_name,
        VendorName: input.vendor_name,
        Employer: input.employer,
        Occupation: input.occupation,
        City: input.city,
        StateId: input.state,
        LowAmount: input.low_amount,
        HighAmount: input.high_amount,
      },
      columns: [
        "TransactionDate",
        "CommitteeName",
        "Amount",
        "TransactionName",
        "TransactionType",
        "Occupation",
        "Employer",
        "City",
        "State",
        "ZipCode",
      ],
      start: input.start ?? 0,
      length: input.length ?? 50,
      orderDir: "desc",
    }
  );

  return {
    total: resp.recordsTotal ?? 0,
    rows: resp.data.map((r) => normalizeAdvancedSearch(r)),
  };
}

/* ──────────────────────────  VRKA Search  ────────────────────────── */

export async function vrkaSearch(
  env: Env,
  input: { cycle?: number; filer_name?: string; filer_id?: number; start?: number; length?: number }
): Promise<{ rows: VRKAFiling[]; total: number }> {
  const cycle = resolveCycle(input.cycle ?? 2026);
  if (!cycle) throw new Error(`Unknown cycle ${input.cycle}`);

  // VRKASearch returns FILING records (committee + report UUID + filing date),
  // not transactions. Different shape from AdvancedSearch despite using the
  // same DataTables protocol.
  const resp = await dataTablesPost<Record<string, unknown>>(env, "VRKASearch", {
    query: {
      JurisdictionId: 0,
      CycleId: cycle.cycleId,
      StartDate: cycle.startDate,
      EndDate: cycle.endDate,
      FilerName: input.filer_name,
      FilerId: input.filer_id,
    },
    columns: ["CreatedDate", "CommitteeName", "ReportId"],
    start: input.start ?? 0,
    length: input.length ?? 50,
    orderColumn: 0,
    orderDir: "desc",
  });

  return {
    total: resp.recordsTotal ?? 0,
    rows: resp.data.map((r) => ({
      committee_id: Number(r.CommitteeId ?? 0),
      committee_name: (r.CommitteeName as string | undefined) ?? "",
      report_id: (r.ReportId as string | undefined) ?? "",
      filed_at: parseMSDate(r.CreatedDate),
      raw: r,
    })),
  };
}

/* ──────────────────────────  Committee reports  ────────────────────────── */

export async function committeeReports(
  env: Env,
  filerId: number,
  cycleYear: number = 2026,
  start: number = 0,
  length: number = 50
): Promise<{ rows: Array<Record<string, unknown>>; total: number }> {
  const cycle = resolveCycle(cycleYear);
  if (!cycle) throw new Error(`Unknown cycle ${cycleYear}`);

  const resp = await dataTablesPost<Record<string, unknown>>(env, "ReportSearch", {
    query: {
      JurisdictionId: 0,
      CategoryType: "Reports",
      CycleId: cycle.cycleId,
      StartDate: cycle.startDate,
      EndDate: cycle.endDate,
      Position: "Support",
      FilerId: filerId,
    },
    columns: [
      "ReportName",
      "ReportType",
      "FilingDate",
      "PeriodBeginDate",
      "PeriodEndDate",
      "TotalIncome",
      "TotalExpense",
      "CashOnHand",
    ],
    start,
    length,
    orderDir: "desc",
  });

  return {
    total: resp.recordsTotal ?? 0,
    rows: resp.data.map((r) => ({
      ...r,
      FilingDate: parseMSDate(r.FilingDate),
      PeriodBeginDate: parseMSDate(r.PeriodBeginDate),
      PeriodEndDate: parseMSDate(r.PeriodEndDate),
    })),
  };
}

/* ──────────────────────────  Helpers re-exported  ────────────────────────── */

export { resolveCycle, listCycles, ENTITY_TYPES, ENTITY_TYPE_IDS };

/* ──────────────────────────  Internal normalizers  ────────────────────────── */

function normalizeDetailedTx(r: Record<string, unknown>): NormalizedTransaction {
  const counterparty = decodePipeBlob(r.ReceivedFromOrPaidTo) ?? {};
  const last = (r.TransactionLastName as string | undefined) ?? "";
  const first = (r.TransactionFirstName as string | undefined) ?? "";
  const fullName =
    [first, last].filter(Boolean).join(" ").trim() ||
    (counterparty as Record<string, string | null>).display_name ||
    "";
  const benefited = (r.BenefitedOpposed as string | undefined) ?? null;

  return {
    date: parseMSDate(r.TransactionDate),
    amount: Number(r.Amount ?? 0),
    type: (r.TransactionType as string | undefined) ?? "",
    committee: {
      id: Number(r.CommitteeId ?? 0),
      name: (r.CommitteeName as string | undefined) ?? "",
    },
    counterparty: {
      name: fullName,
      first_name: first || undefined,
      last_name: last || undefined,
      employer: (r.TransactionEmployer as string | null) ?? undefined,
      occupation: (r.TransactionOccupation as string | null) ?? undefined,
      city: (r.TransactionCity as string | null) ?? undefined,
      state: (r.TransactionState as string | null) ?? undefined,
      zip: (r.TransactionZipCode as string | null) ?? undefined,
    },
    position:
      benefited === "Supported" || benefited === "Opposed" ? benefited : null,
    memo: (r.Memo as string | null) ?? null,
    source_endpoint: "GetNEWDetailedTableData",
    raw: r,
  };
}

function normalizeAdvancedSearch(
  r: Record<string, unknown>,
  endpoint: string = "AdvancedSearch"
): NormalizedTransaction {
  const last = (r.LastName as string | undefined) ?? "";
  const first = (r.FirstName as string | undefined) ?? "";
  const fullName =
    [first, last].filter(Boolean).join(" ").trim() ||
    ((r.TransactionName as string | undefined) ?? "");

  return {
    date: parseMSDate(r.TransactionDate),
    amount: Number(r.Amount ?? 0),
    type: (r.TransactionType as string | undefined) ?? "",
    committee: {
      id: Number(r.CommitteeID ?? 0),
      name: (r.CommitteeName as string | undefined) ?? "",
    },
    counterparty: {
      name: fullName,
      first_name: first || undefined,
      last_name: last || undefined,
      employer: (r.Employer as string | null) ?? undefined,
      occupation: (r.Occupation as string | null) ?? undefined,
      city: (r.City as string | null) ?? undefined,
      state: (r.State as string | null) ?? undefined,
      zip: (r.ZipCode as string | null) ?? undefined,
    },
    memo: (r.Memo as string | null) ?? null,
    source_endpoint: endpoint,
    raw: r,
  };
}
