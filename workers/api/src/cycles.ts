// Known SOS cycles (reverse-engineered from the dropdown).
// CycleId is a compound string: `{id}~{startDate}~{endDate}` — bare numbers won't work.
export const CYCLES: Record<number, string> = {
  2026: "44~1/1/2025 12:00:00 AM~12/31/2026 11:59:59 PM",
  2024: "43~1/1/2023 12:00:00 AM~12/31/2024 11:59:59 PM",
  2022: "39~1/1/2021 12:00:00 AM~12/31/2022 11:59:59 PM",
  2020: "30~1/1/2019 12:00:00 AM~12/31/2020 11:59:59 PM",
  2018: "29~11/9/2016 12:00:00 AM~12/31/2018 11:59:59 PM",
  2016: "28~11/25/2014 12:00:00 AM~11/8/2016 11:59:59 PM",
  2014: "27~11/27/2012 12:00:00 AM~11/24/2014 11:59:59 PM",
  2012: "26~11/23/2010 12:00:00 AM~11/26/2012 11:59:59 PM",
  2010: "25~11/25/2008 12:00:00 AM~11/22/2010 11:59:59 PM",
  2008: "8~11/28/2006 12:00:00 AM~11/24/2008 11:59:59 PM",
  2006: "7~11/23/2004 12:00:00 AM~11/27/2006 11:59:59 PM",
  2004: "6~11/26/2002 12:00:00 AM~11/22/2004 11:59:59 PM",
  2002: "5~11/28/2000 12:00:00 AM~11/25/2002 11:59:59 PM",
  2000: "4~11/24/1998 12:00:00 AM~11/27/2000 11:59:59 PM",
  1998: "3~11/26/1996 12:00:00 AM~11/23/1998 11:59:59 PM",
};

export const DEFAULT_CYCLE = 2026;

export interface CycleBounds {
  cycleId: string;
  startYear: number;
  endYear: number;
  startDate: string; // YYYY-MM-DD for AdvancedSearch
  endDate: string;
}

export function resolveCycle(year: number = DEFAULT_CYCLE): CycleBounds | null {
  const cycleId = CYCLES[year];
  if (!cycleId) return null;
  // Parse the compound string for the date components
  const parts = cycleId.split("~");
  // parts[1] = "1/1/2025 12:00:00 AM", parts[2] = "12/31/2026 11:59:59 PM"
  const startDate = mdyToISO(parts[1]);
  const endDate = mdyToISO(parts[2]);
  // Year span derives from dates
  const startYear = parseInt(startDate.slice(0, 4), 10);
  const endYear = parseInt(endDate.slice(0, 4), 10);
  return { cycleId, startYear, endYear, startDate, endDate };
}

function mdyToISO(s: string): string {
  // "12/31/2026 11:59:59 PM" -> "2026-12-31"
  const m = s.match(/^(\d+)\/(\d+)\/(\d+)/);
  if (!m) return "";
  const mm = m[1].padStart(2, "0");
  const dd = m[2].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

export function listCycles(): { year: number; cycleId: string }[] {
  return Object.entries(CYCLES)
    .map(([year, cycleId]) => ({ year: parseInt(year, 10), cycleId }))
    .sort((a, b) => b.year - a.year);
}
