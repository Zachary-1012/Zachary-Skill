/**
 * 小红书 Web 游客会话与签名 HTTP 客户端（零登录、零 Key、无浏览器、纯本地）。
 *
 * 游客激活是小红书 Web 端公开的会话初始化协议（多开源项目交叉验证的协议事实，
 * 此处独立实现；x-s 签名算法见 ./signing.js 的 MIT 署名）：
 *   1) 本地生成设备指纹 cookie a1 / webId（a1 = 时间戳十六进制 + 随机段 + CRC32，截断 52 位）；
 *   2) POST as.xiaohongshu.com/api/sec/v1/scripting 取 sec_poison_id；
 *   3) POST edith.xiaohongshu.com/api/sns/web/v1/login/activate 取游客 web_session（匿名 user_id）。
 *
 * 可选登录态：设置环境变量 XHS_COOKIE（小红书网页端完整 Cookie，需同时含 a1 与 web_session）
 * 后直接使用真人会话，可解锁官方热搜词榜与关键词搜索；不设置则仅游客会话
 * （首页热门推荐流开放；热搜词榜 / 关键词搜索 / 分品类频道对游客返回 -104，会被如实标记）。
 */
import crypto from "node:crypto";
import { config } from "../../config.js";
import { signMainApi, USER_AGENT, buildGetUri, type SignFormat } from "./signing.js";

export const XHS_HOME = "https://www.xiaohongshu.com";
export const XHS_EDITH = "https://edith.xiaohongshu.com";
export const XHS_AS = "https://as.xiaohongshu.com";
export { USER_AGENT };

export type XhsMode = "guest" | "cookie";

export interface XhsSession {
  jar: Record<string, string>;
  mode: XhsMode;
  userId: string | null;
}

export class XhsError extends Error {
  constructor(
    message: string,
    readonly code?: number | string,
    readonly status?: number
  ) {
    super(message);
    this.name = "XhsError";
  }
}

const A1_CHARSET = "abcdefghijklmnopqrstuvwxyz1234567890";

/** 标准 CRC32（无符号），用于设备 a1 自校验，属公开的通用校验算法，独立实现。 */
function crc32(input: string): number {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of Buffer.from(input, "utf-8")) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** 生成符合 Web 端规则的 52 位设备指纹 a1。 */
function generateA1(): string {
  const ts = Date.now().toString(16);
  let rand = "";
  for (let i = 0; i < 30; i++) rand += A1_CHARSET[Math.floor(Math.random() * A1_CHARSET.length)];
  const source = ts + rand + "50000";
  return (source + crc32(source)).slice(0, 52);
}

function generateWebId(a1: string): string {
  return crypto.createHash("md5").update(a1).digest("hex");
}

/** 将 "k=v; k2=v2" 的 Cookie 头解析为键值映射。 */
export function parseCookieString(raw: string): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) {
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k) jar[k] = v;
    }
  }
  return jar;
}

function toCookieString(jar: Record<string, string>): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function baseHeaders(jar: Record<string, string>): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Content-Type": "application/json;charset=UTF-8",
    "sec-ch-ua": '"Microsoft Edge";v="142", "Not?A_Brand";v="8", "Chromium";v="142"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    origin: XHS_HOME,
    referer: XHS_HOME + "/",
    cookie: toCookieString(jar),
  };
}

/** 搜索接口所需的 search_id（与 Web 端一致的 base36 时间戳+随机数）。 */
export function generateSearchId(): string {
  const e = BigInt(Date.now()) << 64n;
  const t = BigInt(Math.floor(Math.random() * 2147483646));
  return (e + t).toString(36).toUpperCase();
}

class XhsClient {
  private session: XhsSession | null = null;
  private sessionAt = 0;
  private runtimeCookie = "";
  /** 游客会话保守有效期；过期或失效时自动重新激活。 */
  private readonly ttlMs = 25 * 60 * 1000;

  /** 是否配置了可用的真人登录 Cookie（同时含 a1 与 web_session）。 */
  hasLoginCookie(): boolean {
    const raw = this.runtimeCookie || process.env.XHS_COOKIE?.trim();
    if (!raw) return false;
    const jar = parseCookieString(raw);
    return Boolean(jar.a1 && jar.web_session);
  }

  /** 仅在当前本地进程内使用登录 Cookie；不会写盘或写回环境变量。 */
  setLoginCookie(raw: string): { ok: boolean; error?: string } {
    const value = raw.trim();
    if (!value) return { ok: false, error: "请填写 Cookie" };
    const jar = parseCookieString(value);
    if (!jar.a1 || !jar.web_session) {
      return { ok: false, error: "Cookie 必须同时包含 a1 与 web_session" };
    }
    this.runtimeCookie = value;
    return { ok: true };
  }

  clearLoginCookie(): void {
    this.runtimeCookie = "";
  }

  async getSession(force = false): Promise<XhsSession> {
    // 1) 真人登录态优先（每次读取环境变量，便于运行期注入后即时生效）
    const envCookie = this.runtimeCookie || process.env.XHS_COOKIE?.trim();
    if (envCookie) {
      const jar = parseCookieString(envCookie);
      if (jar.a1 && jar.web_session) return { jar, mode: "cookie", userId: null };
    }
    // 2) 游客会话缓存
    if (
      !force &&
      this.session &&
      this.session.mode === "guest" &&
      Date.now() - this.sessionAt < this.ttlMs
    ) {
      return this.session;
    }
    const s = await this.activateGuest();
    this.session = s;
    this.sessionAt = Date.now();
    return s;
  }

  private async activateGuest(): Promise<XhsSession> {
    const a1 = generateA1();
    const jar: Record<string, string> = {
      a1,
      webId: generateWebId(a1),
      xsecappid: "xhs-pc-web",
      webBuild: "6.7.4",
      abRequestId: crypto.randomUUID(),
    };

    // scripting → sec_poison_id（安全引导接口，不签名；失败不致命，activate 仍可能通过）
    try {
      const r = await this.fetchWithTimeout(XHS_AS + "/api/sec/v1/scripting", {
        method: "POST",
        headers: baseHeaders(jar),
        body: JSON.stringify({ callFrom: "web", callback: "seccallback" }),
      });
      const t = await r.text();
      const m = t.match(/"secPoisonId"\s*:\s*"([^"]+)"/);
      if (m) jar.sec_poison_id = m[1];
    } catch {
      // 尽力而为，继续激活
    }

    // activate → 游客 web_session
    const uri = "/api/sns/web/v1/login/activate";
    const body = {};
    const sg = signMainApi("POST", uri, jar, undefined, body);
    const r = await this.fetchWithTimeout(XHS_EDITH + uri, {
      method: "POST",
      headers: { ...baseHeaders(jar), ...sg },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => null)) as
      | { code?: number; msg?: string; data?: { session?: string; user_id?: string } }
      | null;
    const sess = j?.data?.session;
    if (!sess) {
      throw new XhsError(
        `游客会话激活失败：${j?.msg ? j.msg : "响应中无 session"}`,
        j?.code,
        r.status
      );
    }
    jar.web_session = String(sess);
    return { jar, mode: "guest", userId: j.data?.user_id ? String(j.data.user_id) : null };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 发起签名请求并返回 { status, json }。
   * - GET 数据端点返回 406 时自动改用 XYW_ 签名重试一次；
   * - 游客会话失效（-100/-101 或 HTTP 461/471）时重新激活并重试一次；
   * - -104（账号无权限，游客访问热搜/搜索）等业务码原样返回，由上层判定并如实标记。
   */
  async request(
    method: "GET" | "POST",
    uri: string,
    opts: {
      params?: Record<string, string | number | string[]>;
      body?: Record<string, unknown>;
      retried?: boolean;
    } = {}
  ): Promise<{ status: number; json: any }> {
    const sess = await this.getSession();

    const sendOne = async (fmt: SignFormat) => {
      const sg = signMainApi(
        method,
        uri,
        sess.jar,
        method === "GET" ? opts.params : undefined,
        method === "POST" ? opts.body : undefined,
        undefined,
        undefined,
        fmt
      );
      const fullUri = method === "GET" ? buildGetUri(uri, opts.params) : uri;
      const init: RequestInit = { method, headers: { ...baseHeaders(sess.jar), ...sg } };
      if (method === "POST") init.body = JSON.stringify(opts.body ?? {});
      return this.fetchWithTimeout(XHS_EDITH + fullUri, init);
    };

    let res = await sendOne("xys");
    if (res.status === 406) {
      await res.text().catch(() => {});
      res = await sendOne("xyw");
    }

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new XhsError(`小红书返回非 JSON（HTTP ${res.status}）：${text.slice(0, 160)}`, undefined, res.status);
    }

    const sessionDead = json?.code === -100 || json?.code === -101 || res.status === 461 || res.status === 471;
    if (sessionDead && sess.mode === "guest" && !opts.retried) {
      this.session = null;
      return this.request(method, uri, { ...opts, retried: true });
    }
    return { status: res.status, json };
  }
}

export const xhsClient = new XhsClient();
