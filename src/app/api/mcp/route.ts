import { NextResponse, type NextRequest } from "next/server";
import { TOOLS, callTool, toolVisible, type McpScope } from "@/lib/mcp/tools";
import { resolveBot, type BotContext } from "@/lib/bots/agents";
import { createAdminClient } from "@/lib/supabase/admin";
import { secureEquals } from "@/lib/secure-compare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * studio-mcp — a streamable-HTTP MCP server inside the app (Phase 9). Lets an
 * MCP client (Claude Code/Desktop) operate the studio: list projects, review
 * approvals, approve/revise gates, queue ideas, run intelligence, read costs,
 * propose template updates. Authenticated by a scoped bearer token
 * (STUDIO_MCP_TOKEN). Implements the JSON-RPC methods Claude needs:
 * initialize, tools/list, tools/call, ping, and the initialized notification.
 */

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "studio-mcp", version: "1.0.0" };

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

function result(id: RpcRequest["id"], res: unknown) {
  return { jsonrpc: "2.0", id, result: res };
}
function rpcError(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

type Caller = { scope: McpScope; bot?: BotContext };

async function dispatch(msg: RpcRequest, caller: Caller): Promise<object | null> {
  const { scope, bot } = caller;
  switch (msg.method) {
    case "initialize":
      return result(msg.id, {
        protocolVersion:
          (msg.params?.protocolVersion as string) || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notification — no response
    case "ping":
      return result(msg.id, {});
    case "tools/list":
      return result(msg.id, {
        // Read scope sees inspection tools; a bot sees only its allowlist.
        tools: TOOLS.filter((t) => toolVisible(t.name, scope)).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const out = await callTool(name, args, scope, bot);
        return result(msg.id, {
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        });
      } catch (err) {
        return result(msg.id, {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

/** Resolve the caller from the bearer token (constant-time compares).
    STUDIO_MCP_TOKEN → full control; STUDIO_MCP_READ_TOKEN → read-only; a
    channel bot token (fsbot_…, stored hashed in bot_agents) → that bot. */
async function authorized(request: NextRequest): Promise<Caller | null> {
  const control = process.env.STUDIO_MCP_TOKEN?.trim();
  if (!control) return null; // closed unless explicitly configured
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (secureEquals(header, control)) return { scope: "control" };
  const read = process.env.STUDIO_MCP_READ_TOKEN?.trim();
  if (read && secureEquals(header, read)) return { scope: "read" };
  const bot = await resolveBot(createAdminClient(), header);
  return bot ? { scope: "bot", bot } : null;
}

export async function POST(request: NextRequest) {
  if (!process.env.STUDIO_MCP_TOKEN?.trim()) {
    return NextResponse.json(
      rpcError(null, -32000, "studio-mcp is not configured (set STUDIO_MCP_TOKEN)."),
      { status: 503 },
    );
  }
  const caller = await authorized(request);
  if (!caller) {
    return NextResponse.json(rpcError(null, -32001, "Unauthorized"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }

  // Single message or JSON-RPC batch.
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => dispatch(m as RpcRequest, caller)))).filter(Boolean);
    return responses.length > 0 ? NextResponse.json(responses) : new NextResponse(null, { status: 202 });
  }
  const res = await dispatch(body as RpcRequest, caller);
  return res ? NextResponse.json(res) : new NextResponse(null, { status: 202 });
}

/** A GET marks the endpoint reachable (no SSE stream — single-response mode). */
export async function GET() {
  return NextResponse.json({ ok: true, server: SERVER_INFO, transport: "streamable-http (json)" });
}
