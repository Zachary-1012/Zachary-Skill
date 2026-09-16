/**
 * TrendHub MCP — 全局配置
 * 所有配置通过环境变量注入；不内置任何大模型 API Key（分析算力由调用方 AI 承担）。
 */
import path from "node:path";
import fs from "node:fs";
import { PKG_ROOT } from "./util/paths.js";

function num(v: string | undefined, d: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
}

export const config = {
  /** 传输方式：stdio（默认，桌面 AI 客户端）| http（本地 HTTP，ChatGPT/网页类客户端） */
  transport: (process.env.TRENTHUB_TRANSPORT === "http" ? "http" : "stdio") as "stdio" | "http",
  httpHost: process.env.TRENTHUB_HOST ?? "127.0.0.1",
  httpPort: num(process.env.TRENTHUB_PORT, 8333),
  /** 热榜 HTTP 缓存秒数 */
  cacheTtlSec: num(process.env.TRENTHUB_CACHE_TTL, 300),
  /** 单次外呼请求超时（毫秒） */
  timeoutMs: num(process.env.TRENTHUB_TIMEOUT_MS, 15000),
  /** 外呼失败重试次数（不含首次） */
  retries: num(process.env.TRENTHUB_RETRIES, 1),
  /**
   * 数据目录（快照等运行期数据）。默认锚定包根 data，与启动时的工作目录无关，
   * 保证 MCP 客户端从任意 cwd 启动子进程时快照位置一致。可用 TRENTHUB_DATA_DIR 覆盖。
   */
  dataDir: process.env.TRENTHUB_DATA_DIR ? path.resolve(process.env.TRENTHUB_DATA_DIR) : path.join(PKG_ROOT, "data"),
  /** 快照目录（启动时计算为 dataDir/snapshots） */
  snapshotDir: "",
  /** 自定义 RSS 信源清单文件（JSON），不传则用内置 data/future-sources.json */
  rssSourcesFile: process.env.TRENTHUB_RSS_SOURCES ?? "",
};

config.snapshotDir = path.join(config.dataDir, "snapshots");
fs.mkdirSync(config.snapshotDir, { recursive: true });

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TrendHubMCP/1.0";
