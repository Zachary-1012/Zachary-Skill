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
// Stable v1.5.3 exposes 51 runtime platform/source adapters. Keep the env override
// for explicit release contracts, but default to the current canonical runtime count
// so Registry publication and ad-hoc remote smoke checks do not fall back to the
// historical v1.4.x 38-platform contract.
const expectedPlatforms = Number(process.env.TRENTHUB_EXPECTED_PLATFORMS || 51);
const url = process.argv[2] || process.env.TRENTHUB_REMOTE_URL || "https://trendhub-remote-production.up.railway.app/mcp";
const expectAgentFoundation = process.env.TRENHUB_EXPECT_AGENT_FOUNDATION === "1";
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
  const requiredSources = ["xiaohongshu", "weibo", "bilibili", "hackernews", "github-trending", "reddit-technology"];
  if (expectedPlatforms > 38) requiredSources.push("bluesky", "gdelt", "apple-podcasts");
  for (const required of requiredSources) {
    if (!uniquePlatformNames.has(required)) throw new Error(`list_platforms missing representative source ${required}`);
  }
  let resourceCount = 0;
  let templateCount = 0;
  if (expectAgentFoundation) {
    const resources = await client.listResources();
    const templates = await client.listResourceTemplates();
    resourceCount = resources.resources.length;
    templateCount = templates.resourceTemplates.length;
    for (const required of ["trendhub://namespace", "trendhub://contracts/evidence", "trendhub://capabilities", "trendhub://skill/trendhub"]) {
      if (!resources.resources.some((item) => item.uri === required)) throw new Error(`missing required v1.6 resource ${required}`);
    }
    for (const required of ["platform/{platform}/history", "capability/{capability}", "source/{source}"]) {
      if (!templates.resourceTemplates.some((item) => item.uriTemplate.includes(required))) throw new Error(`missing required v1.6 resource template ${required}`);
    }
    const namespace = await client.readResource({ uri: "trendhub://namespace" });
    const nsText = namespace.contents.find((item) => typeof item?.text === "string")?.text || "";
    if (!nsText.includes("trendhub-namespace-v1")) throw new Error("namespace resource contract mismatch");
    const evidence = await client.readResource({ uri: "trendhub://contracts/evidence" });
    const evText = evidence.contents.find((item) => typeof item?.text === "string")?.text || "";
    if (!evText.includes("trendhub-evidence-contract-v1")) throw new Error("evidence resource contract mismatch");
    const skill = await client.readResource({ uri: "trendhub://skill/trendhub" });
    const skillText = skill.contents.find((item) => typeof item?.text === "string")?.text || "";
    if (!skillText.includes("trendhub-skill-v2")) throw new Error("Skill 2.0 resource contract mismatch");
  }
  console.log(`REMOTE SMOKE OK tools=${names.length} platforms=${platforms.length} resources=${resourceCount} templates=${templateCount} url=${url}`);
  console.log(`tools: ${names.join(", ")}`);
  console.log(`platforms: ${platformNames.join(", ")}`);
} finally {
  await client.close().catch(() => {});
}
