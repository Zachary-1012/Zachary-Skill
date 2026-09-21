/**
 * Professional trend evidence history.
 *
 * Primary backend: Node's built-in SQLite (Node >=22.5) for indexed, multi-year
 * local history without a native npm dependency. Existing v1 JSON history is
 * migrated once. If node:sqlite is unavailable, TrendHub keeps a bounded JSON
 * fallback so source requests never fail because analytical storage is missing.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { config } from "../config.js";
import type { HotItem, HotResult } from "../util/schema.js";

export interface HistoryItem {
  rank: number | null;
  title: string;
  url: string | null;
  hot: number | null;
  desc?: string | null;
  author?: string | null;
  externalId?: string | null;
  imageUrl?: string | null;
  kind?: string | null;
}

export interface HistoryPoint {
  capturedAt: string;
  dataQuality: HotResult["dataQuality"];
  items: HistoryItem[];
}

interface HistoryFile {
  version: 1 | 2;
  platform: string;
  points: HistoryPoint[];
}

type StatementLike = {
  run: (...args: unknown[]) => unknown;
  get: (...args: unknown[]) => Record<string, unknown> | undefined;
  all: (...args: unknown[]) => Array<Record<string, unknown>>;
};
type DatabaseLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => StatementLike;
  close?: () => void;
};

const LEGACY_DIR = path.join(config.dataDir, "history");
const DB_FILE = path.join(config.dataDir, "trendhub-history.sqlite");

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? Math.min(max, Math.max(min, Math.floor(raw))) : fallback;
}

/** Two years at hourly cadence by default; configurable without code changes. */
const RETENTION_DAYS = envInt("TRENHUB_HISTORY_RETENTION_DAYS", 730, 30, 3650);
const MAX_POINTS_PER_PLATFORM = envInt("TRENHUB_HISTORY_MAX_POINTS_PER_PLATFORM", 20_000, 1_500, 100_000);
const JSON_FALLBACK_MAX_POINTS = Math.min(MAX_POINTS_PER_PLATFORM, 5_000);
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

let databaseState: DatabaseLike | null | undefined;

/** Release the optional SQLite handle for orderly shutdown and isolated runs. */
export function closeHistoryStore(): void {
  const database = databaseState;
  databaseState = undefined;
  try {
    database?.close?.();
  } catch {
    // Closing analytical storage must not prevent process shutdown.
  }
}

function safeName(p: string): string {
  return p.replace(/[^a-zA-Z0-9_.:-]/g, "_");
}
function legacyFileFor(platform: string): string {
  return path.join(LEGACY_DIR, `${safeName(platform)}.json`);
}
function compactItem(x: HotItem): HistoryItem {
  return {
    rank: x.rank,
    title: x.title,
    url: x.url,
    hot: x.hot,
    desc: x.desc,
    author: x.author,
    externalId: x.externalId,
    imageUrl: x.imageUrl ?? null,
    kind: x.kind ?? null,
  };
}

function readLegacyFile(platform: string): HistoryFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(legacyFileFor(platform), "utf8")) as HistoryFile;
    if (parsed && (parsed.version === 1 || parsed.version === 2) && Array.isArray(parsed.points)) return parsed;
  } catch {
    // No legacy history yet.
  }
  return { version: 2, platform, points: [] };
}

function atomicWriteJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function writeLegacyFile(data: HistoryFile): void {
  atomicWriteJson(legacyFileFor(data.platform), data);
}

function schema(db: DatabaseLike): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS trendhub_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS history_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      data_quality TEXT NOT NULL,
      UNIQUE(platform, captured_at)
    );
    CREATE INDEX IF NOT EXISTS idx_history_platform_time
      ON history_points(platform, captured_at);
    CREATE TABLE IF NOT EXISTS history_items (
      point_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      rank INTEGER,
      title TEXT NOT NULL,
      url TEXT,
      hot REAL,
      description TEXT,
      author TEXT,
      external_id TEXT,
      image_url TEXT,
      kind TEXT,
      PRIMARY KEY(point_id, position),
      FOREIGN KEY(point_id) REFERENCES history_points(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_history_items_title ON history_items(title);
    CREATE INDEX IF NOT EXISTS idx_history_items_author ON history_items(author);
  `);
}

function insertPoint(db: DatabaseLike, platform: string, point: HistoryPoint): void {
  const existing = db.prepare("SELECT id FROM history_points WHERE platform = ? AND captured_at = ?")
    .get(platform, point.capturedAt);
  if (existing?.id != null) return;
  db.prepare("INSERT INTO history_points(platform, captured_at, data_quality) VALUES (?, ?, ?)")
    .run(platform, point.capturedAt, point.dataQuality);
  const row = db.prepare("SELECT id FROM history_points WHERE platform = ? AND captured_at = ?")
    .get(platform, point.capturedAt);
  const pointId = Number(row?.id);
  if (!Number.isFinite(pointId)) throw new Error("failed to resolve inserted history point id");
  const stmt = db.prepare(`
    INSERT INTO history_items(
      point_id, position, rank, title, url, hot, description, author, external_id, image_url, kind
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  point.items.slice(0, 100).forEach((item, index) => {
    stmt.run(
      pointId,
      index,
      item.rank,
      item.title,
      item.url,
      item.hot,
      item.desc ?? null,
      item.author ?? null,
      item.externalId ?? null,
      item.imageUrl ?? null,
      item.kind ?? null,
    );
  });
}

function migrateLegacy(db: DatabaseLike): void {
  const marker = db.prepare("SELECT value FROM trendhub_meta WHERE key = ?").get("legacy-history-v1-migrated");
  if (marker?.value === "1") return;
  fs.mkdirSync(LEGACY_DIR, { recursive: true });
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const file of fs.readdirSync(LEGACY_DIR)) {
      if (!file.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, file), "utf8")) as HistoryFile;
        if (!parsed?.platform || !Array.isArray(parsed.points)) continue;
        for (const point of parsed.points) insertPoint(db, parsed.platform, point);
      } catch {
        // A malformed legacy file must not block the rest of the migration.
      }
    }
    db.prepare("INSERT OR REPLACE INTO trendhub_meta(key, value) VALUES (?, ?)")
      .run("legacy-history-v1-migrated", "1");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function openDatabase(): DatabaseLike | null {
  if (databaseState !== undefined) return databaseState;
  if ((process.env.TRENHUB_HISTORY_BACKEND ?? "").trim().toLowerCase() === "json") {
    databaseState = null;
    return databaseState;
  }
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const require = createRequire(import.meta.url);
    const sqlite = require("node:sqlite") as { DatabaseSync?: new (location: string) => DatabaseLike };
    if (!sqlite?.DatabaseSync) throw new Error("node:sqlite DatabaseSync unavailable");
    const db = new sqlite.DatabaseSync(DB_FILE);
    schema(db);
    migrateLegacy(db);
    databaseState = db;
  } catch {
    databaseState = null;
  }
  return databaseState;
}

function cleanupSqlite(db: DatabaseLike, platform: string, nowMs: number): void {
  const cutoff = new Date(nowMs - RETENTION_MS).toISOString();
  db.prepare("DELETE FROM history_points WHERE platform = ? AND captured_at < ?").run(platform, cutoff);
  db.prepare(`
    DELETE FROM history_points
    WHERE platform = ?
      AND id NOT IN (
        SELECT id FROM history_points WHERE platform = ? ORDER BY captured_at DESC LIMIT ?
      )
  `).run(platform, platform, MAX_POINTS_PER_PLATFORM);
}

function appendSqlite(db: DatabaseLike, result: HotResult): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    insertPoint(db, result.platform, {
      capturedAt: result.capturedAt,
      dataQuality: result.dataQuality,
      items: result.items.slice(0, 100).map(compactItem),
    });
    cleanupSqlite(db, result.platform, Date.now());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function appendJson(result: HotResult): void {
  const data = readLegacyFile(result.platform);
  if (data.points.at(-1)?.capturedAt === result.capturedAt) return;
  const now = Date.now();
  data.version = 2;
  data.points.push({
    capturedAt: result.capturedAt,
    dataQuality: result.dataQuality,
    items: result.items.slice(0, 100).map(compactItem),
  });
  data.points = data.points
    .filter((x) => Number.isFinite(Date.parse(x.capturedAt)) && now - Date.parse(x.capturedAt) <= RETENTION_MS)
    .slice(-JSON_FALLBACK_MAX_POINTS);
  writeLegacyFile(data);
}

export function appendHistory(result: HotResult): void {
  if (result.dataQuality === "missing" || !result.items.length) return;
  try {
    const db = openDatabase();
    if (db) appendSqlite(db, result);
    else appendJson(result);
  } catch {
    // History is analytical state, never a reason to fail a source request.
    try { appendJson(result); } catch { /* best-effort fallback */ }
  }
}

function readSqlite(db: DatabaseLike, platform: string, cutoffIso: string, nowIso: string): HistoryPoint[] {
  const rows = db.prepare(`
    SELECT
      p.id AS point_id,
      p.captured_at,
      p.data_quality,
      i.position,
      i.rank,
      i.title,
      i.url,
      i.hot,
      i.description,
      i.author,
      i.external_id,
      i.image_url,
      i.kind
    FROM history_points p
    LEFT JOIN history_items i ON i.point_id = p.id
    WHERE p.platform = ? AND p.captured_at >= ? AND p.captured_at <= ?
    ORDER BY p.captured_at ASC, i.position ASC
  `).all(platform, cutoffIso, nowIso);

  const byId = new Map<number, HistoryPoint>();
  for (const row of rows) {
    const id = Number(row.point_id);
    if (!Number.isFinite(id)) continue;
    let point = byId.get(id);
    if (!point) {
      point = {
        capturedAt: String(row.captured_at),
        dataQuality: String(row.data_quality) as HotResult["dataQuality"],
        items: [],
      };
      byId.set(id, point);
    }
    if (row.title == null) continue;
    point.items.push({
      rank: row.rank == null ? null : Number(row.rank),
      title: String(row.title),
      url: row.url == null ? null : String(row.url),
      hot: row.hot == null ? null : Number(row.hot),
      desc: row.description == null ? null : String(row.description),
      author: row.author == null ? null : String(row.author),
      externalId: row.external_id == null ? null : String(row.external_id),
      imageUrl: row.image_url == null ? null : String(row.image_url),
      kind: row.kind == null ? null : String(row.kind),
    });
  }
  return [...byId.values()];
}

export function readHistory(platform: string, hours = 720, now = new Date()): HistoryPoint[] {
  const nowMs = now.getTime();
  const cutoffMs = nowMs - Math.max(1, hours) * 60 * 60 * 1000;
  const db = openDatabase();
  if (db) {
    try {
      return readSqlite(db, platform, new Date(cutoffMs).toISOString(), now.toISOString());
    } catch {
      // Fall through to legacy JSON if the analytical DB is temporarily unavailable.
    }
  }
  return readLegacyFile(platform).points
    .filter((x) => {
      const capturedMs = Date.parse(x.capturedAt);
      return Number.isFinite(capturedMs) && capturedMs >= cutoffMs && capturedMs <= nowMs;
    })
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
}

export function historyDepth(platform: string): { samples: number; firstAt: string | null; lastAt: string | null } {
  const db = openDatabase();
  if (db) {
    try {
      const row = db.prepare(`
        SELECT COUNT(*) AS samples, MIN(captured_at) AS first_at, MAX(captured_at) AS last_at
        FROM history_points WHERE platform = ?
      `).get(platform);
      return {
        samples: Number(row?.samples ?? 0),
        firstAt: row?.first_at == null ? null : String(row.first_at),
        lastAt: row?.last_at == null ? null : String(row.last_at),
      };
    } catch {
      // Fall back below.
    }
  }
  const xs = readLegacyFile(platform).points;
  return {
    samples: xs.length,
    firstAt: xs[0]?.capturedAt ?? null,
    lastAt: xs.at(-1)?.capturedAt ?? null,
  };
}

export function historyStoreInfo(): {
  backend: "sqlite" | "json";
  retentionDays: number;
  maxPointsPerPlatform: number;
  mediaEvidence: boolean;
} {
  const sqlite = Boolean(openDatabase());
  return {
    backend: sqlite ? "sqlite" : "json",
    retentionDays: RETENTION_DAYS,
    maxPointsPerPlatform: sqlite ? MAX_POINTS_PER_PLATFORM : JSON_FALLBACK_MAX_POINTS,
    mediaEvidence: true,
  };
}
