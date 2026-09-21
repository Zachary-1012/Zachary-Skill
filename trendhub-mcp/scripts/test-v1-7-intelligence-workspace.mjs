#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { skillContract } from "../dist/src/agent-native/skill-contract.js";
import { buildProfessionalIntelligence } from "../dist/src/analysis/professional.js";
import { buildExecutiveReport } from "../dist/src/reports/executive.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const skill = skillContract();
assert.equal(skill.productVersion, "1.7.4");
assert.equal(skill.compatibilityTools, 21);
assert.equal(skill.routing.entityFirst.tool, "professional_intelligence");
assert.equal(skill.routing.topicFirst.tool, "analyze_topic");
assert.equal(skill.routing.rawTrending.tool, "get_trending");
assert.match(skill.routing.entityFirst.rule, /subject-specific public evidence/i);

const mockResearch = {
  methodologyVersion: "entity-first-research-v1",
  generatedAt: "2026-09-20T00:00:00.000Z",
  subject: {
    input: "广州太古汇",
    researchMode: "entity-first",
    resolved: false,
    canonicalName: "广州太古汇",
    entityId: null,
    aliases: [],
    queryTerms: ["广州太古汇"],
    note: "custom subject",
  },
  currentState: {
    evidenceStrength: "moderate",
    visibility: "active-subject-evidence",
    conclusion: "存在主体证据，但没有形成热榜共振。",
    observedChannels: 4,
    totalEvidenceItems: 9,
    hotlistPlatformsHit: 0,
    hotlistMentions: 0,
  },
  channelAnalysis: [{
    id: "google-news-cn",
    label: "Google News · 中文",
    family: "news-authority",
    dataQuality: "ok",
    itemCount: 3,
    conclusion: "检索到主体相关新闻。",
    evidence: [{ channel: "google-news-cn", source: "Example", title: "广州太古汇相关事件", url: "https://example.com/a", publishedAt: "2026-09-19T00:00:00.000Z" }],
    note: "search relevance is not popularity",
  }],
  searchIntent: {
    dataQuality: "ok",
    direction: "rising",
    changePct: 25,
    peak: 88,
    relatedTop: [],
    relatedRising: [],
    conclusion: "相对搜索热度上升。",
  },
  drivers: [{ id: "d1", title: "十五周年", reason: "重复主题", evidenceRefs: [] }],
  opportunities: [{ id: "o1", title: "实体研究机会", reason: "有主体证据但非全网热点", evidenceRefs: [] }],
  risks: [{ id: "r1", title: "热榜误读", reason: "未上热榜不等于无人讨论", evidenceRefs: [] }],
  evidenceGaps: [{ id: "g1", title: "小红书深搜未观测", reason: "AUTH_REQUIRED", nextStep: "仅在本地授权" }],
  recommendedActions: [{ id: "a1", action: "复核主体证据", reason: "先证据后结论", priority: "now" }],
  upcomingNodes: [],
  raw: {
    publicQueryChannels: [],
    hotlistOverlap: {},
    googleTrend: {},
    relatedQueries: {},
    xiaohongshu: { mode: "guest", dataQuality: "degraded", feedMentions: [], keywordMatches: null, note: "AUTH_REQUIRED" },
    curatedSignals: {},
  },
};

const intel = buildProfessionalIntelligence("广州太古汇", [], new Date("2026-09-20T00:00:00.000Z"), mockResearch);
assert.equal(intel.methodologyVersion, "professional-intelligence-v3");
assert.equal(intel.compatibilityBase, "professional-intelligence-v2");
assert.equal(intel.research.currentState.visibility, "active-subject-evidence");
assert.equal(intel.decisionState.currentVisibility, "active-subject-evidence");
assert.ok(intel.decisionState.opportunityFlags.includes("entity_evidence_without_hotlist_hype"));

const report = buildExecutiveReport(intel);
assert.equal(report.schemaVersion, "trendhub-executive-report-v2");
assert.equal(report.subject.canonicalName, "广州太古汇");
assert.match(report.decisionBrief.currentState, /主体证据/);
assert.equal(report.decisionBrief.recommendedActions[0].priority, "now");

const index = await readFile(join(root, "web", "index.html"), "utf8");
const home = await readFile(join(root, "web", "views-a.js"), "utf8");
const professional = await readFile(join(root, "web", "views-e.js"), "utf8");
const styles = await readFile(join(root, "web", "experience-v2.css"), "utf8");
const app = await readFile(join(root, "web", "app.js"), "utf8");
const viewsD = await readFile(join(root, "web", "views-d.js"), "utf8");
const queryEvidence = await readFile(join(root, "src", "sources", "query-evidence.ts"), "utf8");

/* 使用者只看到任务、内容、结果、操作；内部系统语言不得出现在外壳与主路径 */
assert.doesNotMatch(index, /Intelligence Workspace|Subject Field|Research Axis|Evidence Trace|subject-aperture|trace-stage/);
assert.match(index, /experience-v2\.css\?v=1\.7\.4/);
for (const view of ["research", "discover", "watch", "settings"]) {
  assert.match(index, new RegExp(`data-view="${view}"`));
}
assert.doesNotMatch(index, /data-view="dashboard"/, "legacy dashboard must not return to primary navigation");
for (const hiddenTool of ["xhs", "trending", "clusters", "overlap", "curve", "related", "signals", "events", "topic", "sources", "workspace", "ops"]) {
  assert.doesNotMatch(index, new RegExp(`data-view="${hiddenTool}"`), `tool route leaked into primary navigation: ${hiddenTool}`);
}
assert.match(index, /sidebarRecents/);
assert.match(index, /navigationSheet/);

/* 首页：单一研究入口 + 最近研究 + 关注 + 最近出现。 */
assert.match(home, /home-search/);
assert.match(home, /\/api\/trending\?mode=snapshot/);
assert.match(home, /startResearch/);
assert.match(home, /最近研究/);
assert.match(home, /关注/);
assert.match(home, /最近出现/);
assert.doesNotMatch(home, /研究一个主体，先看证据再下结论|你要理解什么正在变化|subject-aperture|question-axis/);

/* 发现：跨平台聚集 + 最近变化。 */
const viewsB = await readFile(join(root, "web", "views-b.js"), "utf8");
assert.match(viewsB, /VIEWS\.discover/);
assert.match(viewsB, /\/api\/clusters/);
assert.match(viewsB, /\/api\/changes/);
assert.match(viewsB, /正在聚集/);
assert.match(viewsB, /刚刚出现/);

/* 研究页：连续工作面 + 按需来源抽屉；快速层先返回。 */
const researchBlock = professional.slice(professional.indexOf("VIEWS.research ="), professional.indexOf("VIEWS.sources ="));
assert.ok(researchBlock.includes("VIEWS.research ="), "research view block must exist");
assert.match(researchBlock, /\/api\/review/);
assert.match(researchBlock, /depth: "quick"/);
for (const section of ["发生了什么", "为什么值得注意", "哪些平台支持这个判断", "下一步"]) {
  assert.match(researchBlock, new RegExp(section), `research flow missing: ${section}`);
}
assert.match(researchBlock, /evidenceDrawer/);
assert.match(researchBlock, /openEvidenceDrawer/);
assert.match(researchBlock, /renderDecision/);
assert.match(researchBlock, /rv-skeleton|rvSkeleton/);
assert.doesNotMatch(researchBlock, /subject-field|trace-flow|trace-change|trace-interpret|trace-evidence|trace-action|trace-stage|changeSummary|SUBJECT CONTEXT|EVIDENCE TRACE/);

/* 样式：内容优先，不是 KPI 卡片墙或八区报表。 */
assert.match(styles, /\.research-summary/);
assert.match(styles, /\.evidence-drawer/);
assert.match(styles, /\.home-search/);
assert.match(styles, /\.sidebar-recents/);
assert.doesNotMatch(styles, /\.rv-section|subject-aperture|question-axis|trace-stage|interpretation-strata/);

assert.match(app, /DOMContentLoaded/);
assert.match(app, /TH_STORE/);
assert.match(app, /renderSidebarRecents/);
assert.match(app, /startResearch/);
assert.doesNotMatch(viewsD, /\nroute\(\);\s*$/);
assert.match(viewsD, /交给 AI 的写作提示词/);
for (const channel of ["google-news-cn", "google-news-global", "gdelt-query", "bluesky-query", "apple-podcasts-query"]) {
  assert.match(queryEvidence, new RegExp(channel));
}

const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
assert.equal(manifest.version, "1.7.4");
assert.equal(manifest.professionalIntelligence.methodologyVersion, "professional-intelligence-v3");
assert.equal(manifest.professionalIntelligence.webExperience, "user-task-research-workspace");
assert.equal(manifest.professionalIntelligence.primaryComposition, "research-summary-change-support-next");
assert.deepEqual(manifest.professionalIntelligence.primaryNavigation, ["research", "discover", "watch", "settings"]);
assert.equal(manifest.tools.length, 21);

console.log("V1.7 USER PRODUCT AUTHORITY OK tools=21 nav=user-tasks research=continuous evidence=on-demand renderer-only");
