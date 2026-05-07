// Helpers that absorb SeeTheMoney's quirks into clean shapes.

/** "/Date(1735801200000)/" -> ISO 8601 string, or null. */
export function parseMSDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(/Date\((\d+)/);
  if (!m) return null;
  const ms = parseInt(m[1], 10);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/** "Alston, Lela <br>(101817)" -> { name: "Alston, Lela", id: 101817 }. */
export function stripEntityHTML(value: unknown): { name: string; id: number | null } {
  const raw = typeof value === "string" ? value : "";
  const idMatch = raw.match(/\((\d+)\)\s*$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : null;
  const name = raw
    .replace(/<br[^>]*>/gi, " ")
    .replace(/\(\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return { name, id };
}

/**
 * Decode the `ReceivedFromOrPaidTo` pipe-delimited blob:
 *   "{nameId}|{displayName}|{middleName}|{firstName}|{entityTypeId}|{transactionGroup}|{nameGroupId}|||{displayName}"
 */
export function decodePipeBlob(value: unknown): {
  name_id: number | null;
  display_name: string | null;
  middle_name: string | null;
  first_name: string | null;
  entity_type_id: number | null;
  transaction_group: number | null;
  name_group_id: number | null;
} | null {
  if (typeof value !== "string" || !value.includes("|")) return null;
  const parts = value.split("|");
  const num = (s: string | undefined) => {
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  const str = (s: string | undefined) => (s && s.length > 0 ? s : null);
  return {
    name_id: num(parts[0]),
    display_name: str(parts[1]),
    middle_name: str(parts[2]),
    first_name: str(parts[3]),
    entity_type_id: num(parts[4]),
    transaction_group: num(parts[5]),
    name_group_id: num(parts[6]),
  };
}
