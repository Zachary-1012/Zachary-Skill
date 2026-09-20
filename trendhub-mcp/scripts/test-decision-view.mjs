#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildProfessionalIntelligence } from "../dist/src/analysis/professional.js";
import { buildDecisionView } from "../dist/src/analysis/decision-view.js";

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
  drivers: [{ id: "d1", title: "十五周年店庆带动客流", reason: "重复主题", evidenceRefs: [] }],
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
const view = buildDecisionView(intel);

assert.equal(view.schema, "trendhub-decision-view-v1");
assert.equal(view.subject.name, "广州太古汇");
assert.equal(view.subject.kind, "自定义主体");

// 当前结论
assert.match(view.current.conclusion, /主体证据/);
assert.equal(view.current.strengthText, "证据中等");
assert.equal(view.current.tone, "moderate");
assert.match(view.current.visibilityText, /公开讨论/);
assert.equal(view.current.evidenceCount, 9);
assert.equal(view.current.channelCount, 4);
assert.match(view.current.hotlistText, /暂未在公开热榜/);

// 趋势变化
assert.equal(view.change.text, "相对搜索热度上升。");
assert.equal(view.change.directionText, "上升");
assert.equal(view.change.changePct, 25);
assert.equal(view.change.peak, 88);
assert.match(view.change.qualityText, /可用/);

// 平台表现（中文化 + 三态）
assert.equal(view.platforms.length, 1);
const p = view.platforms[0];
assert.equal(p.name, "Google News · 中文");
assert.equal(p.familyText, "新闻 / 权威媒体");
assert.equal(p.state, "ok");
assert.equal(p.stateText, "可用");
assert.equal(p.count, 3);
assert.equal(p.evidence[0].source, "Example");
assert.equal(p.evidence[0].url, "https://example.com/a");

// 驱动 / 机会 / 风险 / 缺口 / 建议
assert.match(view.drivers[0].title, /十五周年/);
assert.ok(view.opportunities.length >= 1);
assert.ok(view.risks.length >= 1);
assert.match(view.gaps[0].title, /小红书/);
assert.ok(view.gaps[0].nextStep.length > 0);
assert.equal(view.suggestions[0].title, "复核主体证据");
assert.equal(view.suggestions[0].priority, "now");
assert.equal(view.suggestions[0].priorityText, "建议立即做");

// 数据说明必须是普通人话，且不把缺失当 0
assert.ok(view.dataNote.length > 20);
assert.match(view.dataNote, /不会被当作|不等于/);

// 内部系统术语零泄漏：VM 序列化后不得出现方法论/契约/工具/实体优先等机器字段
const json = JSON.stringify(view);
for (const banned of [
  "methodologyVersion",
  "professional-intelligence",
  "entity-first",
  "entityFirst",
  "evidenceContract",
  "researchAxis",
  "professionalSignals",
  "decisionState",
  "sourceArchitecture",
  "Evidence Contract",
  "Research Axis",
  "Entity-first",
]) {
  assert.ok(!json.includes(banned), `decision view leaked internal term: ${banned}`);
}

// 健壮性：研究为空 / 缺字段时不抛错，且给出可理解的降级文案
const emptyIntel = buildProfessionalIntelligence("某新品牌", [], new Date("2026-09-20T00:00:00.000Z"), null);
const emptyView = buildDecisionView(emptyIntel);
assert.equal(emptyView.schema, "trendhub-decision-view-v1");
assert.equal(emptyView.subject.name, "某新品牌");
assert.ok(Array.isArray(emptyView.platforms));
assert.ok(typeof emptyView.current.conclusion === "string" && emptyView.current.conclusion.length > 0);

console.log("DECISION VIEW TEST OK schema=v1 chinese=8sections no-internal-terms null-safe");
