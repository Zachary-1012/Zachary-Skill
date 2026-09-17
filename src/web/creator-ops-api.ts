/** Local-only API boundary for Creator Ops. The public remote gateway does not proxy these routes. */
import { recordApiObservation } from "../observability/local.js";
import {
  CreatorOpsInputError,
  addCreatorOpsCost,
  addCreatorOpsFeedback,
  creatorOpsReport,
  creatorOpsSummary,
  listCreatorOpsEvents,
} from "../ops/creator-ops.js";

export interface CreatorOpsApiResponse {
  status: number;
  data: unknown;
}

const PATHS = new Set(["/api/ops/summary", "/api/ops/events", "/api/ops/report", "/api/ops/costs", "/api/ops/feedback"]);

function error(message: string, status = 400): CreatorOpsApiResponse {
  return { status, data: { error: message } };
}

function objectBody(body: string): Record<string, unknown> {
  if (!body.trim()) return {};
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new CreatorOpsInputError("JSON body must be an object");
  return parsed as Record<string, unknown>;
}

async function measured(pathname: string, fn: () => CreatorOpsApiResponse | Promise<CreatorOpsApiResponse>): Promise<CreatorOpsApiResponse> {
  const started = Date.now();
  try {
    const response = await fn();
    recordApiObservation(pathname, Date.now() - started, response.status);
    return response;
  } catch (cause) {
    const status = cause instanceof CreatorOpsInputError || cause instanceof SyntaxError ? 400 : 500;
    recordApiObservation(pathname, Date.now() - started, status);
    return error(cause instanceof Error ? cause.message : "Creator Ops failure", status);
  }
}

export async function handleCreatorOpsApi(pathname: string, method: string, body: string): Promise<CreatorOpsApiResponse | null> {
  if (!pathname.startsWith("/api/ops/")) return null;
  if (!PATHS.has(pathname)) return error("Creator Ops route not found", 404);
  return measured(pathname, () => {
    if (method === "GET") {
      if (pathname === "/api/ops/summary") return { status: 200, data: creatorOpsSummary() };
      if (pathname === "/api/ops/events") return { status: 200, data: listCreatorOpsEvents() };
      if (pathname === "/api/ops/report") return { status: 200, data: creatorOpsReport() };
      return error("method not allowed", 405);
    }
    if (method !== "POST") return error("method not allowed", 405);
    const input = objectBody(body);
    if (pathname === "/api/ops/costs") return { status: 201, data: { cost: addCreatorOpsCost(input) } };
    if (pathname === "/api/ops/feedback") return { status: 201, data: { feedback: addCreatorOpsFeedback(input) } };
    return error("method not allowed", 405);
  });
}
