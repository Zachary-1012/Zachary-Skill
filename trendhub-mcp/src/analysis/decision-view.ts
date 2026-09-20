/**
 * Decision View —— 面向普通使用者的研究结果视图（v1.7.2）。
 *
 * 这是后端唯一面向网页使用者的“投影层”：把 Professional Intelligence 的完整
 * 证据结构翻译成普通人能直接阅读的中文结论与分区。前端只负责渲染，不再自行
 * 拼结论、不做业务判断。
 *
 * 纪律：
 * - 只输出使用者语言，不输出任何内部系统术语（方法论 / 证据契约 / 工具 / 实体优先等）。
 * - 不新增、不篡改任何证据；缺失就如实标注“暂缺 / 需本地登录”，绝不写成 0 或“没有”。
 * - 纯函数、不联网，可离线单测；底层 Entity-first / Evidence / 21 工具合同保持不变。
 */
import type { ProfessionalIntelligence } from "./professional.js";
import type { EntityResearchPack } from "./entity-research.js";

export type DecisionTone = "strong" | "moderate" | "limited" | "insufficient";
export type PlatformState = "ok" | "degraded" | "missing";

export interface DecisionEvidenceItem {
  source: string;
  time: string | null;
  title: string;
  url: string | null;
}

export interface DecisionPlatform {
  name: string;
  familyText: string;
  state: PlatformState;
  stateText: string;
  count: number;
  conclusion: string;
  evidence: DecisionEvidenceItem[];
  note: string;
}

export interface DecisionView {
  /** 机器版本号，仅供程序判断，不在界面展示。 */
  schema: "trendhub-decision-view-v1";
  generatedAt: string;
  subject: { name: string; kind: string };
  ready: boolean;
  current: {
    conclusion: string;
    strengthText: string;
    visibilityText: string;
    tone: DecisionTone;
    evidenceCount: number;
    channelCount: number;
    hotlistText: string;
  };
  change: {
    text: string;
    directionText: string;
    changePct: number | null;
    peak: number | null;
    qualityText: string;
    related: { rising: string[]; top: string[] };
    curve: { points: Array<{ date: string; value: number }>; scaleNote: string } | null;
    forecast: { statusText: string; rows: Array<{ horizonText: string; value: string; deltaText: string }>; validationText: string } | null;
  };
  drivers: Array<{ title: string; reason: string }>;
  platforms: DecisionPlatform[];
  opportunities: Array<{ title: string; reason: string }>;
  risks: Array<{ title: string; reason: string }>;
  gaps: Array<{ title: string; reason: string; nextStep: string }>;
  suggestions: Array<{ title: string; reason: string; priority: string; priorityText: string }>;
  upcoming: Array<{ name: string; date: string; impact: string }>;
  dataNote: string;
}

const STRENGTH_TEXT: Record<string, string> = {
  strong: "证据充分",
  moderate: "证据中等",
  limited: "证据有限",
  insufficient: "证据不足",
};

const STRENGTH_TONE: Record<string, DecisionTone> = {
  strong: "strong",
  moderate: "moderate",
  limited: "limited",
  insufficient: "insufficient",
};

const VISIBILITY_TEXT: Record<string, string> = {
  "hotlist-resonance": "已经登上公开热榜，并出现多平台共振",
  "active-subject-evidence": "能检索到公开讨论，但还没有形成热榜共振",
  "weak-signal": "目前只有较弱的公开信号",
  "insufficient-evidence": "目前公开证据不足，不宜下确定结论",
};

const DIRECTION_TEXT: Record<string, string> = {
  rising: "上升",
  rising_fast: "快速上升",
  falling: "下降",
  declining: "下降",
  flat: "基本平稳",
  stable: "基本平稳",
  unknown: "方向暂不明确",
};

const FAMILY_TEXT: Record<string, string> = {
  "social-attention": "社交讨论",
  video: "视频平台",
  shortvideo: "短视频",
  "news-authority": "新闻 / 权威媒体",
  search: "搜索趋势",
  "podcast-audio": "播客 / 音频",
  "curated-rss": "行业信号",
  xhs: "小红书",
  community: "社区论坛",
  developer: "开发者社区",
  "tech-news": "科技资讯",
  business: "商业 / 财经",
  finance: "商业 / 财经",
  marketing: "营销 / 品牌",
  fashion: "时尚 / 消费",
  ecommerce: "电商",
  shopping: "电商",
};

const PRIORITY_TEXT: Record<string, string> = {
  now: "建议立即做",
  next: "建议接下来做",
  soon: "建议接下来做",
  watch: "保持观察",
  later: "可稍后处理",
};

function familyText(family: string | null | undefined): string {
  if (!family) return "其他公开来源";
  return FAMILY_TEXT[family] ?? FAMILY_TEXT[family.toLowerCase()] ?? "其他公开来源";
}

function platformState(dataQuality: string | null | undefined): { state: PlatformState; stateText: string } {
  const q = String(dataQuality ?? "").toLowerCase();
  if (q === "ok" || q === "available" || q === "up") return { state: "ok", stateText: "可用" };
  if (q.includes("auth")) return { state: "missing", stateText: "需在本地登录后获取" };
  if (q.includes("rate")) return { state: "degraded", stateText: "被平台限流，稍后再试" };
  if (q.includes("stale")) return { state: "degraded", stateText: "数据已过期" };
  if (q.includes("degrad")) return { state: "degraded", stateText: "部分降级" };
  if (q.includes("down")) return { state: "missing", stateText: "暂时不可用" };
  if (q.includes("missing") || q === "" || q === "null") return { state: "missing", stateText: "暂未取到" };
  return { state: "degraded", stateText: "部分降级" };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractCurve(research: EntityResearchPack | null): DecisionView["change"]["curve"] {
  const raw = asRecord(research?.raw);
  const gt = asRecord(raw.googleTrend);
  const quality = text(gt.dataQuality);
  if (quality && quality !== "ok") return null;
  let points: unknown[] = [];
  const series = asRecord(gt.series);
  const seriesValues = Object.values(series);
  if (Array.isArray(seriesValues[0])) points = seriesValues[0] as unknown[];
  else if (Array.isArray(gt.points)) points = gt.points as unknown[];
  const normalized = points
    .map((p) => {
      const r = asRecord(p);
      const value = num(r.value ?? r.views ?? r.count);
      const date = text(r.date ?? r.time ?? r.formattedTime ?? r.label);
      return value === null ? null : { date, value };
    })
    .filter((p): p is { date: string; value: number } => p !== null);
  if (normalized.length < 2) return null;
  return { points: normalized, scaleNote: text(gt.scaleNote) || "0–100 为所选时间窗内的相对热度，不是绝对搜索量。" };
}

function extractForecast(intel: ProfessionalIntelligence): DecisionView["change"]["forecast"] {
  const f = intel.forecast as unknown as Record<string, unknown>;
  const status = text(f.status);
  const rows = asList(f.forecast)
    .map((row) => {
      const r = asRecord(row);
      const horizon = num(r.horizonHours);
      const projected = num(r.projected ?? r.value ?? r.median);
      const delta = num(r.deltaFromNow ?? r.delta);
      if (horizon === null || projected === null) return null;
      const horizonText = horizon < 24 ? `未来 ${horizon} 小时` : `未来 ${Math.round(horizon / 24)} 天`;
      const deltaText = delta === null ? "" : delta >= 0 ? `较现在约 +${Math.round(delta)}%` : `较现在约 ${Math.round(delta)}%`;
      return { horizonText, value: projected.toFixed(0), deltaText };
    })
    .filter((r): r is { horizonText: string; value: string; deltaText: string } => r !== null);
  const validation = asRecord(f.validation);
  const grade = text(validation.grade);
  if (status === "insufficient_history") {
    return { statusText: "历史样本不足，暂不给出预测", rows: [], validationText: "等积累更多采集后再参考。" };
  }
  const validationText =
    grade === "weak" ? "回测验证较弱，预测仅作方向参考。" : grade === "strong" || grade === "ok" ? "已有历史回测验证，仍属条件外推、不保证发生。" : "预测为基于历史的条件外推，不保证发生。";
  if (!rows.length) return null;
  const statusText = status === "weak_backtest" ? "可做条件外推，但回测偏弱" : "可做条件外推";
  return { statusText, rows, validationText };
}

/**
 * 把完整 Professional Intelligence 投影成普通使用者可读的研究结果视图。
 * 纯函数、不联网、不抛错（缺字段时降级为通俗说明）。
 */
export function buildDecisionView(intel: ProfessionalIntelligence): DecisionView {
  const research: EntityResearchPack | null = intel.research;
  const r = research as unknown as (EntityResearchPack & Record<string, unknown>) | null;
  const current = asRecord(r?.currentState);
  const search = asRecord(r?.searchIntent);
  const subject = asRecord(r?.subject);

  const strength = text(current.evidenceStrength) || "insufficient";
  const visibility = text(current.visibility) || "insufficient-evidence";
  const hotlistHit = num(current.hotlistPlatformsHit) ?? 0;
  const hotlistMentions = num(current.hotlistMentions) ?? 0;
  const hotlistText = hotlistHit > 0
    ? `在 ${hotlistHit} 类公开热榜出现，热榜相关条目约 ${hotlistMentions} 条`
    : "暂未在公开热榜形成共振（不等于没有人讨论）";

  const platforms: DecisionPlatform[] = asList(r?.channelAnalysis)
    .map((item) => {
      const c = asRecord(item);
      const id = text(c.id);
      const { state, stateText } = platformState(text(c.dataQuality));
      const evidence = asList(c.evidence)
        .map((e) => {
          const ev = asRecord(e);
          return {
            source: text(ev.source ?? ev.channel ?? id) || id || "公开来源",
            time: text(ev.publishedAt ?? ev.time) || null,
            title: text(ev.title) || "(无标题)",
            url: text(ev.url) || null,
          };
        });
      return {
        name: text(c.label) || id || "未命名来源",
        familyText: familyText(text(c.family)),
        state,
        stateText,
        count: num(c.itemCount) ?? evidence.length,
        conclusion: text(c.conclusion),
        evidence,
        note: text(c.note),
      };
    })
    .filter((p) => p.name && p.name !== "未命名来源");

  const mapItems = (key: string): Array<{ title: string; reason: string }> =>
    asList(r ? (r as Record<string, unknown>)[key] : undefined)
      .map((item) => {
        const o = asRecord(item);
        return { title: text(o.title ?? o.action ?? o.name), reason: text(o.reason ?? o.nextStep) };
      })
      .filter((o) => o.title);

  const suggestions = asList(r?.recommendedActions)
    .map((item) => {
      const o = asRecord(item);
      const priority = text(o.priority) || "next";
      return { title: text(o.action ?? o.title), reason: text(o.reason), priority, priorityText: PRIORITY_TEXT[priority] ?? "建议接下来做" };
    })
    .filter((o) => o.title);

  const gaps = asList(r?.evidenceGaps)
    .map((item) => {
      const o = asRecord(item);
      return { title: text(o.title), reason: text(o.reason), nextStep: text(o.nextStep) || "可在本地安装并登录对应平台后补充。" };
    })
    .filter((o) => o.title);

  const upcoming = asList(r?.upcomingNodes)
    .map((item) => {
      const o = asRecord(item);
      return { name: text(o.name), date: text(o.startDate ?? o.date), impact: text(o.expectedImpact ?? o.category) };
    })
    .filter((o) => o.name);

  const relatedRaw = asList(search.relatedRising).length ? search : asRecord(asRecord(r?.raw).relatedQueries);
  const rising = asList(relatedRaw.relatedRising).map((x) => text(asRecord(x).query ?? x)).filter(Boolean);
  const top = asList(relatedRaw.relatedTop).map((x) => text(asRecord(x).query ?? x)).filter(Boolean);

  const direction = text(search.direction) || "unknown";
  const changeText = text(search.conclusion)
    || (direction === "unknown"
      ? "搜索趋势暂不足以判断方向，建议结合下方各平台证据一起看。"
      : `搜索热度相对${DIRECTION_TEXT[direction] ?? "变化"}。`);

  const dataNote = "结论基于各公开平台在采集时刻可见的信息整理；暂时取不到或需要登录的平台已明确标注，不会被当作“没有”。预测是依据历史走势的条件外推，不代表一定会发生；重要决策请回到原始链接核对。";

  return {
    schema: "trendhub-decision-view-v1",
    generatedAt: intel.generatedAt,
    subject: {
      name: text(subject.canonicalName) || intel.keyword,
      kind: subject.resolved === true ? "已识别主体" : "自定义主体",
    },
    ready: Boolean(r),
    current: {
      conclusion: text(current.conclusion) || "正在整理该主体的公开证据。",
      strengthText: STRENGTH_TEXT[strength] ?? "证据不足",
      tone: STRENGTH_TONE[strength] ?? "insufficient",
      visibilityText: VISIBILITY_TEXT[visibility] ?? "公开证据有限",
      evidenceCount: num(current.totalEvidenceItems) ?? platforms.reduce((s, p) => s + p.count, 0),
      channelCount: num(current.observedChannels) ?? platforms.filter((p) => p.state !== "missing").length,
      hotlistText,
    },
    change: {
      text: changeText,
      directionText: DIRECTION_TEXT[direction] ?? "方向暂不明确",
      // 趋势序列不可用时，变化值/峰值必须是 null（缺失），绝不用 0 冒充“无变化/无峰值”。
      changePct: text(search.dataQuality) === "ok" ? num(search.changePct) : null,
      peak: text(search.dataQuality) === "ok" ? num(search.peak) : null,
      qualityText: text(search.dataQuality) === "ok" ? "搜索趋势可用" : "搜索趋势暂缺或不完整",
      related: { rising, top },
      curve: extractCurve(research),
      forecast: extractForecast(intel),
    },
    drivers: mapItems("drivers"),
    platforms,
    opportunities: mapItems("opportunities"),
    risks: mapItems("risks"),
    gaps,
    suggestions,
    upcoming,
    dataNote,
  };
}
