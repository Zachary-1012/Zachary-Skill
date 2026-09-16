/**
 * 内容生产层：把“真实热点证据”与“专家模板”组装成创作简报（brief）。
 * 插件不写成稿（算力归调用方大模型），而是提供证据、同平台真实爆款样本、模板骨架与逐格填充指引。
 */
import { readSeedJson } from "../util/paths.js";
import { crossPlatformOverlap } from "./overlap.js";
import { aggregateSentiment } from "./sentiment.js";
import { relatedQueries } from "../sources/googleTrends.js";
import { upcomingEvents } from "../sources/events.js";
import { getHot } from "../sources/index.js";

export interface Template {
  id: string;
  name: string;
  type: "script" | "copy" | "plan";
  platforms: string[];
  bestFor: string;
  structure?: { section: string; purpose: string; guidance: string; slots?: string[] }[];
  formulas?: string[];
  storyboardFields?: string[];
  tips?: string[];
  checklist: string[];
}

interface TemplateFile {
  templates: Template[];
}

export function listTemplates(type?: string, platform?: string): Template[] {
  const all = readSeedJson<TemplateFile>("templates.json", { templates: [] }).templates;
  return all.filter((t) => {
    if (type && t.type !== type) return false;
    if (platform && !(t.platforms.includes(platform) || t.platforms.includes("all"))) return false;
    return true;
  });
}

export function getTemplate(id: string): Template | null {
  return readSeedJson<TemplateFile>("templates.json", { templates: [] }).templates.find((t) => t.id === id) ?? null;
}

const PLATFORM_DEFAULT_TEMPLATE: Record<string, string> = {
  douyin: "short-video-script",
  kuaishou: "short-video-script",
  shipinhao: "short-video-script",
  "youtube-shorts": "short-video-script",
  xiaohongshu: "xiaohongshu-note",
  weibo: "weibo-post",
  wechat: "wechat-article",
  newsletter: "wechat-article",
  twitter: "twitter-thread",
  x: "twitter-thread",
  "douyin-live": "livestream-script",
  "kuaishou-live": "livestream-script",
  "taobao-live": "livestream-script",
};

export async function getContentBrief(topic: string, opts: {
  templateId?: string;
  platform?: string;
  goal?: string;
  audience?: string;
  geo?: string;
} = {}) {
  const platform = opts.platform ?? "all";
  const templateId = opts.templateId ?? PLATFORM_DEFAULT_TEMPLATE[platform] ?? "short-video-script";
  const template = getTemplate(templateId) ?? listTemplates()[0];

  // 1) 证据采集（并发、独立容错）
  const [overlap, related, events] = await Promise.all([
    crossPlatformOverlap(topic).catch((e) => ({ error: e.message })),
    relatedQueries(topic, opts.geo ?? "").catch((e) => ({ error: e.message })),
    Promise.resolve(upcomingEvents({ daysAhead: 60 })).catch((e) => ({ error: e.message })),
  ]);

  let sentiment = null;
  if (!("error" in overlap)) {
    const titles = overlap.platforms.flatMap((p) => p.items.map((i) => i.title));
    if (titles.length) sentiment = aggregateSentiment(titles);
  }

  // 2) 同平台真实爆款样本（学习语感与角度，非抄袭）
  let referenceTitles: { platform: string; label: string; titles: string[] }[] = [];
  if (platform !== "all") {
    const r = await getHot(platform, 15).catch(() => null);
    if (r && r.dataQuality === "ok") {
      referenceTitles = [{ platform: r.platform, label: r.label, titles: r.items.slice(0, 15).map((i) => i.title) }];
    }
  } else if (!("error" in overlap)) {
    referenceTitles = overlap.platforms.slice(0, 4).map((p) => ({
      platform: p.platform, label: p.label, titles: p.items.slice(0, 8).map((i) => i.title),
    }));
  }

  // 3) 相关节点
  const relatedNodes = "error" in events ? [] : events.events
    .filter((e) => topic.split(/[\s,，、/|]+/).some((k) => k.length >= 2 && (e.name.includes(k) || (e.expectedImpact ?? "").includes(k))))
    .slice(0, 5);

  const evidence = {
    topic,
    platform,
    goal: opts.goal ?? null,
    audience: opts.audience ?? null,
    crossPlatform: "error" in overlap ? { dataQuality: "missing", note: overlap.error } : {
      platformsHit: overlap.platformsHit,
      totalMentions: overlap.totalMentions,
      resonanceScore: overlap.resonanceScore,
      topMentions: overlap.platforms.flatMap((p) => p.items.slice(0, 3).map((i) => ({ platform: p.label, title: i.title, rank: i.rank, url: i.url }))).slice(0, 15),
    },
    relatedQueries: "error" in related ? { dataQuality: "missing", note: related.error } : {
      rising: related.rising.slice(0, 10), top: related.top.slice(0, 10),
    },
    sentiment,
    relatedNodes,
  };

  // 4) 逐格填充指引
  const slots = (template.structure ?? []).flatMap((s) => (s.slots ?? []).map((slot) => ({ section: s.section, slot, hint: `结合证据卡中的真实热点与相关词填充「${slot}」；不得编造数据，缺失则保留为[待补充]` })));

  const productionPrompt = [
    `你是资深内容创作者。请基于以下【证据卡】的真实热点数据，使用模板《${template.name}》为主题「${topic}」产出可直接发布的${template.type === "script" ? "脚本" : template.type === "plan" ? "方案" : "文案"}。`,
    opts.audience ? `目标人群：${opts.audience}。` : "",
    opts.goal ? `营销/内容目标：${opts.goal}。` : "",
    `要求：1)严格遵循模板结构与checklist；2)所有数据、案例须来自证据卡或标注[待补充]，禁止虚构热度/销量；3)参考“同平台爆款样本”的语感与角度但不得抄袭；4)情绪与立场参考情感信号；5)相关搜索词自然融入标题与正文以获取搜索流量；6)输出后自查checklist。`,
  ].join("");

  return {
    topic,
    template,
    evidence,
    referenceTitles,
    fillSlots: slots,
    productionPrompt,
    note: "本简报只提供证据与骨架；请把 productionPrompt + 本简报交给你的 AI 生成成稿（算力由调用方模型承担）",
  };
}
