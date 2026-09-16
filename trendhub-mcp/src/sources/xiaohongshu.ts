/**
 * 小红书（Xiaohongshu / RED）自研采集源。
 *
 * 数据口径（务必随结果传达，禁止伪造）：
 *  - platform=xiaohongshu        ：官方首页「热门推荐流」笔记，游客零登录可取，含标题/作者/封面/点赞展示值；
 *                                  这是平台推荐序的热门内容，不是官方「热搜词榜」。
 *  - platform=xiaohongshu-hotlist：官方「热搜词榜」，仅登录态开放，需环境变量 XHS_COOKIE；
 *                                  未配置时显式 missing 并给出配置说明，绝不返回编造词榜。
 *  - 关键词爆款笔记搜索（search/notes，按热度排序）同样仅登录态开放，供 analyze_topic 增强。
 *  - liked_count 为平台展示近似文案（"4.1万"/"10万+"），hotText 原样保留；hot 为派生数值，仅同平台内可比。
 */
import type { HotItem, HotResult } from "../util/schema.js";
import { missingResult, nowIso } from "../util/schema.js";
import { TtlCache } from "../util/http.js";
import { config } from "../config.js";
import { xhsClient, generateSearchId, XHS_HOME } from "./xhs/guest.js";

const cache = new TtlCache<HotResult>(config.cacheTtlSec);

export const XHS_PLATFORM = "xiaohongshu";
export const XHS_HOTLIST_PLATFORM = "xiaohongshu-hotlist";
export const XHS_LABEL = "小红书热门笔记";
export const XHS_HOTLIST_LABEL = "小红书热搜词榜";
export const XHS_CATEGORY = "social";

const GUEST_NOTE =
  "游客模式：小红书官方首页「热门推荐流」（非官方热搜词榜）；liked_count 为平台展示近似值（如 4.1万 / 10万+，非精确整数）。配置环境变量 XHS_COOKIE（含 a1 与 web_session 的网页 Cookie）可额外启用官方热搜词榜与关键词爆款搜索。";
const LOGIN_NOTE = "登录态（XHS_COOKIE）：小红书首页热门推荐流。";
const HOTLIST_MISSING_NOTE =
  "官方热搜词榜仅对登录态开放：请配置环境变量 XHS_COOKIE（小红书网页端完整 Cookie，需同时含 a1 与 web_session）。零登录可改用 platform=xiaohongshu 的「热门笔记」。";

/** 解析平台展示热度文案："757"→757，"4.1万"→41000，"10万+"→100000，"1.2亿"→120000000。无法解析为 null。 */
export function parseCount(text: string | null | undefined): number | null {
  if (text == null) return null;
  const m = String(text).replace(/,/g, "").match(/([\d.]+)\s*(万|亿|w|W)?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = m[2];
  if (unit === "万" || unit === "w" || unit === "W") return Math.round(n * 1e4);
  if (unit === "亿") return Math.round(n * 1e8);
  return Math.round(n);
}

function pickCover(cover: any): string | null {
  if (!cover || typeof cover !== "object") return null;
  const u = cover.urlDefault || cover.url || cover.info_list?.[0]?.url || null;
  return typeof u === "string" && u.startsWith("http") ? u : null;
}

function noteUrl(id: string, token: string | null): string | null {
  if (!id) return null;
  const q = token ? `?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed` : "";
  return `${XHS_HOME}/explore/${id}${q}`;
}

function mapNote(raw: any, rank: number): HotItem | null {
  const nc = raw?.note_card ?? raw ?? {};
  const id = String(raw?.id ?? nc.note_id ?? nc.id ?? "").trim();
  const title = String(nc.display_title ?? nc.title ?? "").trim();
  if (!title) return null;
  const interact = nc.interact_info ?? {};
  const likedText = interact.liked_count != null ? String(interact.liked_count) : null;
  const token = raw?.xsec_token ?? nc.xsec_token ?? null;
  return {
    rank,
    title,
    url: noteUrl(id, token),
    hot: parseCount(likedText),
    hotText: likedText,
    desc: null,
    author: nc.user?.nick_name ?? nc.user?.nickname ?? null,
    externalId: id || null,
    imageUrl: pickCover(nc.cover),
    kind: nc.type ?? null,
  };
}

/** 小红书首页热门推荐流（游客零登录可用）。 */
export async function fetchXiaohongshu(limit: number): Promise<HotResult> {
  const key = `xhs:feed:${limit}:${xhsClient.hasLoginCookie() ? "login" : "guest"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const num = Math.min(Math.max(limit, 1), 40);
  const body = {
    cursor_score: "",
    num,
    refresh_type: 1,
    note_index: 0,
    unread_begin_note_id: "",
    unread_end_note_id: "",
    unread_note_count: 0,
    category: "homefeed_recommend",
    search_key: "",
    need_num: num,
    image_scenes: ["FD_PRV_WEBP", "FD_WM_WEBP"],
  };

  try {
    const { status, json } = await xhsClient.request("POST", "/api/sns/web/v1/homefeed", { body });
    if (!json || json.success !== true) {
      const res = missingResult(
        XHS_PLATFORM,
        XHS_LABEL,
        XHS_CATEGORY,
        `小红书热门流获取失败（HTTP ${status}, code=${json?.code ?? "?"}, msg=${json?.msg ?? "无响应"}）。`
      );
      return res;
    }
    const rows: any[] = json?.data?.items ?? [];
    const items: HotItem[] = rows
      .map((r, i) => mapNote(r, i + 1))
      .filter((x): x is HotItem => x !== null)
      .slice(0, limit);

    const login = xhsClient.hasLoginCookie();
    const res: HotResult = {
      platform: XHS_PLATFORM,
      label: XHS_LABEL,
      category: XHS_CATEGORY,
      capturedAt: nowIso(),
      sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded",
      items,
      note: items.length ? (login ? LOGIN_NOTE : GUEST_NOTE) : "小红书热门流未返回笔记（可能触发游客风控，稍后重试或配置 XHS_COOKIE）。",
    };
    cache.set(key, res);
    return res;
  } catch (e) {
    return missingResult(XHS_PLATFORM, XHS_LABEL, XHS_CATEGORY, `小红书热门流请求失败：${(e as Error).message}`);
  }
}

/** 小红书官方热搜词榜（仅登录态；游客显式 missing）。 */
export async function fetchXiaohongshuHotlist(limit: number): Promise<HotResult> {
  if (!xhsClient.hasLoginCookie()) {
    return missingResult(XHS_HOTLIST_PLATFORM, XHS_HOTLIST_LABEL, XHS_CATEGORY, HOTLIST_MISSING_NOTE);
  }
  const key = `xhs:hotlist:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const { status, json } = await xhsClient.request("GET", "/api/sns/web/v1/search/hotlist", {
      params: { num: limit },
    });
    if (!json || json.success !== true) {
      return missingResult(
        XHS_HOTLIST_PLATFORM,
        XHS_HOTLIST_LABEL,
        XHS_CATEGORY,
        `热搜词榜获取失败（HTTP ${status}, code=${json?.code ?? "?"}, msg=${json?.msg ?? "无响应"}）；Cookie 可能已过期或该账号无权限。`
      );
    }
    const d = json.data;
    const rows: any[] = d?.items ?? d?.hot_list ?? d?.list ?? d?.word_list ?? (Array.isArray(d) ? d : []);
    const items: HotItem[] = rows
      .map((r, i) => {
        const word = String(r.word ?? r.title ?? r.name ?? r.query ?? r.note ?? "").trim();
        if (!word) return null;
        const score = Number(r.score ?? r.num ?? r.view_count ?? r.hot_value ?? r.value ?? NaN);
        return {
          rank: typeof r.rank === "number" ? r.rank : i + 1,
          title: word,
          url: `${XHS_HOME}/search_result?keyword=${encodeURIComponent(word)}&source=web_explore_feed`,
          hot: Number.isFinite(score) ? score : null,
          hotText: r.display_word ?? r.score_text ?? (Number.isFinite(score) ? String(score) : null),
          desc: r.desc ?? r.reason ?? null,
          author: null,
          externalId: r.id != null ? String(r.id) : null,
          imageUrl: null,
          kind: null,
        } as HotItem;
      })
      .filter((x): x is HotItem => x !== null)
      .slice(0, limit);

    const res: HotResult = {
      platform: XHS_HOTLIST_PLATFORM,
      label: XHS_HOTLIST_LABEL,
      category: XHS_CATEGORY,
      capturedAt: nowIso(),
      sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded",
      items,
      note: items.length
        ? "登录态（XHS_COOKIE）：小红书官方热搜词榜。"
        : `热搜词榜响应结构未识别（data keys: ${d && typeof d === "object" ? Object.keys(d).join(",") : typeof d}），请反馈以适配。`,
    };
    cache.set(key, res);
    return res;
  } catch (e) {
    return missingResult(XHS_HOTLIST_PLATFORM, XHS_HOTLIST_LABEL, XHS_CATEGORY, `热搜词榜请求失败：${(e as Error).message}`);
  }
}

/**
 * 关键词爆款笔记搜索（按热度排序），仅登录态可用。
 * 供 analyze_topic / 选题增强；游客或失败时返回 null（调用方静默跳过，不造假）。
 */
export async function searchXhsNotes(
  keyword: string,
  limit = 20,
  sort: "general" | "popularity_descending" | "time_descending" = "popularity_descending"
): Promise<HotItem[] | null> {
  if (!keyword.trim() || !xhsClient.hasLoginCookie()) return null;
  try {
    const pageSize = Math.min(Math.max(limit, 1), 20);
    const { json } = await xhsClient.request("POST", "/api/sns/web/v1/search/notes", {
      body: {
        keyword,
        page: 1,
        page_size: pageSize,
        search_id: generateSearchId(),
        sort,
        note_type: 0,
      },
    });
    if (!json || json.success !== true) return null;
    const rows: any[] = json?.data?.items ?? json?.data?.notes ?? [];
    return rows
      .map((r, i) => mapNote(r, i + 1))
      .filter((x): x is HotItem => x !== null)
      .slice(0, limit);
  } catch {
    return null;
  }
}
