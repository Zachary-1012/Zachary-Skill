/**
 * 话题深度情报包：把分散的数据/分析能力聚合成一份“创作与决策简报”原料，
 * 供调用方大模型做深度解读、预测与内容生产。各模块独立容错，缺失如实标注。
 */
import { crossPlatformOverlap } from "./overlap.js";
import { aggregateSentiment } from "./sentiment.js";
import { interestOverTime, relatedQueries } from "../sources/googleTrends.js";
import { futureSignals } from "../sources/rss.js";
import { upcomingEvents } from "../sources/events.js";

export async function analyzeTopic(keyword: string, opts: { geo?: string; timeframe?: string; daysAhead?: number } = {}) {
  const geo = opts.geo ?? "";
  const timeframe = opts.timeframe ?? "today 3-m";
  const daysAhead = opts.daysAhead ?? 60;

  const [overlap, curve, related, signals, events] = await Promise.all([
    crossPlatformOverlap(keyword).catch((e) => ({ error: e.message })),
    interestOverTime([keyword], geo, timeframe).catch((e) => ({ error: e.message })),
    relatedQueries(keyword, geo).catch((e) => ({ error: e.message })),
    futureSignals({ keyword, limit: 12, perSource: 4 }).catch((e) => ({ error: e.message })),
    Promise.resolve(upcomingEvents({ daysAhead })).catch((e) => ({ error: e.message })),
  ]);

  // 情感：对跨平台命中标题聚合
  let sentiment = null;
  if (!("error" in overlap)) {
    const titles = overlap.platforms.flatMap((p) => p.items.map((i) => i.title));
    if (titles.length) sentiment = aggregateSentiment(titles);
  }

  // 趋势曲线派生信号
  let momentum = null;
  if (!("error" in curve) && curve.points.filter((p) => p.value != null).length >= 4) {
    const vals = curve.points.map((p) => p.value).filter((v): v is number => v != null);
    const recent = vals.slice(-Math.max(3, Math.floor(vals.length / 6)));
    const earlier = vals.slice(0, Math.max(3, Math.floor(vals.length / 6)));
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
    const recentAvg = avg(recent);
    const earlierAvg = avg(earlier);
    const changePct = earlierAvg > 0 ? Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100) : null;
    momentum = {
      recentAvg: Math.round(recentAvg * 10) / 10,
      earlierAvg: Math.round(earlierAvg * 10) / 10,
      changePct,
      direction: changePct == null ? "unknown" : changePct > 15 ? "rising" : changePct < -15 ? "declining" : "flat",
      peak: Math.max(...vals),
      note: "基于 Google Trends 相对热度的近期 vs 前期均值，方向性参考",
    };
  }

  return {
    keyword,
    generatedAt: new Date().toISOString(),
    crossPlatform: "error" in overlap ? { dataQuality: "missing", note: overlap.error } : overlap,
    searchMomentum: "error" in curve ? { dataQuality: "missing", note: curve.error } : { ...curve, points: curve.points.slice(-26) },
    momentum,
    relatedQueries: "error" in related ? { dataQuality: "missing", note: related.error } : related,
    futureSignals: "error" in signals ? { dataQuality: "missing", note: signals.error } : signals,
    upcomingNodes: "error" in events ? { dataQuality: "missing", note: events.error } : events,
    sentiment,
    briefingHint: "以上为结构化证据。请基于证据输出：1)话题定性与所处阶段(萌芽/上升/爆发/衰退) 2)驱动因素 3)受众情绪与争议点 4)机会与风险 5)可切入的内容角度。数字与结论须可回溯到上述来源，缺失部分明确说明。",
  };
}
