#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { skillContract } from "../dist/src/agent-native/skill-contract.js";
import { buildProfessionalIntelligence } from "../dist/src/analysis/professional.js";
import { buildExecutiveReport } from "../dist/src/reports/executive.js";

const root = new URL("..", import.meta.url).pathname;
const repoRoot = join(root, "..");

const skill = skillContract();
assert.equal(skill.productVersion, "1.7.2");
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
assert.match(index, /experience-v2\.css\?v=1\.7\.2/);
assert.match(index, /data-view="research"/);
assert.match(index, /开始研究/);
assert.match(index, /data-view="research"/);
assert.match(index, /navigationSheet/);
assert.match(index, /topbar-inner/);
assert.match(index, /navBackdrop/);

/* 首页：单一搜索入口 + 最近研究/正在关注/趋势发现，发现走快照保证首屏秒开 */
assert.match(home, /home-search/);
assert.match(home, /\/api\/trending\?mode=snapshot/);
assert.match(home, /startResearch/);
for (const label of ["最近研究", "正在关注", "趋势发现"]) assert.match(home, new RegExp(label));
assert.doesNotMatch(home, /subject-aperture|question-axis|你要理解什么正在变化/);

/* 主体页：八区由后端 /api/review ViewModel 驱动，前端只渲染；渐进返回，不长时间整屏 spinner */
const researchBlock = professional.slice(professional.indexOf("VIEWS.research ="), professional.indexOf("VIEWS.sources ="));
assert.ok(researchBlock.includes("VIEWS.research ="), "research view block must exist");
assert.match(researchBlock, /\/api\/review/);
assert.match(researchBlock, /depth: "quick"/);
assert.match(researchBlock, /正在补充更多平台和趋势数据/);
for (const section of ["当前结论", "趋势变化", "关键驱动", "平台表现", "证据", "机会与风险", "建议", "操作"]) {
  assert.match(researchBlock, new RegExp(section), `research view missing section ${section}`);
}
assert.match(researchBlock, /renderDecision/);
assert.match(researchBlock, /rv-skeleton|rvSkeleton/);
assert.doesNotMatch(researchBlock, /subject-field|trace-flow|trace-change|trace-interpret|trace-evidence|trace-action|trace-stage|changeSummary|SUBJECT CONTEXT|EVIDENCE TRACE/);
/* 机器合同 /api/professional 与深链别名保留给 MCP/报告/高级使用者 */
assert.match(professional, /\/api\/professional/);
assert.match(professional, /VIEWS\.professional/);

/* 样式：任务→结果编辑式分区，旧 field/axis/trace 视觉全部移除，外壳对齐轴保留 */
assert.match(styles, /\.rv-section/);
assert.match(styles, /\.home-search/);
assert.match(styles, /\.topbar-inner,/);
assert.doesNotMatch(styles, /Subject Field -> Change Axis|\.trace-stage|--th-field-max|subject-aperture|question-axis/);

assert.match(app, /DOMContentLoaded/);
assert.match(app, /TH_STORE/);
assert.match(app, /startResearch/);
assert.doesNotMatch(viewsD, /\nroute\(\);\s*$/);
assert.match(viewsD, /交给 AI 的写作提示词/);
for (const channel of ["google-news-cn", "google-news-global", "gdelt-query", "bluesky-query", "apple-podcasts-query"]) {
  assert.match(queryEvidence, new RegExp(channel));
}

const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
assert.equal(manifest.version, "1.7.2");
assert.equal(manifest.professionalIntelligence.methodologyVersion, "professional-intelligence-v3");
assert.equal(manifest.professionalIntelligence.webExperience, "task-first-decision-view");
assert.equal(manifest.professionalIntelligence.primaryComposition, "task-content-result-action-user-only-language");
assert.equal(manifest.tools.length, 21);

console.log("V1.7 TASK-RESULT AUTHORITY OK entity-first=v1 professional=v3 report=v2 tools=21 web=task-first-decision-view home=4 sections research=8 sections renderer-only deep-link=deterministic");
