import { handleRest } from "./rest";
import { handleMcp } from "./mcp";
import { LANDING_HTML } from "./landing";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/mcp") {
      return handleMcp(request, env);
    }

    if (path.startsWith("/api/")) {
      return handleRest(request, env);
    }

    if (path === "/health") return new Response("ok");

    if (path === "/" || path === "/index.html") {
      return new Response(LANDING_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
