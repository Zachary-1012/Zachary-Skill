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
assert.equal(skill.productVersion, "1.7.0");
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
const styles = await readFile(join(root, "web", "intelligence-v1.css"), "utf8");
const queryEvidence = await readFile(join(root, "src", "sources", "query-evidence.ts"), "utf8");

assert.match(index, /Intelligence Workspace/);
assert.match(index, /intelligence-v1\.css\?v=1\.7\.0/);
assert.match(home, /不是看新闻/);
assert.match(home, /Entity-first/);
assert.match(professional, /每个信号通道都给结论/);
assert.match(professional, /证据缺口/);
assert.match(styles, /decision-workspace/);
for (const channel of ["google-news-cn", "google-news-global", "gdelt-query", "bluesky-query", "apple-podcasts-query"]) {
  assert.match(queryEvidence, new RegExp(channel));
}

const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
assert.equal(manifest.version, "1.7.0");
assert.equal(manifest.professionalIntelligence.methodologyVersion, "professional-intelligence-v3");
assert.equal(manifest.professionalIntelligence.webExperience, "decision-first-intelligence-workspace");
assert.equal(manifest.tools.length, 21);

console.log("V1.7 INTELLIGENCE WORKSPACE OK entity-first=v1 professional=v3 report=v2 tools=21 web=decision-first");
