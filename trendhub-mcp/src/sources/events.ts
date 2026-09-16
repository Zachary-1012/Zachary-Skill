/**
 * 节点趋势：事件日历（科技展会 / 财报季 / 政策窗口 / 电商大促 / 节假日）。
 * 种子数据见 data/events.json；确切日期以官方为准，未官宣用窗口表示。
 */
import { readSeedJson } from "../util/paths.js";
import type { EventNode } from "../util/schema.js";

interface EventFile {
  events: (EventNode & Record<string, unknown>)[];
}

export interface EnrichedEvent extends EventNode {
  daysUntilStart: number;
  daysUntilEnd: number | null;
  status: "ongoing" | "upcoming";
  preheat: "today" | "3d" | "7d" | "14d" | "30d" | "later";
}

function dayDiff(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export function upcomingEvents(opts: { daysAhead?: number; category?: string; fromDate?: string } = {}): {
  asOf: string;
  daysAhead: number;
  total: number;
  events: EnrichedEvent[];
  note?: string;
} {
  const { daysAhead = 90, category } = opts;
  const now = opts.fromDate ? parseDate(opts.fromDate) : new Date();
  const file = readSeedJson<EventFile>("events.json", { events: [] });

  const events: EnrichedEvent[] = [];
  for (const e of file.events) {
    if (category && category !== "all" && e.category !== category) continue;
    const start = parseDate(e.startDate);
    const end = e.endDate ? parseDate(e.endDate) : start;
    const dStart = dayDiff(now, start);
    const dEnd = dayDiff(now, end);
    if (dEnd < 0) continue; // 已结束
    if (dStart > daysAhead) continue; // 超出窗口
    const status: "ongoing" | "upcoming" = dStart <= 0 && dEnd >= 0 ? "ongoing" : "upcoming";
    let preheat: EnrichedEvent["preheat"] = "later";
    if (status === "ongoing" || dStart <= 0) preheat = "today";
    else if (dStart <= 3) preheat = "3d";
    else if (dStart <= 7) preheat = "7d";
    else if (dStart <= 14) preheat = "14d";
    else if (dStart <= 30) preheat = "30d";
    events.push({
      name: e.name, category: e.category, startDate: e.startDate, endDate: e.endDate,
      region: e.region ?? null, expectedImpact: e.expectedImpact ?? null, sourceUrl: e.sourceUrl ?? null,
      daysUntilStart: Math.max(dStart, 0), daysUntilEnd: e.endDate ? Math.max(dEnd, 0) : null,
      status, preheat,
    });
  }
  events.sort((a, b) => a.daysUntilStart - b.daysUntilStart);
  return {
    asOf: now.toISOString().slice(0, 10),
    daysAhead,
    total: events.length,
    events,
    note: events.length ? undefined : "窗口内暂无已登记节点，可在 data/events.json 维护",
  };
}

export function eventCategories(): string[] {
  const file = readSeedJson<EventFile>("events.json", { events: [] });
  return Array.from(new Set(file.events.map((e) => e.category)));
}
