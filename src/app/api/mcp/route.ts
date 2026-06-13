import { NextResponse, type NextRequest } from "next/server";
import { TOOLS, callTool } from "@/lib/mcp/tools";

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

async function dispatch(msg: RpcRequest): Promise<object | null> {
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
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const out = await callTool(name, args);
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

function authorized(request: NextRequest): boolean {
  const token = process.env.STUDIO_MCP_TOKEN?.trim();
  if (!token) return false; // closed unless explicitly configured
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return header === token;
}

export async function POST(request: NextRequest) {
  if (!process.env.STUDIO_MCP_TOKEN?.trim()) {
    return NextResponse.json(
      rpcError(null, -32000, "studio-mcp is not configured (set STUDIO_MCP_TOKEN)."),
      { status: 503 },
    );
  }
  if (!authorized(request)) {
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
    const responses = (await Promise.all(body.map((m) => dispatch(m as RpcRequest)))).filter(Boolean);
    return responses.length > 0 ? NextResponse.json(responses) : new NextResponse(null, { status: 202 });
  }
  const res = await dispatch(body as RpcRequest);
  return res ? NextResponse.json(res) : new NextResponse(null, { status: 202 });
}

/** A GET marks the endpoint reachable (no SSE stream — single-response mode). */
export async function GET() {
  return NextResponse.json({ ok: true, server: SERVER_INFO, transport: "streamable-http (json)" });
}
