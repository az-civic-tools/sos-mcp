export interface Env {
  CACHE: KVNamespace;
  USER_AGENT: string;
  SITE_NAME: string;
  CACHE_TTL_SECONDS: string;
}

export const DISCLAIMER =
  "Source: seethemoney.az.gov. Proxy not authoritative. Verify directly against the official portal before relying on this data for legal, regulatory, or compliance purposes.";

export type CategoryType =
  | "Income"
  | "Expenditures"
  | "IndependentExpenditures"
  | "BallotMeasures"
  | "Reports";

export type Position = "Support" | "Opposition" | "";

export type FilerType = "Candidate" | "PAC" | "Party" | "Officeholder";

export type EntityKind =
  | "Candidate"
  | "PAC"
  | "Party"
  | "Organization"
  | "IE"
  | "BallotMeasure"
  | "Individual"
  | "Vendor";

export interface NormalizedTransaction {
  date: string | null; // ISO 8601
  amount: number;
  type: string; // human-readable category
  committee: { id: number; name: string };
  counterparty: {
    name: string;
    first_name?: string;
    last_name?: string;
    employer?: string;
    occupation?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  position?: "Supported" | "Opposed" | null;
  memo?: string | null;
  source_endpoint: string;
  raw?: Record<string, unknown>;
}

export interface NormalizedEntity {
  id: number;
  type: EntityKind;
  type_id: number;
  display_name: string;
}

export interface VRKAFiling {
  committee_id: number;
  committee_name: string;
  report_id: string; // UUID
  filed_at: string | null; // ISO 8601
  raw?: Record<string, unknown>;
}

export interface CommitteeRow {
  entity_id: number;
  display_name: string;
  committee_name: string | null;
  office: string | null;
  party: string | null;
  income: number;
  expense: number;
  ie_support: number;
  ie_opposition: number;
  cash_balance: number;
  type: string;
}
