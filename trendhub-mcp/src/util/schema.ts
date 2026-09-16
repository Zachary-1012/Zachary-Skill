/**
 * 统一数据契约 —— 全平台归一化结构。
 * 数据纪律：取不到的字段一律 null，并在 dataQuality 上如实标记；禁止用 0 / "未知" 静默填充。
 */

export type DataQuality = "ok" | "degraded" | "missing";

/** 单条热点 */
export interface HotItem {
  /** 榜单内排名，从 1 开始；无法确定为 null */
  rank: number | null;
  title: string;
  /** 可点击原文链接；无则 null */
  url: string | null;
  /** 热度数值（各平台口径不同，仅同平台内可比）；无则 null */
  hot: number | null;
  /** 平台展示的原始热度文案，如 "123.4万"、"热度 8899" */
  hotText: string | null;
  /** 摘要/描述；无则 null */
  desc: string | null;
  /** 作者/来源/UP主；无则 null */
  author: string | null;
  /** 平台内部 id；无则 null */
  externalId: string | null;
  /** 封面/缩略图 URL（仅图文/视频类平台有，如小红书笔记）；无则 null */
  imageUrl?: string | null;
  /** 内容类型（如小红书 normal=图文 / video=视频）；无则 null */
  kind?: string | null;
}

/** 单个平台一次抓取结果 */
export interface HotResult {
  /** 平台调用名，如 weibo / hackernews */
  platform: string;
  /** 展示名，如 微博热搜 */
  label: string;
  category: string;
  /** ISO 时间：本次抓取时刻 */
  capturedAt: string;
  /** ISO 时间：平台侧公布的更新时刻；未知为 null */
  sourceUpdatedAt: string | null;
  dataQuality: DataQuality;
  items: HotItem[];
  /** degraded/missing 时的原因说明 */
  note?: string;
}

/** 趋势曲线上的一个点 */
export interface TrendPoint {
  date: string; // ISO 或 yyyy-mm-dd
  /** Google Trends 相对热度 0-100（非绝对搜索量）；缺失为 null */
  value: number | null;
}

export interface TrendCurve {
  keyword: string;
  geo: string;
  timeframe: string;
  /** 口径说明，务必随结果返回给调用方 */
  scaleNote: string;
  dataQuality: DataQuality;
  points: TrendPoint[];
  note?: string;
}

export interface RelatedQuery {
  query: string;
  /** google 返回的相对热度值（top）或 "100%+"（rising）；原样保留字符串 */
  value: string | null;
  kind: "top" | "rising";
}

export interface EventNode {
  name: string;
  category: string;
  /** ISO 日期或区间起止 */
  startDate: string;
  endDate: string | null;
  region: string | null;
  expectedImpact: string | null;
  sourceUrl: string | null;
}

export interface RssArticle {
  title: string;
  url: string | null;
  publishedAt: string | null;
  source: string;
  category: string;
  summary: string | null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function missingResult(
  platform: string,
  label: string,
  category: string,
  note: string
): HotResult {
  return {
    platform,
    label,
    category,
    capturedAt: nowIso(),
    sourceUpdatedAt: null,
    dataQuality: "missing",
    items: [],
    note,
  };
}
