from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
VERSION = "1.4.4"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    content = read(path)
    out, count = re.subn(pattern, lambda _m: replacement, content, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"expected one match in {path}, got {count}: {pattern}")
    write(path, out)


def set_json_version(path: str) -> None:
    obj = json.loads(read(path))
    obj["version"] = VERSION
    write(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


# A failed scheduled fetch must not erase the last usable persisted snapshot.
regex_once(
    "trendhub-mcp/src/store/snapshot.ts",
    r'''  for \(const r of results\) \{\n    const snap = readSnap\(r\.platform\);\n    snap\.previous = snap\.latest;\n    snap\.latest = r;\n    writeSnap\(r\.platform, snap\);\n    appendHistory\(r\);\n    report\.push\(\{ platform: r\.platform, ok: r\.dataQuality === "ok", items: r\.items\.length \}\);\n  \}''',
    '''  for (const r of results) {
    report.push({ platform: r.platform, ok: r.dataQuality === "ok", items: r.items.length });
    if (r.dataQuality === "missing" || !r.items.length) continue;
    const snap = readSnap(r.platform);
    snap.previous = snap.latest;
    snap.latest = r;
    writeSnap(r.platform, snap);
    appendHistory(r);
  }''',
)

# Snapshot-backed Web API and live-query fallback.
replace_once(
    "trendhub-mcp/src/web/api.ts",
    'import { takeSnapshots, updateFromResults, diffPlatform } from "../store/snapshot.js";',
    'import { takeSnapshots, updateFromResults, diffPlatform, readSnap } from "../store/snapshot.js";',
)
regex_once(
    "trendhub-mcp/src/web/api.ts",
    r'''function bad\(msg: string\): ApiResponse \{\n  return \{ status: 400, data: \{ error: msg \} \};\n\}\n''',
    '''function bad(msg: string): ApiResponse {
  return { status: 400, data: { error: msg } };
}

function snapshotFallback(platform: string, limit: number) {
  const snap = readSnap(platform);
  const cached = snap.latest?.items?.length
    ? snap.latest
    : snap.previous?.items?.length
      ? snap.previous
      : null;
  if (!cached) return null;
  return {
    ...cached,
    items: cached.items.slice(0, limit),
    dataQuality: cached.dataQuality === "missing" ? "degraded" : cached.dataQuality,
    note: [cached.note, `托管端最近成功快照 · ${cached.capturedAt}`].filter(Boolean).join("；"),
  };
}
''',
)

trending_case = '''    case "/api/trending": {
      const platform = q("platform");
      const category = q("category");
      const mode = q("mode") === "snapshot" ? "snapshot" : "live";
      const n = intParam(q("limit"), 20, 5, 50);
      return handled(async () => {
        const names = category && category !== "all"
          ? PLATFORMS.filter((p) => p.category === category).map((p) => p.platform)
          : platform
            ? [platform]
            : DEFAULT_PLATFORMS;
        const scope = category && category !== "all"
          ? `category:${category}`
          : platform || "default-core";
        let results: any[] = [];

        if (mode === "snapshot") {
          results = names.map((name) => snapshotFallback(name, n)).filter(Boolean);
        } else {
          let liveResults: any[] = [];
          if (category && category !== "all") liveResults = await getByCategory(category, n);
          else if (platform) liveResults = await getMany([platform], n);
          else liveResults = await getMany(DEFAULT_PLATFORMS, n);

          updateFromResults(liveResults);
          const liveByPlatform = new Map(liveResults.map((r) => [r.platform, r]));
          results = names
            .map((name) => {
              const live = liveByPlatform.get(name);
              if (live && live.dataQuality !== "missing" && live.items?.length) return live;
              return snapshotFallback(name, n) ?? live ?? null;
            })
            .filter(Boolean);
        }

        return {
          generatedAt: new Date().toISOString(),
          sourceMode: mode === "snapshot" ? "snapshot" : "live-with-snapshot-fallback",
          scope,
          platformCount: results.length,
          okCount: results.filter((r) => r.dataQuality === "ok").length,
          fallbackCount: results.filter((r) => String(r.note ?? "").includes("最近成功快照")).length,
          degradedOrMissing: results
            .filter((r) => r.dataQuality !== "ok")
            .map((r) => ({ platform: r.platform, dataQuality: r.dataQuality, note: r.note })),
          results,
        };
      });
    }

'''
regex_once(
    "trendhub-mcp/src/web/api.ts",
    r'''    case "/api/trending": \{.*?\n    case "/api/overlap": \{''',
    trending_case + '    case "/api/overlap": {',
)

xhs_case = '''    case "/api/xhs/topics": {
      const n = intParam(q("limit"), 30, 5, 40);
      const tn = intParam(q("topic_limit"), 20, 5, 50);
      const sourceMode = q("mode") === "snapshot" ? "snapshot" : "live";
      return handled(async () => {
        let feed: any = sourceMode === "snapshot" ? snapshotFallback("xiaohongshu", n) : null;
        let feedFromSnapshot = sourceMode === "snapshot" && Boolean(feed);
        if (!feed) {
          const liveFeed = await fetchXiaohongshu(n);
          const cached = liveFeed.dataQuality === "missing" || !liveFeed.items.length
            ? snapshotFallback("xiaohongshu", n)
            : null;
          feed = cached ?? liveFeed;
          feedFromSnapshot = Boolean(cached);
        }
        const derivedTopics = extractXhsTopics(feed.items.map((i: any) => i.title), tn);
        const loggedIn = xhsClient.hasLoginCookie();
        const officialHotlist = sourceMode === "snapshot"
          ? snapshotFallback("xiaohongshu-hotlist", 20)
          : loggedIn
            ? await fetchXiaohongshuHotlist(20)
            : null;
        if (sourceMode === "live") {
          const toStore = [
            ...(feedFromSnapshot ? [] : [feed]),
            ...(officialHotlist ? [officialHotlist] : []),
          ];
          if (toStore.length) updateFromResults(toStore);
        }
        return {
          generatedAt: new Date().toISOString(),
          sourceMode: sourceMode === "snapshot" ? "snapshot" : "live-with-snapshot-fallback",
          mode: loggedIn ? "cookie" : "guest",
          loggedIn,
          feed,
          derivedTopics,
          officialHotlist,
        };
      });
    }

'''
regex_once(
    "trendhub-mcp/src/web/api.ts",
    r'''    case "/api/xhs/topics": \{.*?\n    default:''',
    xhs_case + "    default:",
)

# Dashboard now opens with persisted evidence instead of metadata-only cards.
dashboard = '''VIEWS.dashboard = async function (content) {
  content.innerHTML = loading();
  const [health, latest] = await Promise.all([
    api("/api/health"),
    api("/api/trending?mode=snapshot&limit=5"),
    ensureMeta(),
  ]);
  const catTiles = CATS.platformCategories
    .map((c) => `<div class="tile" data-cat="${esc(c)}">${esc(c)} <span class="cat">分类</span></div>`)
    .join("");
  const latestCards = (latest.results || [])
    .slice(0, 4)
    .map((r) => `<div class="card" style="margin-bottom:12px"><h3>${esc(r.label || r.platform)}</h3><div class="captured">最近成功快照 ${fmtTime(r.capturedAt)}</div><div style="margin-top:8px">${itemsTable((r.items || []).slice(0, 5))}</div></div>`)
    .join("");
  content.innerHTML = `
    <div class="grid cols-4">
      ${statCard(health.platformCount, "接入平台")}
      ${statCard(CATS.platformCategories.length, "平台分类")}
      ${statCard(health.tools || 19, "MCP 工具")}
      ${statCard(health.runtime === "remote" ? "公网" : (window.TRENHUB_RUNTIME_MODE || "本地"), "运行模式")}
    </div>
    <div class="section-title">最新趋势快照</div>
    ${latestCards || note("warn", "托管端暂时没有可展示的成功快照；进入“当下热榜”可立即实时刷新。")}
    <div class="section-title">快捷入口</div>
    <div class="grid cols-4">
      ${quickCard("xhs", "小红书热点 · 主打", "最近成功快照 + 实时刷新；失败自动回退")}
      ${quickCard("trending", "当下热榜", "全平台快照优先，实时刷新失败自动回退")}
      ${quickCard("clusters", "共振话题发现", "无需关键词，自动聚类全网热点")}
      ${quickCard("brief", "创作简报", "证据卡 + 模板 + 可交给 AI 的 Prompt")}
    </div>
    <div class="section-title">按分类浏览热榜</div>
    <div class="card"><div class="platform-tiles">${catTiles}</div></div>
    <div class="section-title">数据纪律</div>
    <div class="grid cols-2">
      <div class="card"><h3>不编造、不估算</h3><p class="sub">取不到的字段一律为 null，并用 正常 / 降级 / 缺失 标记；每条数据带采集时刻 capturedAt 与来源链接；平台公布时间与采集时间分离。</p></div>
      <div class="card"><h3>隐私与算力</h3><p class="sub">TrendHub 不内置任何大模型 Key；趋势判断与脚本/文案/方案成稿仍由你正在使用的 AI 完成。公网模式仅开放安全查询能力，本地模式保留完整本机能力。</p></div>
    </div>`;
  content.querySelectorAll("[data-cat]").forEach((t) =>
    t.addEventListener("click", () => (location.hash = `#/trending?category=${encodeURIComponent(t.dataset.cat)}`))
  );
  content.querySelectorAll("[data-quick]").forEach((t) =>
    t.addEventListener("click", () => (location.hash = `#/${t.dataset.quick}`))
  );
};
'''
regex_once(
    "trendhub-mcp/web/views-a.js",
    r'''VIEWS\.dashboard = async function \(content\) \{.*?\n\};\nfunction statCard''',
    dashboard + "\nfunction statCard",
)
replace_once(
    "trendhub-mcp/web/views-a.js",
    '<button class="btn primary" id="btn-go">刷新小红书热点</button>',
    '<button class="btn primary" id="btn-go">实时刷新小红书热点</button>',
)
replace_once("trendhub-mcp/web/views-a.js", "  const run = async () => {", '  const run = async (sourceMode = "live") => {')
replace_once(
    "trendhub-mcp/web/views-a.js",
    '      const d = await api(`/api/xhs/topics?limit=${$("#f-limit").value}&topic_limit=24`);',
    '      const d = await api(`/api/xhs/topics?limit=${$("#f-limit").value}&topic_limit=24&mode=${encodeURIComponent(sourceMode)}`);',
)
replace_once(
    "trendhub-mcp/web/views-a.js",
    '  $("#btn-go").addEventListener("click", run);',
    '  $("#btn-go").addEventListener("click", () => run("live"));',
)
replace_once(
    "trendhub-mcp/web/views-a.js",
    '  run();\n};\nfunction xhsTopicBadge',
    '  run("snapshot");\n};\nfunction xhsTopicBadge',
)

trending_view = '''VIEWS.trending = function (content, params) {
  const catOpts = ['<option value="">核心榜单（默认 10 平台 · 小红书打头）</option>']
    .concat(CATS.platformCategories.map((c) => `<option ${params.category === c ? "selected" : ""}>${esc(c)}</option>`))
    .join("");
  const platOpts = ['<option value="">（按分类或默认）</option>']
    .concat(PLATFORMS.map((p) => `<option value="${esc(p.platform)}" ${params.platform === p.platform ? "selected" : ""}>${esc(p.label)} · ${esc(p.category)}</option>`))
    .join("");
  content.innerHTML = `
    <p class="lead">打开即显示托管端最近成功快照；点击“实时刷新”重新拉取当前热榜。实时源临时失败时自动回退到最近成功快照，不再显示空白。</p>
    <div class="controls">
      <label class="field">分类<select id="f-cat">${catOpts}</select></label>
      <label class="field">平台<select id="f-plat">${platOpts}</select></label>
      <label class="field">每平台条数<input class="input" id="f-limit" type="number" min="5" max="50" value="${esc(params.limit || 20)}" style="width:90px"></label>
      <button class="btn primary" id="btn-go">实时刷新</button>
    </div>
    <div id="out">${loading()}</div>`;
  const run = async (sourceMode = "live") => {
    const cat = $("#f-cat").value, plat = $("#f-plat").value, limit = $("#f-limit").value || 20;
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ limit: String(limit), mode: sourceMode });
      if (plat) qs.set("platform", plat);
      else if (cat) qs.set("category", cat);
      const d = await api(`/api/trending?${qs}`);
      const bad = (d.degradedOrMissing || []).filter((x) => x.dataQuality !== "ok");
      const modeNote = d.sourceMode === "snapshot"
        ? note("info", `当前显示托管端最近成功快照 · ${d.platformCount || 0} 个平台。`)
        : (d.fallbackCount ? note("warn", `本次有 ${d.fallbackCount} 个平台实时源不可用，已自动回退到最近成功快照。`) : "");
      $("#out").innerHTML =
        modeNote +
        (bad.length ? note("warn", `以下平台本次降级/缺失：${bad.map((b) => `${b.platform}（${b.note || b.dataQuality}）`).join("；")}`) : "") +
        ((d.results || []).length ? (d.results || []).map(platformCard).join("") : empty("暂无成功快照；点击“实时刷新”获取当前数据"));
    } catch (e) {
      $("#out").innerHTML = note("err", esc(e.message));
    }
  };
  $("#btn-go").addEventListener("click", () => run("live"));
  run("snapshot");
};
'''
regex_once(
    "trendhub-mcp/web/views-b.js",
    r'''VIEWS\.trending = function \(content, params\) \{.*?\n\};\nfunction platformCard''',
    trending_view + "\nfunction platformCard",
)

# Deterministic test: no external network dependency.
test_file = '''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-web-snapshot-"));
process.env.TRENTHUB_DATA_DIR = tmp;
const snapshotDir = path.join(tmp, "snapshots");
fs.mkdirSync(snapshotDir, { recursive: true });

const makeResult = (platform, label, title) => ({
  platform,
  label,
  category: "social",
  capturedAt: "2026-09-17T10:00:00.000Z",
  sourceUpdatedAt: null,
  dataQuality: "ok",
  note: null,
  items: [{ rank: 1, title, url: "https://example.com/item", hot: 100, hotText: "100", author: null, desc: null }],
});

fs.writeFileSync(path.join(snapshotDir, "weibo.json"), JSON.stringify({ latest: makeResult("weibo", "微博", "快照热榜"), previous: null }));
fs.writeFileSync(path.join(snapshotDir, "xiaohongshu.json"), JSON.stringify({ latest: makeResult("xiaohongshu", "小红书", "快照小红书"), previous: null }));

try {
  const { handleApi } = await import(`../dist/src/web/api.js?snapshot-test=${Date.now()}`);
  const trending = await handleApi("/api/trending", new URL("http://127.0.0.1/api/trending?platform=weibo&mode=snapshot&limit=5"), "GET", "");
  assert.equal(trending.status, 200);
  assert.equal(trending.data.sourceMode, "snapshot");
  assert.equal(trending.data.results.length, 1);
  assert.equal(trending.data.results[0].items[0].title, "快照热榜");

  const xhs = await handleApi("/api/xhs/topics", new URL("http://127.0.0.1/api/xhs/topics?mode=snapshot&limit=5&topic_limit=5"), "GET", "");
  assert.equal(xhs.status, 200);
  assert.equal(xhs.data.sourceMode, "snapshot");
  assert.equal(xhs.data.feed.items[0].title, "快照小红书");

  console.log("WEB SNAPSHOT FALLBACK TEST OK");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
'''
write("trendhub-mcp/scripts/test-web-snapshot-fallback.mjs", test_file)

# Version metadata.
pkg = json.loads(read("trendhub-mcp/package.json"))
pkg["version"] = VERSION
if "test-web-snapshot-fallback.mjs" not in pkg["scripts"]["test"]:
    pkg["scripts"]["test"] += " && node scripts/test-web-snapshot-fallback.mjs"
write("trendhub-mcp/package.json", json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")
for path in ["trendhub-mcp/manifest.json", "server.json", "plugin.json"]:
    set_json_version(path)
replace_once("trendhub-mcp/src/server.ts", 'export const SERVER_VERSION = "1.4.3";', 'export const SERVER_VERSION = "1.4.4";')
replace_once("trendhub-mcp/scripts/remote-gateway.mjs", 'const VERSION = "1.4.3";', 'const VERSION = "1.4.4";')
replace_once(
    "trendhub-mcp/scripts/test-distribution.mjs",
    'must(version === "1.4.3", `expected distribution patch 1.4.3, got ${version}`);',
    'must(version === "1.4.4", `expected distribution patch 1.4.4, got ${version}`);',
)
replace_once(".github/workflows/node.js.yml", "h.version!=='1.4.3'", "h.version!=='1.4.4'")

# Ensure the packaged license matches the repository license (v1.4.3 missed this copy).
write("trendhub-mcp/LICENSE", read("LICENSE"))

# Current-version docs. Historical markers remain where they explain when a feature/license started.
replace_once("README.md", "当前主技能 **TrendHub v1.4.3**", "当前主技能 **TrendHub v1.4.4**")
replace_once("README.md", "## TrendHub v1.4.3 能力", "## TrendHub v1.4.4 能力")
replace_once(
    "README.md",
    "**v1.4.2 起托管端内置定时趋势快照，按小时自动采集并持久化有界趋势历史**（本地可用 cron / Windows 任务计划程序）。",
    "**v1.4.2 起托管端内置定时趋势快照，按小时自动采集并持久化有界趋势历史**（本地可用 cron / Windows 任务计划程序）；**v1.4.4 起公网 Web Console 默认展示最近成功快照，实时刷新失败自动回退到持久化数据，避免第三方源瞬时不可用时出现空白。**",
)
replace_once("trendhub-mcp/README.md", "# TrendHub · 全网热点趋势专家 v1.4.2", "# TrendHub · 全网热点趋势专家 v1.4.4")
replace_once("trendhub-mcp/SKILL.md", "# TrendHub · 全网热点趋势专家 v1.4.2", "# TrendHub · 全网热点趋势专家 v1.4.4")
replace_once("trendhub-mcp/docs/setup-clients.md", "# 把 TrendHub v1.4.2 接入你的 AI 客户端", "# 把 TrendHub v1.4.4 接入你的 AI 客户端")
replace_once("trendhub-mcp/docs/access.md", "TrendHub v1.4.2 通过 GitHub **公开仓库**", "TrendHub v1.4.4 通过 GitHub **公开仓库**")
regex_once(
    "trendhub-mcp/docs/access.md",
    r'''> 法律许可另看 LICENSE：当前是 MIT.*?\n''',
    "> 法律许可另看 LICENSE：TrendHub v1.4.3+ 的 TrendHub 自有代码采用 **TrendHub Free Use License 1.0**。个人和公司可免费使用未修改版本；禁止修改、派生、再发布、再分发、转售、转授权或向第三方托管提供软件本身。v1.4.2 及更早版本保留其发布时已经授予的 MIT 权利。\n",
)
replace_once(
    "trendhub-mcp/README.md",
    "> TrendHub 负责取数、证据、确定性分析和创作脚手架；理解、判断与成稿由正在使用的 ChatGPT / Claude / 豆包 / DeepSeek / Gemini / Cursor 等 AI 使用自身算力完成。**不内置模型 API Key、默认零第三方遥测、无 TrendHub 中央数据回传。**",
    "> TrendHub 负责取数、证据、确定性分析和创作脚手架；理解、判断与成稿由正在使用的 ChatGPT / Claude / 豆包 / DeepSeek / Gemini / Cursor 等 AI 使用自身算力完成。**不内置模型 API Key、默认零第三方遥测、无 TrendHub 中央数据回传。**\n>\n> **v1.4.4 公网 Web 修复**：托管 Web Console 默认读取最近成功快照；用户主动实时刷新时，若第三方源临时不可用，则自动回退到持久化快照，避免页面空白。",
)
replace_once(
    "DISTRIBUTION.md",
    "Stable tool contract: **TrendHub v1.4.3, 19 MCP tools, 38 public trend sources**",
    "Stable tool contract: **TrendHub v1.4.4, 19 MCP tools, 38 public trend sources**",
)
replace_once(
    "DISTRIBUTION.md",
    "## Direct-use paths",
    "## v1.4.4 hosted Web behavior\n\nThe hosted Web Console reads the latest successful persisted snapshots for its initial view. Explicit live refreshes still query upstream sources, but transient missing/empty source responses fall back to the most recent successful snapshot. The 19-tool MCP contract and 38-source catalog are unchanged.\n\n## Direct-use paths",
)
regex_once(
    "trendhub-mcp/docs/remote-hosting.md",
    r'''- Only `/mcp`.*?\n- The local visual console and `/api/\*` are \*\*not\*\* exposed by the gateway\.''',
    "- `/mcp`, `/health`, `/privacy`, `/terms`, `/.well-known/mcp.json`, the responsive Web Console at `/`, and an explicit read/query `/api/*` allowlist are public.\n- Mutating/local-only routes such as `/api/snapshot` remain blocked by the gateway; the public Web Console cannot trigger writes.",
)
replace_once(
    "trendhub-mcp/docs/remote-hosting.md",
    "- `GET /` — minimal landing page",
    "- `GET /` — responsive read/query Web Console\n- `GET /api/*` — explicit safe GET allowlist used by the Web Console",
)
regex_once(
    "trendhub-mcp/docs/terms.md",
    r'''## Open-source license\n\nThe TrendHub source code is distributed under the repository's MIT License\. These hosted-service terms govern use of the public hosted endpoint and do not remove rights granted by the open-source license\.''',
    "## Software license\n\nTrendHub v1.4.3 and later TrendHub-authored code is source-available under the **TrendHub Free Use License 1.0**. Personal use and internal company/business use of unmodified copies are permitted; modification, derivative works, redistribution, republication, sublicensing, resale, and third-party hosted access to the software itself are prohibited unless separately authorized. TrendHub v1.4.2 and earlier retain the license rights granted when those releases were published. Third-party components remain under their own licenses.",
)
replace_once(
    "trendhub-mcp/scripts/remote-gateway.mjs",
    "The open-source TrendHub code is distributed under the repository's MIT License. These hosted-service terms govern use of the public endpoint and do not remove rights granted by the open-source license.",
    "TrendHub v1.4.3 and later TrendHub-authored code is source-available under the TrendHub Free Use License 1.0. Personal and internal company/business use of unmodified copies is permitted; modification, derivative works, redistribution, republication, sublicensing, resale, and third-party hosted access to the software itself are prohibited unless separately authorized. TrendHub v1.4.2 and earlier retain the rights granted when those releases were published. Third-party components remain under their own licenses.",
)

# Regression gates: current license copy + hosted terms + Web fallback.
replace_once(
    "trendhub-mcp/scripts/test-distribution.mjs",
    'const gateway = readFileSync(join(ROOT, "scripts", "remote-gateway.mjs"), "utf8");',
    'const gateway = readFileSync(join(ROOT, "scripts", "remote-gateway.mjs"), "utf8");\nconst webApi = readFileSync(join(ROOT, "src", "web", "api.ts"), "utf8");\nconst packageLicense = readFileSync(join(ROOT, "LICENSE"), "utf8");',
)
replace_once(
    "trendhub-mcp/scripts/test-distribution.mjs",
    'must(terms.includes("not factual guarantees"), "terms must bound analytical indicators");',
    'must(terms.includes("not factual guarantees"), "terms must bound analytical indicators");\nmust(terms.includes("TrendHub Free Use License 1.0") && !terms.includes("distributed under the repository\'s MIT License"), "hosted terms must match the v1.4.3+ license boundary");\nmust(webApi.includes("live-with-snapshot-fallback") && webApi.includes("snapshotFallback"), "hosted Web snapshot fallback contract missing");',
)
replace_once(
    "trendhub-mcp/scripts/test-distribution.mjs",
    'must(productLicense.includes("TrendHub Free Use License 1.0"), "root product license title missing");',
    'must(productLicense.includes("TrendHub Free Use License 1.0"), "root product license title missing");\nmust(packageLicense === productLicense, "packaged LICENSE must match repository product LICENSE");',
)

print("v1.4.4 patch applied")
