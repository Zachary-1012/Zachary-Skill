#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const professionalManifest = resolve(ROOT, "professional-manifest.json");
const manifestTools = existsSync(professionalManifest)
  ? Number(JSON.parse(readFileSync(professionalManifest, "utf8")).expectedToolCount || 19)
  : 19;
const expectedTools = Number(process.env.TRENTHUB_EXPECTED_TOOLS || manifestTools);
const expectedPlatforms = Number(process.env.TRENTHUB_EXPECTED_PLATFORMS || 51);
const url = process.argv[2] || process.env.TRENTHUB_REMOTE_URL || "https://trendhub-remote-production.up.railway.app/mcp";
const client = new Client({ name: "trendhub-remote-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(url));

function parseTextResult(result, toolName) {
  const text = result?.content?.find((item) => item?.type === "text")?.text;
  if (typeof text !== "string") throw new Error(`${toolName} returned no text payload`);
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${toolName} returned invalid JSON text: ${error.message}`); }
}

try {
  await client.connect(transport);
  const result = await client.listTools();
  const names = result.tools.map((tool) => tool.name);
  if (names.length !== expectedTools) throw new Error(`expected ${expectedTools} tools, got ${names.length}: ${names.join(", ")}`);
  for (const required of ["get_trending", "source_reliability", "trend_intelligence", "benchmark_trend_lead", "get_content_brief", "list_platforms"]) {
    if (!names.includes(required)) throw new Error(`missing required tool ${required}`);
  }
  if (expectedTools > 19) {
    for (const required of ["professional_intelligence", "workspace_manage"]) {
      if (!names.includes(required)) throw new Error(`missing professional tool ${required}`);
    }
  }

  const platformResult = await client.callTool({ name: "list_platforms", arguments: {} });
  const platformPayload = parseTextResult(platformResult, "list_platforms");
  const platforms = Array.isArray(platformPayload?.platforms) ? platformPayload.platforms : [];
  const platformNames = platforms.map((item) => item?.platform).filter((name) => typeof name === "string");
  const uniquePlatformNames = new Set(platformNames);
  if (platforms.length !== expectedPlatforms) throw new Error(`expected ${expectedPlatforms} platforms, got ${platforms.length}: ${platformNames.join(", ")}`);
  if (uniquePlatformNames.size !== expectedPlatforms) throw new Error(`expected ${expectedPlatforms} unique platforms, got ${uniquePlatformNames.size}: ${platformNames.join(", ")}`);
  for (const required of ["xiaohongshu", "weibo", "bilibili", "hackernews", "github-trending", "reddit-technology", "bluesky", "gdelt", "apple-podcasts"]) {
    if (!uniquePlatformNames.has(required)) throw new Error(`list_platforms missing representative source ${required}`);
  }
  console.log(`REMOTE SMOKE OK tools=${names.length} platforms=${platforms.length} url=${url}`);
  console.log(`tools: ${names.join(", ")}`);
  console.log(`platforms: ${platformNames.join(", ")}`);
} finally {
  await client.close().catch(() => {});
}
