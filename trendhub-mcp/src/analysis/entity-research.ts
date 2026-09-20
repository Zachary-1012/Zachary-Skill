/**
 * Entity-first Intelligence research pack.
 *
 * Brand/company/commercial-place/campaign research starts by actively acquiring
 * subject-specific public evidence. Generic hotlists are retained only as one
 * secondary signal for "is this also a broad trending topic?".
 */
import { collectPublicQueryEvidence, type QueryEvidenceChannel, type QueryEvidenceItem } from "../sources/query-evidence.js";
import { resolveBrandEntity, entityQueryTerms } from "../entities/brand-catalog.js";
import { interestOverTime, relatedQueries } from "../sources/googleTrends.js";
import { futureSignals } from "../sources/rss.js";
import { upcomingEvents } from "../sources/events.js";
import { fetchXiaohongshu, searchXhsNotes } from "../sources/xiaohongshu.js";
import { xhsClient } from "../sources/xhs/guest.js";
import { crossPlatformOverlap } from "./overlap.js";

type ResearchStrength = "strong" | "moderate" | "limited" | "insufficient";
type VisibilityState =
  | "cross-platform-hot"
  | "single-platform-hot"
  | "active-subject-evidence"
  | "low-observed-visibility"
  | "undetermined";

export interface EntityResearchEvidenceRef {
  channel: string;
  source: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
}

export interface EntityResearchInsight {
  id: string;
  title: string;
  reason: string;
  evidenceRefs: EntityResearchEvidenceRef[];
}

export interface EntityResearchPack {
  methodologyVersion: "entity-first-research-v1";
  generatedAt: string;
  subject: {
    input: string;
    researchMode: "entity-first";
    resolved: boolean;
    canonicalName: string;
    entityId: string | null;
    aliases: string[];
    queryTerms: string[];
    note: string;
  };
  currentState: {
    evidenceStrength: ResearchStrength;
    visibility: VisibilityState;
    conclusion: string;
    observedChannels: number;
    totalEvidenceItems: number;
    hotlistPlatformsHit: number | null;
    hotlistMentions: number | null;
  };
  channelAnalysis: Array<{
    id: string;
    label: string;
    family: string;
    dataQuality: "ok" | "degraded" | "missing";
    itemCount: number;
    conclusion: string;
    evidence: EntityResearchEvidenceRef[];
    note: string;
  }>;
  searchIntent: {
    dataQuality: "ok" | "degraded" | "missing";
    direction: "rising" | "flat" | "declining" | "unknown";
    changePct: number | null;
    peak: number | null;
    relatedTop: Array<{ query: string; value: string | null }>;
    relatedRising: Array<{ query: string; value: string | null }>;
    conclusion: string;
  };
  drivers: EntityResearchInsight[];
  opportunities: EntityResearchInsight[];
  risks: EntityResearchInsight[];
  evidenceGaps: Array<{ id: string; title: string; reason: string; nextStep: string }>;
  recommendedActions: Array<{ id: string; action: string; reason: string; priority: "now" | "next" | "monitor" }>;
  upcomingNodes: Array<{
    name: string;
    category: string;
    startDate: string;
    endDate: string | null;
    region: string | null;
    expectedImpact: string | null;
  }>;
  raw: {
    publicQueryChannels: QueryEvidenceChannel[];
    hotlistOverlap: unknown;
    googleTrend: unknown;
    relatedQueries: unknown;
    xiaohongshu: {
      mode: "guest" | "local-session";
      dataQuality: "ok" | "degraded" | "missing";
      feedMentions: QueryEvidenceItem[];
      keywordMatches: QueryEvidenceItem[] | null;
      note: string;
    };
    curatedSignals: unknown;
  };
}

function evidenceRef(item: QueryEvidenceItem): EntityResearchEvidenceRef {
  return {
    channel: item.channel,
    source: item.source,
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt,
  };
}

function qualityRank(q: "ok" | "degraded" | "missing"): number {
  return q === "ok" ? 2 : q === "degraded" ? 1 : 0;
}

function searchDirection(points: Array<{ value: number | null }>): {
  direction: "rising" | "flat" | "declining" | "unknown";
  changePct: number | null;
  peak: number | null;
} {
  const values = points.map((p) => p.value).filter((v): v is number => v != null && Number.isFinite(v));
  if (values.length < 4) return { direction: "unknown", changePct: null, peak: values.length ? Math.max(...values) : null };
  const n = Math.max(2, Math.floor(values.length / 5));
  const earlier = values.slice(0, n);
  const recent = values.slice(-n);
  const avg = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / Math.max(1, xs.length);
  const a = avg(earlier);
  const b = avg(recent);
  const changePct = a > 0 ? Math.round(((b - a) / a) * 100) : null;
  return {
    direction: changePct == null ? "unknown" : changePct >= 15 ? "rising" : changePct <= -15 ? "declining" : "flat",
    changePct,
    peak: Math.max(...values),
  };
}

function channelConclusion(channel: QueryEvidenceChannel): string {
  if (channel.dataQuality === "missing") return `${channel.label} 本次不可用，不能据此判断没有相关讨论。`;
  if (!channel.itemCount) return `${channel.label} 已完成检索，但本次没有返回可用相关证据；这不是全网“零讨论”的证明。`;
  if (channel.family === "news-authority") return `${channel.label} 检索到 ${channel.itemCount} 条相关报道/网页证据，可用于判断近期事件与编辑部关注。`;
  if (channel.family === "social-attention") return `${channel.label} 检索到 ${channel.itemCount} 条公开讨论证据，可用于观察话题表达，但不等同全站热度。`;
  if (channel.family === "podcast-audio") return `${channel.label} 检索到 ${channel.itemCount} 条相关播客目录证据，可作为长内容/专业讨论补充。`;
  return `${channel.label} 检索到 ${channel.itemCount} 条主体相关证据。`;
}

function xhsItems(
  rows: Array<{ title: string; url: string | null; author: string | null; hotText?: string | null }>,
  kind: string,
): QueryEvidenceItem[] {
  return rows.map((row, index) => ({
    id: `xhs-${kind}-${index}-${row.url ?? row.title}`,
    channel: `xiaohongshu-${kind}`,
    source: "小红书",
    family: "social-attention" as const,
    title: row.title,
    url: row.url,
    publishedAt: null,
    author: row.author,
    summary: row.hotText ? `平台展示热度：${row.hotText}` : null,
    evidenceKind: "social-post" as const,
  }));
}

function topEvidence(channels: QueryEvidenceChannel[], family?: string, max = 8): EntityResearchEvidenceRef[] {
  return channels
    .filter((c) => !family || c.family === family)
    .flatMap((c) => c.items)
    .slice(0, max)
    .map(evidenceRef);
}

function tokenCandidates(text: string): string[] {
  const raw = [
    ...(text.match(/#[^#\s，。！？、；;:：]{2,24}/g) ?? []),
    ...(text.toLowerCase().match(/[a-z][a-z0-9+#.\-]{2,30}/g) ?? []),
    ...(text.match(/[\u4e00-\u9fff]{2,8}/g) ?? []),
  ];
  return raw.map((x) => x.replace(/^#/, "").trim()).filter(Boolean);
}

function recurringThemes(items: QueryEvidenceItem[], queryTerms: string[]): Array<{ label: string; count: number; refs: EntityResearchEvidenceRef[] }> {
  const ignored = new Set([
    "官方", "最新", "发布", "今日", "相关", "进行", "表示", "一个", "这个", "以及", "中国", "global",
    ...queryTerms.map((x) => x.toLowerCase().replace(/\s+/g, "")),
  ]);
  const map = new Map<string, QueryEvidenceItem[]>();
  for (const item of items) {
    for (const token of new Set(tokenCandidates(item.title))) {
      const norm = token.toLowerCase().replace(/\s+/g, "");
      if (norm.length < 2 || ignored.has(norm) || queryTerms.some((q) => norm.includes(q.toLowerCase().replace(/\s+/g, "")))) continue;
      map.set(token, [...(map.get(token) ?? []), item]);
    }
  }
  return [...map.entries()]
    .filter(([, rows]) => rows.length >= 2)
    .map(([label, rows]) => ({ label, count: rows.length, refs: rows.slice(0, 5).map(evidenceRef) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8);
}

export async function buildEntityResearch(
  keyword: string,
  options: { geo?: string; timeframe?: string; daysAhead?: number } = {},
): Promise<EntityResearchPack> {
  const generatedAt = new Date().toISOString();
  const entity = resolveBrandEntity(keyword);
  const queryTerms = entityQueryTerms(keyword);
  const canonicalName = entity?.name ?? keyword.trim();
  const aliases = entity ? entity.aliases : [];
  const geo = options.geo ?? "CN";
  const timeframe = options.timeframe ?? "today 3-m";
  const daysAhead = options.daysAhead ?? 60;

  const [
    publicChannels,
    hotlistOverlap,
    curve,
    related,
    curated,
    events,
    xhsFeed,
  ] = await Promise.all([
    collectPublicQueryEvidence(canonicalName, aliases, 16),
    crossPlatformOverlap(keyword).catch((error) => ({ error: (error as Error).message })),
    interestOverTime([keyword], geo, timeframe).catch((error) => ({ dataQuality: "missing" as const, points: [], note: (error as Error).message })),
    relatedQueries(keyword, geo).catch((error) => ({ dataQuality: "missing" as const, top: [], rising: [], note: (error as Error).message })),
    futureSignals({ keyword, limit: 20, perSource: 5 }).catch((error) => ({ dataQuality: "missing" as const, total: 0, articles: [], sourceStatus: [], note: (error as Error).message })),
    Promise.resolve(upcomingEvents({ daysAhead })).catch(() => ({ total: 0, events: [] })),
    fetchXiaohongshu(40).catch(() => null),
  ]);

  const keywordLower = queryTerms.map((x) => x.toLowerCase());
  const xhsFeedRows = (xhsFeed?.items ?? []).filter((item) => {
    const haystack = `${item.title} ${item.desc ?? ""}`.toLowerCase();
    return keywordLower.some((term) => haystack.includes(term));
  }).slice(0, 15);
  const loggedIn = xhsClient.hasLoginCookie();
  const xhsKeywordRows = loggedIn
    ? await searchXhsNotes(keyword, 20, "popularity_descending").catch(() => null)
    : null;

  const xhsFeedEvidence = xhsItems(xhsFeedRows, "feed");
  const xhsKeywordEvidence = xhsKeywordRows ? xhsItems(xhsKeywordRows, "search") : null;
  const xhsEvidence = [...xhsFeedEvidence, ...(xhsKeywordEvidence ?? [])];
  const xhsQuality: "ok" | "degraded" | "missing" =
    xhsEvidence.length ? "ok" :
    xhsFeed?.dataQuality === "missing" ? "missing" :
    "degraded";
  const xhsChannel: QueryEvidenceChannel = {
    id: "xiaohongshu-subject",
    label: "小红书 · 主体证据",
    family: "social-attention",
    dataQuality: xhsQuality,
    capturedAt: xhsFeed?.capturedAt ?? generatedAt,
    query: keyword,
    itemCount: xhsEvidence.length,
    items: xhsEvidence,
    note: loggedIn
      ? "本地登录态：关键词搜索 + 首页推荐流命中；平台展示热度只在小红书口径内解释。"
      : "公网/游客态：仅能使用首页推荐流中的标题命中；关键词搜索为 AUTH_REQUIRED。公网托管端不接收私人 Cookie。",
  };

  const curatedItems: QueryEvidenceItem[] = (curated.articles ?? []).map((article: any, index: number) => ({
    id: article.url ?? `curated-${index}`,
    channel: "curated-editorial",
    source: article.source ?? "Curated RSS",
    family: "news-authority" as const,
    title: String(article.title ?? ""),
    url: article.url ?? null,
    publishedAt: article.publishedAt ?? null,
    author: article.source ?? null,
    summary: article.summary ?? null,
    evidenceKind: "article" as const,
  })).filter((item) => item.title);
  const curatedChannel: QueryEvidenceChannel = {
    id: "curated-editorial",
    label: "TrendHub · Curated Editorial",
    family: "news-authority",
    dataQuality: curated.dataQuality ?? (curatedItems.length ? "ok" : "degraded"),
    capturedAt: curated.capturedAt ?? generatedAt,
    query: keyword,
    itemCount: curatedItems.length,
    items: curatedItems,
    note: "TrendHub 高质量商业/营销/科技 RSS 中的关键词命中；未命中不等于全网没有报道。",
  };

  const allChannels = [...publicChannels, xhsChannel, curatedChannel];
  const observedChannels = allChannels.filter((c) => c.dataQuality !== "missing").length;
  const positiveChannels = allChannels.filter((c) => c.itemCount > 0).length;
  const totalEvidenceItems = allChannels.reduce((sum, c) => sum + c.itemCount, 0);
  const platformsHit = "platformsHit" in hotlistOverlap ? Number((hotlistOverlap as any).platformsHit ?? 0) : null;
  const hotlistMentions = "totalMentions" in hotlistOverlap ? Number((hotlistOverlap as any).totalMentions ?? 0) : null;

  const evidenceStrength: ResearchStrength =
    positiveChannels >= 4 && totalEvidenceItems >= 12 ? "strong" :
    positiveChannels >= 2 && totalEvidenceItems >= 5 ? "moderate" :
    positiveChannels >= 1 || totalEvidenceItems > 0 ? "limited" :
    observedChannels > 0 ? "insufficient" :
    "insufficient";

  const visibility: VisibilityState =
    platformsHit != null && platformsHit >= 2 ? "cross-platform-hot" :
    platformsHit === 1 ? "single-platform-hot" :
    totalEvidenceItems >= 5 ? "active-subject-evidence" :
    observedChannels > 0 ? "low-observed-visibility" :
    "undetermined";

  const conclusion =
    visibility === "cross-platform-hot"
      ? `${canonicalName} 当前既有主体相关证据，也已进入多个实时热榜，属于需要持续追踪的跨平台热点。`
      : visibility === "single-platform-hot"
        ? `${canonicalName} 当前存在主体相关证据，并在单个平台热榜出现；尚不足以称为全网共振。`
        : visibility === "active-subject-evidence"
          ? `${canonicalName} 当前有可研究的新闻/社交/搜索等主体证据，但没有形成主流热榜共振；应按品牌/实体研究，而不是按“全网热点”解释。`
          : visibility === "low-observed-visibility"
            ? `${canonicalName} 本次主动检索得到的可用主体证据较少；只能说明当前观测可见度有限，不能推断“无人讨论”。`
            : `${canonicalName} 当前证据不足，无法判断实际讨论强度；缺失来源保持 UNKNOWN/MISSING，不转换成 0。`;

  const direction = searchDirection((curve as any).points ?? []);
  const top = Array.isArray((related as any).top) ? (related as any).top.slice(0, 8) : [];
  const rising = Array.isArray((related as any).rising) ? (related as any).rising.slice(0, 8) : [];
  const searchQuality = (curve as any).dataQuality === "ok" || (related as any).dataQuality === "ok"
    ? "ok"
    : (curve as any).dataQuality === "missing" && (related as any).dataQuality === "missing"
      ? "missing"
      : "degraded";
  const searchConclusion =
    searchQuality === "missing"
      ? "搜索趋势证据本次不可用，不能把空序列解释为零搜索需求。"
      : direction.direction === "rising"
        ? `Google Trends 可用序列显示近期相对热度较前段上升约 ${direction.changePct}%（0–100 相对指数，不是绝对搜索量）。`
        : direction.direction === "declining"
          ? `Google Trends 可用序列显示近期相对热度较前段下降约 ${Math.abs(direction.changePct ?? 0)}%；仍需结合新闻/社交证据判断原因。`
          : direction.direction === "flat"
            ? "Google Trends 可用序列近期整体平稳，没有证据支持明显搜索加速。"
            : "搜索序列不足以判断方向。";

  const combinedItems = allChannels.flatMap((c) => c.items);
  const recurring = recurringThemes(combinedItems, queryTerms);
  const drivers: EntityResearchInsight[] = [];
  for (const row of rising.slice(0, 5)) {
    drivers.push({
      id: `search-rising-${drivers.length + 1}`,
      title: String(row.query),
      reason: `相关搜索 rising 信号：${row.value ?? "平台未提供幅度"}。`,
      evidenceRefs: [],
    });
  }
  for (const theme of recurring.slice(0, Math.max(0, 6 - drivers.length))) {
    drivers.push({
      id: `recurring-theme-${drivers.length + 1}`,
      title: theme.label,
      reason: `在当前主体相关公开证据中重复出现 ${theme.count} 次，可作为事件/内容驱动线索，需回到原文复核语义。`,
      evidenceRefs: theme.refs,
    });
  }

  const opportunities: EntityResearchInsight[] = [];
  if (publicChannels.some((c) => c.family === "news-authority" && c.itemCount > 0)) {
    opportunities.push({
      id: "editorial-context",
      title: "已有编辑部/新闻语境可利用",
      reason: "主体在公开新闻检索中存在近期证据，可以从事件、行业与品牌动作，而不是只从热榜蹭话题。",
      evidenceRefs: topEvidence(publicChannels, "news-authority", 6),
    });
  }
  if (xhsEvidence.length > 0) {
    opportunities.push({
      id: "xhs-content-signal",
      title: "存在小红书内容证据",
      reason: "当前观测中已找到主体相关小红书内容，可用于拆解表达方式、内容角度与创作者样本。",
      evidenceRefs: xhsEvidence.slice(0, 6).map(evidenceRef),
    });
  }
  if (direction.direction === "rising") {
    opportunities.push({
      id: "search-momentum",
      title: "搜索关注正在增强",
      reason: `相对搜索指数近期上升约 ${direction.changePct}% ，适合继续验证事件驱动与内容承接机会。`,
      evidenceRefs: [],
    });
  }
  if (visibility === "active-subject-evidence" && (platformsHit ?? 0) === 0) {
    opportunities.push({
      id: "entity-not-hotlist",
      title: "适合做实体研究，而不是强行追热点",
      reason: "有主体相关证据但没有热榜共振，内容策略应优先围绕品牌事件、消费者语境和节点，而不是制造“全网爆”叙事。",
      evidenceRefs: topEvidence(allChannels, undefined, 6),
    });
  }

  const risks: EntityResearchInsight[] = [];
  const missingChannels = allChannels.filter((c) => c.dataQuality === "missing");
  if (missingChannels.length) {
    risks.push({
      id: "coverage-gaps",
      title: "部分信号家族不可观测",
      reason: `${missingChannels.length} 个查询通道本次不可用，跨平台结论必须保留覆盖限制。`,
      evidenceRefs: [],
    });
  }
  if (!loggedIn) {
    risks.push({
      id: "xhs-auth-gap",
      title: "小红书关键词深搜缺失",
      reason: "公网/游客态不具备小红书关键词搜索登录态，只能使用公开推荐流命中；不能据此判断小红书整体讨论规模。",
      evidenceRefs: xhsFeedEvidence.slice(0, 4).map(evidenceRef),
    });
  }
  if ((platformsHit ?? 0) === 0 && totalEvidenceItems > 0) {
    risks.push({
      id: "hotlist-misread",
      title: "不要把“未上热榜”误读为“没有讨论”",
      reason: "主动检索已找到主体证据，但热榜命中为 0；两者属于不同证据口径。",
      evidenceRefs: topEvidence(allChannels, undefined, 5),
    });
  }

  const evidenceGaps: EntityResearchPack["evidenceGaps"] = [];
  if (!loggedIn) evidenceGaps.push({
    id: "xiaohongshu-keyword-auth",
    title: "小红书关键词搜索未观测",
    reason: "该能力需要使用者自己的本地登录态；公网托管端按安全边界不接收私人 Cookie。",
    nextStep: "需要该证据时，在使用者自己的本地 TrendHub 配置 XHS_COOKIE；否则保持 AUTH_REQUIRED，不阻断其他研究。",
  });
  if (searchQuality !== "ok") evidenceGaps.push({
    id: "search-intent-quality",
    title: "搜索意图证据不完整",
    reason: searchConclusion,
    nextStep: "继续使用新闻、公开社交和历史证据，不把空搜索序列记为 0；稍后重试 Google Trends。",
  });
  for (const c of missingChannels) evidenceGaps.push({
    id: `channel-${c.id}`,
    title: `${c.label} 不可用`,
    reason: c.note,
    nextStep: "保留为 MISSING/UNAVAILABLE；使用其他独立信号家族交叉验证，不做静默补零。",
  });

  const actions: EntityResearchPack["recommendedActions"] = [];
  actions.push({
    id: "read-evidence-first",
    action: "先复核近期主体证据，再决定内容/营销动作",
    reason: totalEvidenceItems
      ? `本次已获得 ${totalEvidenceItems} 条主体相关证据，应优先围绕真实事件和重复主题形成判断。`
      : "当前证据不足，先补证据比输出强结论更重要。",
    priority: "now",
  });
  if (drivers.length) actions.push({
    id: "validate-drivers",
    action: "围绕高频驱动主题做二次验证",
    reason: `已识别 ${drivers.length} 个候选驱动；需结合原文确认它们是事件、产品、活动还是噪声。`,
    priority: "next",
  });
  if (visibility === "cross-platform-hot" || visibility === "single-platform-hot") actions.push({
    id: "monitor-spread",
    action: "持续监测跨平台扩散与生命周期变化",
    reason: "主体已经进入至少一个热榜，后续重点是判断是否扩散、加速或衰退。",
    priority: "now",
  });
  if (!loggedIn) actions.push({
    id: "xhs-local-only",
    action: "需要小红书关键词深搜时改用本地授权，不上传公网凭证",
    reason: "保持公共 Remote MCP 的共享安全边界，同时允许个人/团队本地增强。",
    priority: "monitor",
  });

  const channelAnalysis = allChannels
    .sort((a, b) => qualityRank(b.dataQuality) - qualityRank(a.dataQuality) || b.itemCount - a.itemCount)
    .map((c) => ({
      id: c.id,
      label: c.label,
      family: c.family,
      dataQuality: c.dataQuality,
      itemCount: c.itemCount,
      conclusion: channelConclusion(c),
      evidence: c.items.slice(0, 8).map(evidenceRef),
      note: c.note,
    }));

  const eventRows: any[] = Array.isArray((events as any).events) ? (events as any).events : [];
  return {
    methodologyVersion: "entity-first-research-v1",
    generatedAt,
    subject: {
      input: keyword,
      researchMode: "entity-first",
      resolved: entity !== null,
      canonicalName,
      entityId: entity?.id ?? null,
      aliases,
      queryTerms,
      note: entity
        ? "已命中实体种子并扩展别名；每条外部证据仍按实际命中返回。"
        : "未命中种子库不阻断研究；按用户输入作为自定义实体/商业主体主动检索，不将种子库当白名单。",
    },
    currentState: {
      evidenceStrength,
      visibility,
      conclusion,
      observedChannels,
      totalEvidenceItems,
      hotlistPlatformsHit: platformsHit,
      hotlistMentions,
    },
    channelAnalysis,
    searchIntent: {
      dataQuality: searchQuality,
      direction: direction.direction,
      changePct: direction.changePct,
      peak: direction.peak,
      relatedTop: top.map((x: any) => ({ query: String(x.query ?? ""), value: x.value ?? null })).filter((x: any) => x.query),
      relatedRising: rising.map((x: any) => ({ query: String(x.query ?? ""), value: x.value ?? null })).filter((x: any) => x.query),
      conclusion: searchConclusion,
    },
    drivers,
    opportunities,
    risks,
    evidenceGaps,
    recommendedActions: actions,
    upcomingNodes: eventRows.slice(0, 12).map((event) => ({
      name: event.name,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate ?? null,
      region: event.region ?? null,
      expectedImpact: event.expectedImpact ?? null,
    })),
    raw: {
      publicQueryChannels: publicChannels,
      hotlistOverlap,
      googleTrend: curve,
      relatedQueries: related,
      xiaohongshu: {
        mode: loggedIn ? "local-session" : "guest",
        dataQuality: xhsQuality,
        feedMentions: xhsFeedEvidence,
        keywordMatches: xhsKeywordEvidence,
        note: xhsChannel.note,
      },
      curatedSignals: curated,
    },
  };
}
