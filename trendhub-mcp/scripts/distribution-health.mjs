#!/usr/bin/env node

const VERSION = "1.4.1";
const NAME = "io.github.Zachary-1012/trendhub";
const REMOTE = "https://trendhub-remote-production.up.railway.app/mcp";
const OFFICIAL_API = `https://registry.modelcontextprotocol.io/v0.1/servers?search=${encodeURIComponent(NAME)}&version=latest`;
const OFFICIAL_UI = "https://registry.modelcontextprotocol.io/?q=trendhub";
const GLAMA = "https://glama.ai/mcp/connectors/io.github.Zachary-1012/trendhub";

function must(condition, message) {
  if (!condition) throw new Error(`DISTRIBUTION HEALTH FAILED: ${message}`);
}

async function fetchChecked(url, label) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "user-agent": "TrendHub-Distribution-Health/1.0 (+https://github.com/Zachary-1012/Zachary-Skill)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  must(response.ok, `${label} returned HTTP ${response.status}`);
  return response;
}

const officialResponse = await fetchChecked(OFFICIAL_API, "Official MCP Registry API");
const official = await officialResponse.json();
const rows = Array.isArray(official?.servers) ? official.servers : [];
const row = rows.find((item) => item?.server?.name === NAME);
must(row, `Official MCP Registry does not return ${NAME}`);
must(row.server.version === VERSION, `Official MCP Registry version=${row.server.version}, expected ${VERSION}`);
must(row.server.remotes?.some((remote) => remote?.type === "streamable-http" && remote?.url === REMOTE), "Official MCP Registry remote URL mismatch");
const officialMeta = row?._meta?.["io.modelcontextprotocol.registry/official"];
must(officialMeta?.status === "active", `Official MCP Registry status=${officialMeta?.status}`);
must(officialMeta?.isLatest === true, "Official MCP Registry entry is not latest");

const officialUiText = await (await fetchChecked(OFFICIAL_UI, "Official MCP Registry UI")).text();
must(officialUiText.includes(NAME), "Official MCP Registry UI search does not render TrendHub");
must(officialUiText.includes(`v${VERSION}`) || officialUiText.includes(VERSION), "Official MCP Registry UI search does not render v1.4.1");

const glamaText = await (await fetchChecked(GLAMA, "Glama connector page")).text();
must(/TrendHub/i.test(glamaText), "Glama connector page does not identify TrendHub");
must(/19\s+tools/i.test(glamaText) || /Available Tools/i.test(glamaText), "Glama connector page does not expose the tool catalog");

console.log(`DISTRIBUTION HEALTH OK version=${VERSION} official=active+searchable glama=searchable remote=${REMOTE}`);
