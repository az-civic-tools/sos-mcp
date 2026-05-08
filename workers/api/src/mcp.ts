import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  advancedSearch,
  committeeReports,
  committeeTransactions,
  listByType,
  lookupEntity,
  vrkaSearch,
} from "./queries";
import { DISCLAIMER, type Env } from "./types";

const ENTITY_TYPES = [
  "Candidate",
  "PAC",
  "Party",
  "Organization",
  "IE",
  "BallotMeasure",
] as const;

function buildServer(env: Env): McpServer {
  const server = new McpServer({
    name: "Arizona Campaign Finance (SOS)",
    version: "0.1.0",
  });

  server.registerTool(
    "sos_lookup",
    {
      description:
        "Find a candidate, PAC, party, organization, or other entity by name in the AZ SOS campaign finance portal. " +
        "Returns matching entities with their EntityID and type. " +
        "Query must be at least 6 characters (upstream restriction).",
      inputSchema: { query: z.string().min(6) },
    },
    async ({ query }) => {
      const results = await lookupEntity(env, query);
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No matches for "${query}".` }],
        };
      }
      const lines = results.map(
        (r) => `[${r.type}] ${r.display_name} — entity_id=${r.id}`
      );
      return {
        content: [
          {
            type: "text",
            text:
              `Found ${results.length} entities for "${query}":\n\n` +
              lines.join("\n") +
              `\n\n${DISCLAIMER}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "sos_list_by_type",
    {
      description:
        "Browse all entities of a given type in the AZ SOS portal for a given election cycle. " +
        "Useful for surveying every PAC, candidate, party, organization, IE, or ballot measure committee.",
      inputSchema: {
        type: z.enum(ENTITY_TYPES),
        cycle: z.number().int().optional(),
        start: z.number().int().min(0).optional(),
        length: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ type, cycle, start, length }) => {
      const data = await listByType(env, type, cycle ?? 2026, start ?? 0, length ?? 50);
      if (data.rows.length === 0) {
        return {
          content: [
            { type: "text", text: `No ${type}s found in cycle ${cycle ?? 2026}.` },
          ],
        };
      }
      const lines = data.rows.map(
        (r) =>
          `${r.entity_id.toString().padStart(7, " ")}  ${r.display_name} — ${r.committee_name ?? ""}` +
          (r.income > 0 ? ` (income $${r.income.toLocaleString()})` : "")
      );
      return {
        content: [
          {
            type: "text",
            text:
              `${type}s in cycle ${cycle ?? 2026} (showing ${data.rows.length} of ${data.total}):\n\n` +
              lines.join("\n") +
              `\n\n${DISCLAIMER}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "sos_committee_transactions",
    {
      description:
        "Get all transactions for a single committee/candidate by EntityID. " +
        "Returns income, expenses, and IE rows depending on the detail page. " +
        "If you don't know the EntityID, use sos_lookup first.",
      inputSchema: {
        entity_id: z.number().int(),
        type: z.enum(ENTITY_TYPES).optional(),
        cycle: z.number().int().optional(),
        page: z.number().int().min(1).max(99).optional(),
        start: z.number().int().min(0).optional(),
        length: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ entity_id, type, cycle, page, start, length }) => {
      const data = await committeeTransactions(
        env,
        entity_id,
        cycle ?? 2026,
        page,
        start ?? 0,
        length ?? 50,
        type ?? "Candidate"
      );
      if (data.rows.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No transactions for entity_id=${entity_id} in cycle ${cycle ?? 2026}.`,
            },
          ],
        };
      }
      const lines = data.rows.map((r) => formatTx(r));
      return {
        content: [
          {
            type: "text",
            text:
              `Transactions for entity_id=${entity_id} (showing ${data.rows.length} of ${data.total}):\n\n` +
              lines.join("\n") +
              `\n\n${DISCLAIMER}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "sos_search_transactions",
    {
      description:
        "Full-featured AdvancedSearch wrapper. Search transactions across the whole AZ SOS database " +
        "by donor name, vendor, employer, occupation, city, state, ZIP, amount range, and committee filters. " +
        "category defaults to Income (use 'Expenditures' for expenses, 'IndependentExpenditures' for IE).",
      inputSchema: {
        category: z
          .enum(["Income", "Expenditures", "IndependentExpenditures", "BallotMeasures"])
          .optional(),
        cycle: z.number().int().optional(),
        position: z.enum(["Support", "Opposition"]).optional(),
        donor_name: z.string().optional(),
        vendor_name: z.string().optional(),
        employer: z.string().optional(),
        occupation: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        filer_name: z.string().optional(),
        filer_id: z.number().int().optional(),
        filer_type_id: z.number().int().min(1).max(8).optional(),
        low_amount: z.number().int().optional(),
        high_amount: z.number().int().optional(),
        start: z.number().int().min(0).optional(),
        length: z.number().int().min(1).max(200).optional(),
      },
    },
    async (input) => {
      const data = await advancedSearch(env, {
        ...input,
        cycle: input.cycle ?? 2026,
        category: input.category ?? "Income",
        position: input.position ?? "Support",
        length: input.length ?? 50,
      });
      if (data.rows.length === 0) {
        return {
          content: [{ type: "text", text: `No matching transactions.` }],
        };
      }
      const lines = data.rows.map((r) => formatTx(r));
      return {
        content: [
          {
            type: "text",
            text:
              `Found ${data.total} transactions, showing ${data.rows.length}:\n\n` +
              lines.join("\n") +
              `\n\n${DISCLAIMER}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "sos_vrka_search",
    {
      description:
        "List Prop 211 Voter's Right To Know Act (VRKA) filings. Returns the FILING records " +
        "(committee, report UUID, filing date) for committees that crossed the $50K threshold. " +
        "To see the underlying transactions/donors in a VRKA report, use sos_search_transactions or " +
        "fetch the raw PDF via the report_id.",
      inputSchema: {
        cycle: z.number().int().optional(),
        filer_name: z.string().optional(),
        filer_id: z.number().int().optional(),
        start: z.number().int().min(0).optional(),
        length: z.number().int().min(1).max(200).optional(),
      },
    },
    async (input) => {
      const data = await vrkaSearch(env, { ...input, cycle: input.cycle ?? 2026 });
      if (data.rows.length === 0) {
        return {
          content: [{ type: "text", text: `No VRKA filings match.` }],
        };
      }
      const lines = data.rows.map((r) => {
        const filed = r.filed_at ? r.filed_at.slice(0, 10) : "?";
        return `${filed}  committee_id=${r.committee_id}  ${r.committee_name}  report_id=${r.report_id}`;
      });
      return {
        content: [
          {
            type: "text",
            text:
              `Found ${data.total} VRKA filings, showing ${data.rows.length}:\n\n` +
              lines.join("\n") +
              `\n\n${DISCLAIMER}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "sos_committee_reports",
    {
      description: "List filed campaign-finance reports for a committee by FilerId.",
      inputSchema: {
        filer_id: z.number().int(),
        cycle: z.number().int().optional(),
        start: z.number().int().min(0).optional(),
        length: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ filer_id, cycle, start, length }) => {
      const data = await committeeReports(
        env,
        filer_id,
        cycle ?? 2026,
        start ?? 0,
        length ?? 50
      );
      if (data.rows.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No reports for filer_id=${filer_id} in cycle ${cycle ?? 2026}.`,
            },
          ],
        };
      }
      const lines = data.rows.map((r) => {
        const name = (r.ReportName as string | undefined) ?? "(report)";
        const filed = (r.FilingDate as string | undefined) ?? "?";
        const total = r.TotalIncome ? `, income $${(r.TotalIncome as number).toLocaleString()}` : "";
        return `${filed.slice(0, 10)}  ${name}${total}`;
      });
      return {
        content: [
          {
            type: "text",
            text:
              `Reports for filer_id=${filer_id} (${data.rows.length} of ${data.total}):\n\n` +
              lines.join("\n") +
              `\n\n${DISCLAIMER}`,
          },
        ],
      };
    }
  );

  return server;
}

function formatTx(t: {
  date: string | null;
  amount: number;
  type: string;
  committee: { name: string };
  counterparty: {
    name: string;
    employer?: string;
    occupation?: string;
    city?: string;
    state?: string;
  };
  position?: "Supported" | "Opposed" | null;
}): string {
  const date = t.date ? t.date.slice(0, 10) : "?";
  const amt = `$${t.amount.toLocaleString()}`;
  const where = [t.counterparty.city, t.counterparty.state].filter(Boolean).join(", ");
  const meta = [
    t.counterparty.employer,
    t.counterparty.occupation,
    where,
    t.position ? `[${t.position}]` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    `${date}  ${amt.padStart(12)}  ${t.committee.name} ← ${t.counterparty.name || "?"}\n` +
    `              ${t.type}${meta ? ` — ${meta}` : ""}`
  );
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  const server = buildServer(env);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
