import type { QueryEvidenceChannel, QueryEvidenceItem } from "./query-evidence.js";
import { collectPublicQueryEvidence } from "./query-evidence.js";
import { futureSignals } from "./rss.js";

export type CommercialRole = "advertiser-brand" | "campaign" | "agency" | "media-platform";
type SubjectHit = { name: string; role: CommercialRole; confidence: "inferred" };

export interface AdvertiserIntelligence {
  mode: "advertiser-entity-intelligence";
  focus: string;
  capturedAt: string;
  subjects: Array<SubjectHit & { evidenceCount: number; headlines: string[]; urls: string[] }>;
  items: Array<QueryEvidenceItem & { subjects: SubjectHit[] }>;
  supportingChannels: QueryEvidenceChannel[];
  transparencyLibraries: typeof AD_TRANSPARENCY_LIBRARIES;
  rejectedItemCount: number;
  note: string;
}

const GENERIC_FOCUS = new Set(["品牌", "品牌营销", "商业", "商业运营", "广告", "营销", "媒体", "行业", "brand", "marketing", "advertising", "media", "business"]);
const GENERIC_ENTITY = /^(the|why|how|media|brand|brands|marketing|advertising|advertisers?|business|retail|creator|campaign|ai|your|our|new|global|数字营销|品牌营销|商业运营|广告|营销|媒体|行业|平台)$/i;
const COMMERCIAL_CONTEXT = /(campaign|advertis|ad spend|media buy|media account|creative|brand partnership|sponsor|appoints?|selects?|chooses?|taps|hires?|launches?|unveils?|debuts?|rolls out|营销|广告|投放|媒介|传播|公关|创意|品牌|代言|赞助|官宣|发布|推出|上线|携手|合作|任命|委任|代理)/i;
const AGENCY = /\b(agency|ogilvy|dentsu|wpp|publicis|havas|saatchi|tbwa|vml|accenture song|omnicom|interpublic|ipg|groupm|mindshare|mediacom|initiative)\b/i;
const PLATFORM = /\b(google|meta|facebook|instagram|tiktok|linkedin|youtube|amazon ads|microsoft ads|snapchat|pinterest)\b/i;
const EN_SUBJECT = /(?:^|:\s|why\s+|how\s+)([A-Z][A-Za-z0-9&.'’+\-]*(?:\s+[A-Z][A-Za-z0-9&.'’+\-]*){0,4})\s+(?:launches?|unveils?|debuts?|appoints?|selects?|chooses?|taps|hires?|partners?|updates?|refreshes?|skewers|signals|expands?|rolls out|returns?|revives?)/i;
const EN_POSSESSIVE = /\b([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,3})[’']s\s+(?:campaign|media|marketing|advertising|brand|creative)/;
const ZH_SUBJECT = /^\s*([A-Za-z0-9\u3400-\u9fff][A-Za-z0-9&·.\-\u3400-\u9fff ]{1,34}?)(?:官宣|发布|推出|上线|启动|携手|联手|签约|续约|任命|委任|选择|启用|赞助|投放|更新|升级|合作)/;

export const AD_TRANSPARENCY_LIBRARIES = [
  { id: "google", label: "Google Ads Transparency Center", url: "https://adstransparency.google.com/", searchableBy: "广告主名称或网站", access: "公开 · 已验证广告主" },
  { id: "meta", label: "Meta Ad Library", url: "https://www.facebook.com/ads/library/", searchableBy: "广告主、Page 与关键词", access: "公开 · 活跃广告" },
  { id: "tiktok", label: "TikTok Creative Center · Top Ads", url: "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en", searchableBy: "品牌、产品、地区、行业与目标", access: "公开基础结果" },
  { id: "linkedin", label: "LinkedIn Ad Library", url: "https://www.linkedin.com/ad-library/home", searchableBy: "广告主、付款主体、关键词与国家", access: "公开" },
  { id: "microsoft", label: "Microsoft Ad Library", url: "https://adlibrary.ads.microsoft.com/?t=ads", searchableBy: "广告内容或广告主名称", access: "公开" },
];

export function isGenericIndustryFocus(focus: string): boolean {
  const parts = focus.toLowerCase().split(/[\s,，、/|;；]+/).filter(Boolean);
  return !parts.length || parts.every((part) => GENERIC_FOCUS.has(part));
}

function roleFor(name: string): CommercialRole {
  if (AGENCY.test(name)) return "agency";
  if (PLATFORM.test(name)) return "media-platform";
  return "advertiser-brand";
}

export function extractCommercialSubjects(title: string, focus = ""): SubjectHit[] {
  if (!COMMERCIAL_CONTEXT.test(title)) return [];
  const hits: SubjectHit[] = [];
  const add = (raw: string, role = roleFor(raw)) => {
    const name = raw.replace(/^[\s:：\-–—|]+|[\s:：\-–—|]+$/g, "").replace(/^(why|how)\s+/i, "").trim();
    if (name.length < 2 || name.length > 48 || GENERIC_ENTITY.test(name) || /^\d/.test(name)) return;
    if (!hits.some((hit) => hit.name.toLowerCase() === name.toLowerCase() && hit.role === role)) hits.push({ name, role, confidence: "inferred" });
  };
  if (!isGenericIndustryFocus(focus) && title.toLowerCase().includes(focus.toLowerCase())) add(focus);
  const subject = title.match(EN_SUBJECT)?.[1] || title.match(EN_POSSESSIVE)?.[1] || title.match(ZH_SUBJECT)?.[1];
  if (subject) add(subject);
  const relation = title.match(/([A-Z][A-Za-z0-9&.'’\-]*(?:\s+[A-Z][A-Za-z0-9&.'’\-]*){0,3})\s+(?:appoints?|selects?|chooses?|taps|hires?)\s+([A-Z][A-Za-z0-9&.'’\-]*(?:\s+[A-Z][A-Za-z0-9&.'’\-]*){0,4})/);
  if (relation) {
    add(relation[1], "advertiser-brand");
    if (AGENCY.test(relation[2]) || /\b(?:agency|creative partner|media partner)\b/i.test(title)) add(relation[2], "agency");
  }
  for (const quote of title.matchAll(/[“「『\"]([^”」』\"]{2,48})[”」』\"]/g)) add(quote[1], "campaign");
  return hits;
}

function rssItems(articles: Array<{ title: string; url: string | null; publishedAt: string | null; source: string; summary: string | null }>): QueryEvidenceItem[] {
  return articles.map((article, index) => ({ id: article.url || `industry-rss-${index}`, channel: "industry-rss", source: article.source, family: "news-authority", title: article.title, url: article.url, publishedAt: article.publishedAt, author: article.source, summary: article.summary, evidenceKind: "article" }));
}

export function buildAdvertiserIntelligenceFromItems(items: QueryEvidenceItem[], focus: string, supportingChannels: QueryEvidenceChannel[] = []): AdvertiserIntelligence {
  const accepted: AdvertiserIntelligence["items"] = [];
  const grouped = new Map<string, AdvertiserIntelligence["subjects"][number]>();
  for (const item of items) {
    const subjects = extractCommercialSubjects(item.title, focus);
    if (!subjects.length) continue;
    accepted.push({ ...item, subjects });
    for (const subject of subjects) {
      const key = `${subject.role}|${subject.name.toLowerCase()}`;
      const row = grouped.get(key) ?? { ...subject, evidenceCount: 0, headlines: [], urls: [] };
      row.evidenceCount += 1;
      if (!row.headlines.includes(item.title)) row.headlines.push(item.title);
      if (item.url && !row.urls.includes(item.url)) row.urls.push(item.url);
      grouped.set(key, row);
    }
  }
  return {
    mode: "advertiser-entity-intelligence", focus, capturedAt: new Date().toISOString(),
    subjects: [...grouped.values()].sort((a, b) => b.evidenceCount - a.evidenceCount || a.name.localeCompare(b.name)),
    items: accepted, supportingChannels, transparencyLibraries: AD_TRANSPARENCY_LIBRARIES,
    rejectedItemCount: items.length - accepted.length,
    note: "主体仅由报道标题抽取，均为待核实推断；点击原始证据确认商业角色与关系。泛行业内容不进入主体名单，播客保留在支撑证据层。",
  };
}

export async function collectAdvertiserIntelligence(focus: string, limit = 30): Promise<AdvertiserIntelligence> {
  const generic = isGenericIndustryFocus(focus);
  const [signals, channels] = await Promise.all([
    futureSignals({ category: "industry", keyword: generic ? undefined : focus, limit: Math.max(limit * 2, 40), perSource: 5 }),
    collectPublicQueryEvidence(generic ? "广告主 品牌 Campaign" : focus, generic ? ["advertiser campaign", "brand campaign"] : [], 10),
  ]);
  const news = channels.filter((channel) => channel.family === "news-authority").flatMap((channel) => channel.items);
  return buildAdvertiserIntelligenceFromItems([...rssItems(signals.articles), ...news], focus, channels);
}
