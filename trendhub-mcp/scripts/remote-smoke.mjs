#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] || process.env.TRENTHUB_REMOTE_URL || "https://trendhub-remote-production.up.railway.app/mcp";
const expected = 19;
const client = new Client({ name: "trendhub-remote-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(url));

try {
  await client.connect(transport);
  const result = await client.listTools();
  const names = result.tools.map((tool) => tool.name);
  if (names.length !== expected) {
    throw new Error(`expected ${expected} tools, got ${names.length}: ${names.join(", ")}`);
  }
  for (const required of ["get_trending", "source_reliability", "trend_intelligence", "benchmark_trend_lead", "get_content_brief"]) {
    if (!names.includes(required)) throw new Error(`missing required tool ${required}`);
  }
  console.log(`REMOTE SMOKE OK tools=${names.length} url=${url}`);
  console.log(`tools: ${names.join(", ")}`);
} finally {
  await client.close().catch(() => {});
}
