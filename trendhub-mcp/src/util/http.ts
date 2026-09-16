/**
 * HTTP 外呼封装：统一 UA、超时、重试、Google 特殊前缀清洗。
 * 不做静默兜底：失败抛出，由上层捕获并标记 dataQuality。
 */
import { config, USER_AGENT } from "../config.js";

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export interface FetchOpts {
  headers?: Record<string, string>;
  /** 期望的返回类型 */
  as?: "json" | "text";
  signal?: AbortSignal;
  /** 本次请求超时（毫秒），默认取全局配置 */
  timeoutMs?: number;
  /** 本次请求重试次数，默认取全局配置 */
  retries?: number;
}

async function once(url: string, opts: FetchOpts): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? config.timeoutMs);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*", ...(opts.headers ?? {}) },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new FetchError(`HTTP ${res.status} ${res.statusText}`, res.status);
    const text = await res.text();
    if (opts.as === "text") return text;
    return parseJsonLoose(text);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** Google Trends 的 JSON 响应带有 )]}' 前缀，需清洗 */
export function parseJsonLoose(text: string): unknown {
  const t = text.trim().replace(/^\)\]\}',?\n?/, "");
  return JSON.parse(t);
}

export async function httpGet(url: string, opts: FetchOpts = {}): Promise<unknown> {
  let lastErr: unknown;
  const maxRetries = opts.retries ?? config.retries;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await once(url, opts);
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new FetchError(`请求失败: ${url}`, undefined, lastErr);
}

/** 简单 TTL 内存缓存 */
export class TtlCache<V> {
  private store = new Map<string, { at: number; v: V }>();
  constructor(private ttlSec: number) {}
  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if ((Date.now() - hit.at) / 1000 > this.ttlSec) {
      this.store.delete(key);
      return undefined;
    }
    return hit.v;
  }
  set(key: string, v: V): void {
    this.store.set(key, { at: Date.now(), v });
  }
  clear(): void {
    this.store.clear();
  }
}
