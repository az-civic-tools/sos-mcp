import type { EntityKind } from "./types";

// Entity type IDs from the SeeTheMoney reverse-engineering doc.
export const ENTITY_TYPES: Record<number, EntityKind> = {
  1: "Candidate",
  2: "PAC",
  3: "Party",
  4: "Organization",
  5: "IE",
  6: "BallotMeasure",
  7: "Individual",
  8: "Vendor",
};

export const ENTITY_TYPE_IDS: Record<EntityKind, number> = {
  Candidate: 1,
  PAC: 2,
  Party: 3,
  Organization: 4,
  IE: 5,
  BallotMeasure: 6,
  Individual: 7,
  Vendor: 8,
};

// Default detail Page for each entity type, used by GetNEWDetailedTableData.
// Page is entity-type-specific: Page=20 = "contributions" for Candidate (range 20–24),
// while PACs use 30–36, Parties 40–42, etc.
export const DEFAULT_DETAIL_PAGE: Record<EntityKind, number> = {
  Candidate: 24, // "everything" for the candidate
  PAC: 36,
  Party: 42,
  Organization: 54,
  IE: 62,
  BallotMeasure: 72,
  Individual: 80,
  Vendor: 90,
};

// Landing page tab numbers used by GetNEWTableData.
export const LANDING_PAGE: Record<EntityKind, number> = {
  Candidate: 1,
  PAC: 2,
  Party: 3,
  Organization: 4,
  IE: 5,
  BallotMeasure: 6,
  Individual: 7,
  Vendor: 8,
};

export function entityKindFromTypeId(id: number): EntityKind {
  return ENTITY_TYPES[id] ?? "Organization";
}
