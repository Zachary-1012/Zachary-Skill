#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = (name) => readFile(join(root, "web", name), "utf8");

const [index, app, viewsA, viewsB, viewsE, styles, viewsD] = await Promise.all([
  web("index.html"), web("app.js"), web("views-a.js"), web("views-b.js"),
  web("views-e.js"), web("experience-v2.css"), web("views-d.js"),
]);

const banned = [
  "Intelligence Workspace", "SUBJECT FIELD", "SUBJECT CONTEXT", "RESEARCH AXIS",
  "PRODUCTION TRUTH", "EVIDENCE TRACE", "Subject Field", "Research Axis",
  "subject-aperture", "question-axis", "trace-stage", "trace-flow",
  "interpretation-strata", "--th-field-max", "changeSummary",
  "Entity-first", "entity-first", "Entity First", "Evidence Contract",
  "WHAT CHANGED", "UPCOMING NODES", "EVIDENCE GAPS",
  "专业趋势情报", "信源与品牌宇宙", "工作区与监测",
  "truth-line", "path-index", "boundary-notes",
];
for (const [name, content] of [["index", index], ["app", app], ["views-a", viewsA], ["views-e", viewsE], ["experience-v2.css", styles]]) {
  for (const term of banned) {
    assert.ok(!content.includes(term), `${name} 仍向使用者暴露内部术语/旧结构：${term}`);
  }
}

/* 顶层只保留用户任务，不平铺工具。 */
for (const view of ["research", "discover", "watch", "settings"]) {
  assert.match(index, new RegExp(`data-view="${view}"`));
}
assert.doesNotMatch(index, /data-view="dashboard"/, "主导航不得恢复旧 Dashboard 入口");
for (const hiddenTool of ["xhs", "trending", "clusters", "overlap", "curve", "related", "signals", "events", "topic", "sources", "workspace", "ops"]) {
  assert.doesNotMatch(index, new RegExp(`data-view="${hiddenTool}"`), `主导航泄漏工具入口：${hiddenTool}`);
}
assert.match(index, /sidebarRecents/);
assert.match(app, /renderSidebarRecents/);
assert.ok(app.includes('$$(".nav-item").forEach'), "route must iterate all nav items");

/* 首页是工作入口，不是概念官网。 */
assert.match(viewsA, /home-search/);
assert.match(viewsA, /\/api\/trending\?mode=snapshot/);
assert.match(viewsA, /最近研究/);
assert.match(viewsA, /关注/);
assert.match(viewsA, /最近出现/);
assert.doesNotMatch(viewsA, /研究一个主体，先看证据再下结论|你要理解什么正在变化/);

/* 发现页围绕变化，而不是围绕工具。 */
assert.match(viewsB, /VIEWS\.discover/);
assert.match(viewsB, /\/api\/clusters/);
assert.match(viewsB, /\/api\/changes/);
assert.match(viewsB, /正在聚集/);
assert.match(viewsB, /刚刚出现/);

/* 研究页：连续阅读 + 来源抽屉，仍由后端 /api/review 驱动。 */
assert.match(viewsE, /\/api\/review/);
assert.match(viewsE, /depth: "quick"/);
for (const label of ["发生了什么", "为什么值得注意", "哪些平台支持这个判断", "下一步"]) {
  assert.match(viewsE, new RegExp(label), `主体页缺少用户工作流：${label}`);
}
assert.match(viewsE, /evidenceDrawer/);
assert.match(viewsE, /openEvidenceDrawer/);
assert.match(viewsE, /renderDecision/);
assert.match(viewsE, /rv-skeleton|rvSkeleton/);
assert.doesNotMatch(viewsE, /href="#\/dashboard"/);
assert.doesNotMatch(viewsE, /changeSummary/);

/* 内容面而不是八区块报表/KPI墙。 */
assert.match(styles, /\.research-summary/);
assert.match(styles, /\.evidence-drawer/);
assert.match(styles, /\.sidebar-recents/);
assert.match(styles, /\.home-search/);
assert.match(styles, /\.home-title[\s\S]*overflow-wrap: anywhere/);
assert.doesNotMatch(styles, /\.rv-section|subject-aperture|question-axis|trace-stage|interpretation-strata/);

/* 旧简报页不再进入顶层导航；完整创作工作台由 v2 路由承接。 */
assert.match(viewsD, /交给 AI 的写作提示词/);
assert.doesNotMatch(index, /data-view="brief"/);
assert.match(viewsD, /高级功能/);
assert.match(viewsD, /这些能力仍然存在，但不会占据主导航/);

/* 资源版本随候选版本。 */
assert.match(index, /experience-v2\.css\?v=2\.0\.4/);
assert.match(index, /app\.js\?v=2\.0\.4/);

console.log("UI LANGUAGE TEST OK nav=user-tasks research=continuous evidence=on-demand no-internal-terms");
