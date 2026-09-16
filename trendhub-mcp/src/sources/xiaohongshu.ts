/**
 * Xiaohongshu (小红书) hot-trending source.
 *
 * Capability matrix (verified live):
 *   - Guest (zero config): homefeed hot recommendation notes (homefeed_recommend).
 *   - With XHS_COOKIE (a1 + web_session): official search hotlist + keyword search.
 *
 * Data red line: when a capability needs a cookie and none is present, the
 * platform is returned with dataQuality "missing" and setup guidance — never
 * fabricated. liked_count is kept as the platform's own hotText ("4.1万");
 * the numeric `hot` is only a within-platform sort hint.
 */

import type { HotItem, PlatformResult, SourceContext } from "../util/schema.js";
import { xhsClient, generateSearchId, XHS_EDITH, USER_AGENT } from "./xhs/guest.js";
import { extractXhsTopics } from "../analysis/xhsTopics.js";

export const XHS_PLATFORM = "xiaohongshu";
export const XHS_HOTLIST_PLATFORM = "xiaohongshu-hotlist";

interface XhsNoteCard {
  display_title?: string;
  type?: string;
  note_id?: string;
  xsec_token?: string;
  cover?: { url?: string; url_default?: string; urlDefault?: string };
  user?: { nick_name?: string; nickname?: string; user_id?: string };
  interact_info?: { liked_count?: string; likedCount?: string };
}

function noteUrl(id?: string, token?: string): string | undefined {
  if (!id) return undefined;
  const tok = token ? `?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed` : "";
  return `https://www.xiaohongshu.com/explore/${id}${tok}`;
}

function coverUrl(cover?: XhsNoteCard["cover"]): string | undefined {
  if (!cover) return undefined;
  return cover.url || cover.url_default || cover.urlDefault || undefined;
}

/** Parse "4.1万" / "10万+" / "1234" into a comparable number (sort hint only). */
export function parseCount(text?: string): number | null {
  if (!text) return null;
  const m = String(text).trim().match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (/万/.test(text)) n *= 10000;
  if (/亿/.test(text)) n *= 100000000;
  return Math.round(n);
}

function mapNote(card: XhsNoteCard, rank: number): HotItem {
  const id = card.note_id;
  const token = card.xsec_token;
  const likedText = card.interact_info?.liked_count ?? card.interact_info?.likedCount;
  const hot = parseCount(likedText);
  return {
    id: id ? `xhs-note-${id}` : `xhs-note-${rank}`,
    title: card.display_title || "(无标题笔记)",
    rank,
    hot: hot ?? undefined,
    hotText: likedText ? `${likedText} 赞` : undefined,
    url: noteUrl(id, token),
    imageUrl: coverUrl(card.cover),
    kind: card.type === "video" ? "video" : "note",
    author: card.user?.nick_name || card.user?.nickname || undefined,
    source: XHS_PLATFORM,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Guest-accessible homefeed hot recommendation notes.
 * Category is fixed to homefeed_recommend (the only guest-readable feed).
 */
export async function fetchXiaohongshu(ctx: SourceContext): Promise<PlatformResult> {
  const now = new Date().toISOString();
  const client = xhsClient();
  const loggedIn = client.hasLoginCookie();
  const num = Math.min(Math.max(ctx.limit || 30, 1), 40);

  const body: Record<string, unknown> = {
    cursor_score: "",
    extract_flags: "",
    homefeed_feed_type: "normal",
    category: "homefeed_recommend",
    num,
    refresh_type: 1,
    note_index: 0,
    need_num: num,
    search_id: generateSearchId(),
    query_type: 0,
    image_formats: ["jpg", "webp", "avif"],
    image_scenes: ["FD_PRV_WEBP", "FD_WM_WEBP"],
    supported_card_types: ["video", "normal", "live"],
    need_filter_image: false,
    need_num_before_note_index: 0,
    extra: { need_body_cookie_grey: 0, is_video_feed: 0 },
  };

  try {
    const json: any = await client.request({
      method: "POST",
      url: `${XHS_EDITH}/api/sns/web/v1/homefeed`,
      body,
    });
    if (json.code !== 0 || !json.data) {
      return {
        platform: XHS_PLATFORM,
        category: "social",
        items: [],
        updatedAt: now,
        capturedAt: now,
        dataQuality: "degraded",
        sourceUrl: "https://www.xiaohongshu.com/explore",
        error: `homefeed code=${json.code} msg=${json.msg || json.sub_msg || ""}`,
      };
    }
    const rawItems: any[] = json.data.items || [];
    const items: HotItem[] = [];
    let rank = 0;
    for (const it of rawItems) {
      const card: XhsNoteCard = it.note_card || it;
      if (!card || !card.display_title) continue;
      if (card.note_id) card.note_id = card.note_id;
      card.xsec_token = it.xsec_token || card.xsec_token;
      items.push(mapNote(card, ++rank));
    }
    const topics = extractXhsTopics(items.map((i) => i.title), 20);
    return {
      platform: XHS_PLATFORM,
      category: "social",
      items: items.slice(0, ctx.limit || items.length),
      updatedAt: now,
      capturedAt: now,
      dataQuality: loggedIn ? "ok" : "degraded",
      sourceUrl: "https://www.xiaohongshu.com/explore",
      note: loggedIn
        ? `已登录态热门推荐流 ${items.length} 条；附派生话题词（非官方词榜）。`
        : `游客模式：首页热门推荐流 ${items.length} 条（零配置可得）。官方热搜词榜/关键词搜索需配置 XHS_COOKIE。`,
      derived: { topics: topics.topics, topicNote: topics.note, sampleSize: topics.sampleSize },
    } as PlatformResult;
  } catch (err: any) {
    return {
      platform: XHS_PLATFORM,
      category: "social",
      items: [],
      updatedAt: now,
      capturedAt: now,
      dataQuality: "degraded",
      sourceUrl: "https://www.xiaohongshu.com/explore",
      error: `小红书热门流获取失败: ${err?.message || err}`,
    };
  }
}

/**
 * Official search hotlist. Requires XHS_COOKIE; guests receive -104.
 * Parsed leniently across known response shapes; unknown shapes → degraded.
 */
export async function fetchXiaohongshuHotlist(ctx: SourceContext): Promise<PlatformResult> {
  const now = new Date().toISOString();
  const client = xhsClient();
  const sourceUrl = "https://www.xiaohongshu.com/search_result?keyword=%E7%83%AD%E6%90%9C";
  const setupNote =
    "小红书官方热搜词榜需登录态：请在环境变量配置 XHS_COOKIE（需含 a1 与 web_session，从浏览器登录后的 Cookie 复制）。";

  if (!client.hasLoginCookie()) {
    return {
      platform: XHS_HOTLIST_PLATFORM,
      category: "social",
      items: [],
      updatedAt: now,
      capturedAt: now,
      dataQuality: "missing",
      sourceUrl,
      note: setupNote,
    };
  }

  const num = Math.min(Math.max(ctx.limit || 50, 1), 100);
  try {
    const json: any = await client.request({
      method: "GET",
      url: `${XHS_EDITH}/api/sns/web/v1/search/hotlist`,
      params: { num },
    });
    if (json.code !== 0 || !json.data) {
      return {
        platform: XHS_HOTLIST_PLATFORM,
        category: "social",
        items: [],
        updatedAt: now,
        capturedAt: now,
        dataQuality: "degraded",
        sourceUrl,
        error: `hotlist code=${json.code} msg=${json.msg || json.sub_msg || ""} dataKeys=${json.data ? Object.keys(json.data).join(",") : "none"}`,
        note: setupNote,
      };
    }
    const list: any[] =
      json.data.items || json.data.hot_list || json.data.hotlist ||
      json.data.list || json.data.word_list || [];
    const items: HotItem[] = list.slice(0, ctx.limit || list.length).map((w: any, i: number) => {
      const word = w.word || w.title || w.name || w.query || w.note?.word || "";
      const score = w.score ?? w.num ?? w.view_count ?? w.hot_value ?? w.favorite_count;
      return {
        id: `xhs-hot-${i + 1}`,
        title: String(word),
        rank: i + 1,
        hot: typeof score === "number" ? score : undefined,
        hotText: typeof score === "string" ? score : undefined,
        url: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(String(word))}`,
        source: XHS_HOTLIST_PLATFORM,
        capturedAt: now,
      };
    });
    return {
      platform: XHS_HOTLIST_PLATFORM,
      category: "social",
      items,
      updatedAt: now,
      capturedAt: now,
      dataQuality: items.length ? "ok" : "degraded",
      sourceUrl,
      note: items.length
        ? `小红书官方热搜词榜 ${items.length} 条（登录态）。`
        : `热搜词榜返回结构未识别，dataKeys=${Object.keys(json.data).join(",")}`,
    };
  } catch (err: any) {
    return {
      platform: XHS_HOTLIST_PLATFORM,
      category: "social",
      items: [],
      updatedAt: now,
      capturedAt: now,
      dataQuality: "degraded",
      sourceUrl,
      error: `小红书热搜词榜获取失败: ${err?.message || err}`,
      note: setupNote,
    };
  }
}

/**
 * Keyword note search. Requires XHS_COOKIE (guests get -104).
 * Used by analyze_topic / content briefs for logged-in users.
 */
export async function searchXhsNotes(keyword: string, opts: {
  page?: number;
  pageSize?: number;
  sort?: "general" | "time_descending" | "popularity_descending";
} = {}): Promise<{ items: HotItem[]; dataQuality: string; note?: string; error?: string }> {
  const now = new Date().toISOString();
  const client = xhsClient();
  if (!client.hasLoginCookie()) {
    return {
      items: [],
      dataQuality: "missing",
      note: "关键词搜索需登录态：请配置 XHS_COOKIE（含 a1 与 web_session）。",
    };
  }
  const pageSize = Math.min(opts.pageSize || 20, 20);
  const body: Record<string, unknown> = {
    keyword,
    page: opts.page || 1,
    page_size: pageSize,
    search_id: generateSearchId(),
    sort: opts.sort || "general",
    note_type: 0,
    ext_flags: 0,
    image_formats: ["jpg", "webp", "avif"],
    image_scenes: ["FD_PRV_WEBP", "FD_WM_WEBP"],
  };
  try {
    const json: any = await client.request({
      method: "POST",
      url: `${XHS_EDITH}/api/sns/web/v1/search/notes`,
      body,
    });
    if (json.code !== 0 || !json.data) {
      return {
        items: [],
        dataQuality: "degraded",
        error: `search code=${json.code} msg=${json.msg || json.sub_msg || ""}`,
      };
    }
    const rawItems: any[] = json.data.items || [];
    const items: HotItem[] = [];
    let rank = 0;
    for (const it of rawItems) {
      const card: XhsNoteCard = it.note_card || it;
      if (!card || !card.display_title) continue;
      card.xsec_token = it.xsec_token || card.xsec_token;
      items.push(mapNote(card, ++rank));
    }
    return { items, dataQuality: "ok", note: `关键词「${keyword}」搜索到 ${items.length} 条笔记（登录态）。` };
  } catch (err: any) {
    return { items: [], dataQuality: "degraded", error: `搜索失败: ${err?.message || err}` };
  }
}

export const xhsUserAgent = USER_AGENT;
