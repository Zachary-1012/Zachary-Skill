import type { HotItem } from "../util/schema.js";
import type { QueryEvidenceChannel, QueryEvidenceItem } from "./query-evidence.js";
import type { SourceVertical } from "./professional-catalog.js";

export const INDUSTRY_FOCUS_LABEL = "品牌营销 / 商业运营 / 广告 / 媒体";
export const INDUSTRY_DEFAULT_VERTICALS: SourceVertical[] = [
  "business-corporate",
  "marketing-advertising",
  "retail-commerce",
];

export const INDUSTRY_FOCUS_QUERY = "品牌营销";
export const INDUSTRY_FOCUS_ALIASES = [
  "商业运营",
  "品牌战略",
  "广告投放",
  "媒体行业",
  "内容营销",
  "社交媒体营销",
  "零售运营",
  "creator marketing",
  "brand marketing",
  "advertising",
  "media business",
];

const INDUSTRY_TERMS = [
  "品牌", "营销", "广告", "媒体", "商业", "运营", "市场", "传播", "公关", "创意", "campaign",
  "零售", "消费", "电商", "内容", "社交", "达人", "创作者", "渠道", "增长", "用户", "客户",
  "投放", "媒介", "agency", "marketing", "advertising", "media", "brand", "retail", "commerce",
  "creator", "campaign", "cmo", "strategy", "business",
];

function tokens(focus?: string): string[] {
  const requested = (focus ?? "")
    .toLowerCase()
    .split(/[\s,，、/|;；]+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 2);
  return [...new Set([...requested, ...INDUSTRY_TERMS])];
}

export function matchesIndustryFocus(item: Pick<HotItem, "title" | "desc" | "author">, focus?: string): boolean {
  const haystack = `${item.title ?? ""} ${item.desc ?? ""} ${item.author ?? ""}`.toLowerCase();
  return tokens(focus).some((term) => haystack.includes(term));
}

export function filterIndustryItems(items: HotItem[], focus?: string, limit = 30): HotItem[] {
  return items.filter((item) => matchesIndustryFocus(item, focus)).slice(0, limit);
}

export interface UsefulIndustryFallback {
  mode: "industry-public-evidence";
  label: string;
  focus: string;
  reason: string;
  capturedAt: string;
  itemCount: number;
  items: QueryEvidenceItem[];
  channels: Array<{
    id: string;
    label: string;
    family: string;
    dataQuality: string;
    itemCount: number;
    note: string;
  }>;
}

export function buildUsefulIndustryFallback(
  channels: QueryEvidenceChannel[],
  focus: string,
  reason: string,
  limit = 24,
): UsefulIndustryFallback {
  const seen = new Set<string>();
  const items = channels
    .flatMap((channel) => channel.items)
    .filter((item) => {
      const key = (item.url || `${item.source}|${item.title}`).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
  return {
    mode: "industry-public-evidence",
    label: "行业公开证据替代层",
    focus,
    reason,
    capturedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
    channels: channels.map((channel) => ({
      id: channel.id,
      label: channel.label,
      family: channel.family,
      dataQuality: channel.dataQuality,
      itemCount: channel.itemCount,
      note: channel.note,
    })),
  };
}
