/**
 * Xiaohongshu (小红书) web client — guest activation + optional logged-in cookie.
 *
 * Independent implementation (no third-party code copied). Flow, verified
 * against the live web API:
 *   1. Generate a local visitor `a1` + `webId` cookies (no network).
 *   2. POST as.xiaohongshu.com /api/sec/v1/scripting (UNSIGNED) to obtain a
 *      secPoisonId (the anti-bot "shield" token).
 *   3. POST edith.xiaohongshu.com /api/sns/web/v1/login/activate (SIGNED,
 *      body {}) which returns a guest user_id + web_session.
 *   4. Signed data calls (homefeed) then work for the guest session.
 *
 * Zero-config guest mode can read the public homefeed (hot recommendations).
 * The official search hotlist and keyword search require a real XHS_COOKIE
 * (guest gets -104 "no permission"); such cases are surfaced as `missing`,
 * never faked.
 */

import { signMainApi, USER_AGENT } from "./signing.js";

export const XHS_HOME = "https://www.xiaohongshu.com";
export const XHS_EDITH = "https://edith.xiaohongshu.com";
export const XHS_AS = "https://as.xiaohongshu.com";
export { USER_AGENT };

// ─── CRC32 (for visitor a1 / webId, matches web client) ─────────────────────

const CRC32_POLY = 0xedb88320;
let crcTable: Uint32Array | null = null;
function crc32Table(): Uint32Array {
  if (crcTable) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ CRC32_POLY : c >>> 1;
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}
function crc32Signed(input: string): number {
  const table = crc32Table();
  let c = 0xffffffff;
  for (let i = 0; i < input.length; i++) {
    c = (table[(c ^ input.charCodeAt(i)) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  const u = (c ^ 0xffffffff) >>> 0;
  return u > 0x7fffffff ? u - 0x100000000 : u;
}

function base36(n: number): string {
  // unsigned representation then base36, matching the web b1.a1 cookie check
  const u = n < 0 ? n + 0x100000000 : n;
  return u.toString(36);
}

function randomDigits(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function randomHex(len: number): string {
  let s = "";
  const h = "0123456789abcdef";
  for (let i = 0; i < len; i++) s += h[Math.floor(Math.random() * 16)];
  return s;
}

/** Generate a visitor `a1` cookie value (YYYYMMDDHH + 13 digits + crc base36). */
export function generateA1(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const prefix =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const middle = randomDigits(13);
  const body = prefix + middle;
  const crc = base36(crc32Signed(body));
  return `${body}${crc}`;
}

/** Generate a `webId` cookie value (32-char lowercase hex). */
export function generateWebId(): string {
  return randomHex(32);
}

export function parseCookieString(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

/** search_id used by /search/notes (UUID v4 shape). */
export function generateSearchId(): string {
  const b = randomHex(32);
  return (
    b.slice(0, 8) + "-" + b.slice(8, 12) + "-4" + b.slice(13, 16) +
    "-a" + b.slice(17, 20) + "-" + b.slice(20, 32)
  );
}

export class XhsError extends Error {
  code?: number | string;
  status?: number;
  constructor(message: string, code?: number | string, status?: number) {
    super(message);
    this.name = "XhsError";
    this.code = code;
    this.status = status;
  }
}

interface Jar {
  a1: string;
  webId: string;
  web_session?: string;
  [k: string]: string | undefined;
}

interface GuestState {
  userId?: string;
  activatedAt: number;
}

const GUEST_TTL_MS = 25 * 60 * 1000; // refresh guest session every 25 minutes

interface XhsClient {
  /** True when a real user cookie (a1 + web_session) was supplied. */
  hasLoginCookie(): boolean;
  /** Activate a guest session on demand; no-op (and throws) for login cookies. */
  activate(): Promise<void>;
  /** Low-level signed JSON request; retries activation once on guest expiry. */
  request<T = any>(opts: {
    method: "GET" | "POST";
    url: string;
    params?: Record<string, string | number | string[]>;
    body?: Record<string, unknown>;
    /** Force the AES XYW_ signature (used when XYS_ gets HTTP 406). */
    xyw?: boolean;
  }): Promise<T>;
}

let singleton: XhsClient | null = null;

/**
 * Get the process-wide XHS client. The cookie is read lazily from
 * process.env.XHS_COOKIE on first use (so tests can set the env late).
 */
export function xhsClient(): XhsClient {
  if (singleton) return singleton;
  singleton = createClient();
  return singleton;
}

function createClient(): XhsClient {
  let jar: Jar = { a1: generateA1(), webId: generateWebId() };
  let guest: GuestState = { activatedAt: 0 };
  let activating: Promise<void> | null = null;

  function loginCookie(): Record<string, string> | null {
    const raw = process.env.XHS_COOKIE?.trim();
    if (!raw) return null;
    const parsed = parseCookieString(raw);
    if (parsed.a1 && parsed.web_session) return parsed;
    return null;
  }

  function effectiveCookies(): Record<string, string> {
    const login = loginCookie();
    if (login) return login;
    const c: Record<string, string> = { a1: jar.a1, webId: jar.webId };
    if (jar.web_session) c.web_session = jar.web_session;
    return c;
  }

  function cookieHeader(): string {
    return Object.entries(effectiveCookies())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async function fetchSecPoisonId(): Promise<string> {
    // Step 1: as.xiaohongshu.com scripting endpoint — UNSIGNED.
    const res = await fetch(`${XHS_AS}/api/sec/v1/scripting`, {
      method: "POST",
      headers: baseHeaders("application/json;charset=UTF-8", false),
      body: JSON.stringify({ callFrom: "web", callback: "seccallback" }),
    });
    const text = await res.text();
    const m = text.match(/"secPoisonId"\s*:\s*"([^"]+)"/);
    if (!m) {
      throw new XhsError(
        `小红书风控脚本令牌获取失败 (status=${res.status})`,
        "SHIELD_FAILED",
        res.status
      );
    }
    return m[1];
  }

  async function activateOnce(): Promise<void> {
    const poison = await fetchSecPoisonId();
    const cookies = effectiveCookies();
    const uri = "/api/sns/web/v1/login/activate";
    const headers = signMainApi(
      "POST",
      uri,
      cookies,
      undefined,
      {},
      undefined,
      `${XHS_HOME}/explore`,
      "xys"
    );
    const res = await fetch(`${XHS_EDITH}${uri}`, {
      method: "POST",
      headers: {
        ...baseHeaders("application/json;charset=UTF-8", true),
        ...headers,
        "x-mns": poison,
      },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { rawText: text };
    }
    if (!json || json.code !== 0 || !json.data) {
      throw new XhsError(
        `小红书游客激活失败: ${json?.msg || json?.sub_msg || "no data"}`,
        json?.code,
        res.status
      );
    }
    const session = json.data.session ?? json.data.web_session;
    if (session) jar.web_session = String(session);
    if (json.data.user_id) guest.userId = String(json.data.user_id);
    guest.activatedAt = Date.now();
  }

  async function activate(): Promise<void> {
    if (loginCookie()) return; // real accounts need no guest activation
    if (activating) return activating;
    const fresh = !guest.activatedAt || Date.now() - guest.activatedAt > GUEST_TTL_MS;
    if (!fresh) return;
    activating = activateOnce()
      .catch((err) => {
        // allow a retry next time
        guest.activatedAt = 0;
        throw err;
      })
      .finally(() => {
        activating = null;
      });
    return activating;
  }

  function baseHeaders(contentType: string, withCookie: boolean): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Content-Type": contentType,
      Origin: XHS_HOME,
      Referer: `${XHS_HOME}/`,
      "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="142", "Microsoft Edge";v="142"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": USER_AGENT,
    };
    if (withCookie) h.Cookie = cookieHeader();
    return h;
  }

  async function request<T>(opts: {
    method: "GET" | "POST";
    url: string;
    params?: Record<string, string | number | string[]>;
    body?: Record<string, unknown>;
    xyw?: boolean;
  }): Promise<T> {
    const isLogin = Boolean(loginCookie());
    if (!isLogin) await activate();

    const doRequest = async (format: "xys" | "xyw"): Promise<{ res: Response; json: any }> => {
      const target = new URL(opts.url);
      const uri = target.pathname;
      const cookies = effectiveCookies();
      const signHeaders = signMainApi(
        opts.method,
        opts.url,
        cookies,
        opts.method === "GET" ? opts.params : undefined,
        opts.method === "POST" ? opts.body : undefined,
        undefined,
        `${XHS_HOME}/explore`,
        format
      );
      let url = opts.url;
      if (opts.method === "GET" && opts.params) {
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(opts.params)) {
          usp.set(k, Array.isArray(v) ? v.join(",") : String(v));
        }
        url = `${opts.url}?${usp.toString()}`;
      }
      const res = await fetch(url, {
        method: opts.method,
        headers: {
          ...baseHeaders("application/json;charset=UTF-8", true),
          ...signHeaders,
        },
        body: opts.method === "POST" ? JSON.stringify(opts.body ?? {}) : undefined,
      });
      const text = await res.text();
      let json: any;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { rawText: text };
      }
      return { res, json };
    };

    let { res, json } = await doRequest(opts.xyw ? "xyw" : "xys");

    // XYS_ rejected with 406 → transparently retry with AES XYW_ signature.
    if (res.status === 406 && !opts.xyw) {
      const retry = await doRequest("xyw");
      res = retry.res;
      json = retry.json;
    }

    // Guest session expired → re-activate once and replay.
    if (!isLogin && (json?.code === -100 || json?.code === -101)) {
      guest.activatedAt = 0;
      jar = { a1: generateA1(), webId: generateWebId() };
      await activate();
      const replay = await doRequest(opts.xyw ? "xyw" : "xys");
      res = replay.res;
      json = replay.json;
    }

    if (!res.ok && json?.code === undefined) {
      throw new XhsError(`小红书 HTTP ${res.status}`, "HTTP_" + res.status, res.status);
    }
    return json as T;
  }

  return {
    hasLoginCookie: () => Boolean(loginCookie()),
    activate,
    request,
  };
}
