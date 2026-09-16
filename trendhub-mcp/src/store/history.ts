/**
 * Bounded local trend history used by lifecycle intelligence and lead-time benchmarks.
 * This is separate from the latest/previous snapshot ring so existing change alerts remain stable.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import type { HotItem, HotResult } from "../util/schema.js";

export interface HistoryItem {
  rank: number | null;
  title: string;
  url: string | null;
  hot: number | null;
}

export interface HistoryPoint {
  capturedAt: string;
  dataQuality: HotResult["dataQuality"];
  items: HistoryItem[];
}

interface HistoryFile {
  version: 1;
  platform: string;
  points: HistoryPoint[];
}

const DIR = path.join(config.dataDir, "history");
const MAX_POINTS = 1500;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function safeName(p: string): string {
  return p.replace(/[^a-zA-Z0-9_.:-]/g, "_");
}
function fileFor(platform: string): string {
  return path.join(DIR, `${safeName(platform)}.json`);
}
function compactItem(x: HotItem): HistoryItem {
  return { rank: x.rank, title: x.title, url: x.url, hot: x.hot };
}

function readFile(platform: string): HistoryFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(fileFor(platform), "utf8")) as HistoryFile;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.points)) return parsed;
  } catch {
    // no history yet
  }
  return { version: 1, platform, points: [] };
}

function writeFile(data: HistoryFile): void {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(data.platform), JSON.stringify(data, null, 2), "utf8");
}

export function appendHistory(result: HotResult): void {
  if (result.dataQuality === "missing" || !result.items.length) return;
  try {
    const data = readFile(result.platform);
    if (data.points.at(-1)?.capturedAt === result.capturedAt) return;
    const now = Date.now();
    data.points.push({
      capturedAt: result.capturedAt,
      dataQuality: result.dataQuality,
      items: result.items.slice(0, 50).map(compactItem),
    });
    data.points = data.points
      .filter((x) => Number.isFinite(Date.parse(x.capturedAt)) && now - Date.parse(x.capturedAt) <= MAX_AGE_MS)
      .slice(-MAX_POINTS);
    writeFile(data);
  } catch {
    // History is analytical state, not a reason to fail a source request.
  }
}

export function readHistory(platform: string, hours = 720, now = new Date()): HistoryPoint[] {
  const cutoff = now.getTime() - Math.max(1, hours) * 60 * 60 * 1000;
  return readFile(platform).points
    .filter((x) => Date.parse(x.capturedAt) >= cutoff)
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
}

export function historyDepth(platform: string): { samples: number; firstAt: string | null; lastAt: string | null } {
  const xs = readFile(platform).points;
  return {
    samples: xs.length,
    firstAt: xs[0]?.capturedAt ?? null,
    lastAt: xs.at(-1)?.capturedAt ?? null,
  };
}
