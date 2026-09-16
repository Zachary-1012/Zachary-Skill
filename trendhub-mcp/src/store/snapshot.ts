/**
 * 本地快照存储：每个平台维护 latest / previous 两个槽（环形），用于新晋/飙升/掉榜与增速。
 * 同时把可用结果追加到有界历史库，供生命周期、扩散与 24h/72h lead benchmark 使用。
 * 纯文件、零依赖、可离线；快照不足时如实返回 insufficient_history，绝不编造变化。
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import type { HotResult } from "../util/schema.js";
import { getMany, PLATFORMS } from "../sources/index.js";
import { appendHistory } from "./history.js";

interface SnapFile {
  latest: HotResult | null;
  previous: HotResult | null;
}

function safeName(p: string): string {
  return p.replace(/[^a-zA-Z0-9_.:-]/g, "_");
}
function fileFor(platform: string): string {
  return path.join(config.snapshotDir, `${safeName(platform)}.json`);
}

export function readSnap(platform: string): SnapFile {
  try {
    return JSON.parse(fs.readFileSync(fileFor(platform), "utf-8")) as SnapFile;
  } catch {
    return { latest: null, previous: null };
  }
}

function writeSnap(platform: string, snap: SnapFile): void {
  fs.mkdirSync(config.snapshotDir, { recursive: true });
  fs.writeFileSync(fileFor(platform), JSON.stringify(snap, null, 2), "utf-8");
}

/** 对给定平台（默认全部核心平台）落一次快照 */
export async function takeSnapshots(platforms?: string[]): Promise<{ platform: string; ok: boolean; items: number }[]> {
  const names = platforms && platforms.length
    ? platforms
    : PLATFORMS.filter((p) => ["social", "video", "news", "tech", "dev"].includes(p.category)).map((p) => p.platform);
  const results = await getMany(names, 50);
  const report: { platform: string; ok: boolean; items: number }[] = [];
  for (const r of results) {
    const snap = readSnap(r.platform);
    snap.previous = snap.latest;
    snap.latest = r;
    writeSnap(r.platform, snap);
    appendHistory(r);
    report.push({ platform: r.platform, ok: r.dataQuality === "ok", items: r.items.length });
  }
  return report;
}

/** 用一次查询结果直接推进快照环与历史库（查询即积累历史，无需额外定时任务） */
export function updateFromResults(results: HotResult[]): void {
  for (const r of results) {
    if (r.dataQuality === "missing" || !r.items.length) continue;
    appendHistory(r);
    const snap = readSnap(r.platform);
    // 避免连续两次写入完全相同的 capturedAt
    if (snap.latest && snap.latest.capturedAt === r.capturedAt) continue;
    snap.previous = snap.latest;
    snap.latest = r;
    writeSnap(r.platform, snap);
  }
}

export interface ChangeItem {
  title: string;
  url: string | null;
  platform: string;
  type: "new" | "risen" | "dropped";
  prevRank: number | null;
  currentRank: number | null;
  rankDelta: number | null;
  hot: number | null;
}

export function diffPlatform(platform: string): { platform: string; hasHistory: boolean; changes: ChangeItem[]; latestAt: string | null; previousAt: string | null } {
  const snap = readSnap(platform);
  if (!snap.latest || !snap.previous) {
    return { platform, hasHistory: false, changes: [], latestAt: snap.latest?.capturedAt ?? null, previousAt: snap.previous?.capturedAt ?? null };
  }
  const prev = snap.previous.items;
  const cur = snap.latest.items;
  const prevMap = new Map(prev.map((i) => [i.title, i]));
  const curMap = new Map(cur.map((i) => [i.title, i]));
  const changes: ChangeItem[] = [];

  for (const c of cur) {
    const p = prevMap.get(c.title);
    if (!p) {
      changes.push({ title: c.title, url: c.url, platform, type: "new", prevRank: null, currentRank: c.rank, rankDelta: null, hot: c.hot });
    } else if (p.rank != null && c.rank != null && p.rank - c.rank >= 3) {
      changes.push({ title: c.title, url: c.url, platform, type: "risen", prevRank: p.rank, currentRank: c.rank, rankDelta: p.rank - c.rank, hot: c.hot });
    }
  }
  for (const p of prev) {
    if (!curMap.has(p.title) && p.rank != null && p.rank <= 30) {
      changes.push({ title: p.title, url: p.url, platform, type: "dropped", prevRank: p.rank, currentRank: null, rankDelta: null, hot: p.hot });
    }
  }
  // 排序：new 优先，其次 rankDelta 大的 risen，最后 dropped
  const order = { new: 0, risen: 1, dropped: 2 };
  changes.sort((a, b) => order[a.type] - order[b.type] || (b.rankDelta ?? 0) - (a.rankDelta ?? 0) || (a.currentRank ?? 99) - (b.currentRank ?? 99));
  return { platform, hasHistory: true, changes, latestAt: snap.latest.capturedAt, previousAt: snap.previous.capturedAt };
}
