#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const web = (name) => readFile(join(root, "web", name), "utf8");

const [index, app, viewsA, viewsE, styles, viewsD] = await Promise.all([
  web("index.html"), web("app.js"), web("views-a.js"), web("views-e.js"), web("experience-v2.css"), web("views-d.js"),
]);

/* 主用户路径（首页 / 研究结果页 / 外壳）不得出现任何内部系统语言或旧方法论视觉结构 */
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

/* 外壳含统一研究入口（首页四区由 views-a 首屏同步渲染，在下面断言） */
assert.match(index, /开始研究/);
assert.match(index, /data-view="research"/);
assert.match(viewsA, /home-search/);
assert.match(viewsA, /\/api\/trending\?mode=snapshot/);
assert.match(viewsA, /startResearch/);
assert.match(viewsA, /最近研究/);
assert.match(viewsA, /正在关注/);
assert.match(viewsA, /趋势发现/);
/* 首页趋势发现走快照（毫秒级），不允许在首屏阻塞式拉 live 集群 */
assert.match(viewsA, /loadHomeDiscover/);

/* 主体页八区由后端 /api/review ViewModel 驱动，前端不再自行拼结论 */
assert.match(viewsE, /\/api\/review/);
for (const kicker of ["当前结论", "趋势变化", "关键驱动", "平台表现", "证据", "机会与风险", "建议", "操作"]) {
  assert.match(viewsE, new RegExp(kicker), `主体页缺少分区：${kicker}`);
}
assert.match(viewsE, /renderDecision/);
assert.match(viewsE, /rv-skeleton|rvSkeleton/); // 渐进返回：先骨架、慢源补齐，不长时间整屏 spinner
assert.doesNotMatch(viewsE, /changeSummary/);

/* 样式：新任务→结果类存在，旧 field/axis/trace 类移除 */
assert.match(styles, /\.rv-section/);
assert.match(styles, /\.home-search/);
assert.match(styles, /\.rv-conclusion/);
assert.doesNotMatch(styles, /subject-aperture|question-axis|trace-stage|interpretation-strata/);

/* app 外壳与本机存储 */
assert.match(app, /DOMContentLoaded/);
assert.match(app, /TH_STORE/);
assert.match(app, /startResearch/);

/* 创作页：面向使用者的是“写作提示词”，productionPrompt 只能作为机器字段残留 */
assert.match(viewsD, /交给 AI 的写作提示词/);
assert.doesNotMatch(viewsD, /的 productionPrompt/);

/* 资源版本随 1.7.2 */
assert.match(index, /experience-v2\.css\?v=1\.7\.2/);
assert.match(index, /app\.js\?v=1\.7\.2/);

console.log("UI LANGUAGE TEST OK user-only-words home=4sections research=8sections renderer-only no-internal-terms");
