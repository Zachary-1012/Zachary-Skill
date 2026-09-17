/**
 * Professional source universe for TrendHub Professional Intelligence v2.
 *
 * This catalog is intentionally separate from PLATFORMS (which means "live fetchable now").
 * A source being listed here never implies that TrendHub can fetch it without the declared
 * access mode. This prevents coverage marketing from silently becoming fabricated evidence.
 */

export type SourceRegion = "CN" | "GLOBAL";
export type SignalFamily =
  | "social-attention"
  | "short-video"
  | "long-video"
  | "community-discussion"
  | "podcast-audio"
  | "search-intent"
  | "news-authority"
  | "web-domain"
  | "developer-tech"
  | "commerce-discovery";

export type SourceAccessMode =
  | "live-public"          // zero-key official/public endpoint or public page currently implemented
  | "live-aggregated"      // implemented through a permissively licensed aggregation dependency
  | "byo-api"              // official/approved API; user supplies credentials
  | "local-session"        // local-only user-authorized session/cookie/browser context
  | "licensed-connector"   // commercial/partner connector; never emulated by scraping
  | "adapter-planned";     // catalogued and designed, but not claimed as live

export interface ProfessionalSourceSpec {
  id: string;
  label: string;
  region: SourceRegion;
  families: SignalFamily[];
  access: SourceAccessMode;
  livePlatformId?: string;
  priority: "P0" | "P1" | "P2";
  notes?: string;
}

export const PROFESSIONAL_SOURCE_CATALOG: ProfessionalSourceSpec[] = [
  // ---- China: social / video / communities ----
  { id: "xiaohongshu", label: "小红书", region: "CN", families: ["social-attention", "community-discussion"], access: "live-public", livePlatformId: "xiaohongshu", priority: "P0" },
  { id: "douyin", label: "抖音", region: "CN", families: ["short-video", "social-attention"], access: "live-aggregated", livePlatformId: "douyin", priority: "P0" },
  { id: "kuaishou", label: "快手", region: "CN", families: ["short-video", "social-attention"], access: "live-aggregated", livePlatformId: "kuaishou", priority: "P0" },
  { id: "weibo", label: "微博", region: "CN", families: ["social-attention", "community-discussion"], access: "live-public", livePlatformId: "weibo", priority: "P0" },
  { id: "bilibili", label: "哔哩哔哩", region: "CN", families: ["long-video", "community-discussion", "social-attention"], access: "live-aggregated", livePlatformId: "bilibili", priority: "P0" },
  { id: "zhihu", label: "知乎", region: "CN", families: ["community-discussion", "search-intent"], access: "live-public", livePlatformId: "zhihu", priority: "P0" },
  { id: "tieba", label: "百度贴吧", region: "CN", families: ["community-discussion"], access: "live-aggregated", livePlatformId: "tieba", priority: "P1" },
  { id: "douban", label: "豆瓣", region: "CN", families: ["community-discussion", "social-attention"], access: "adapter-planned", priority: "P1" },
  { id: "wechat-channels", label: "微信视频号", region: "CN", families: ["short-video", "social-attention"], access: "licensed-connector", priority: "P0", notes: "No unrestricted public OpenAPI; prefer approved/partner connector or user-authorized local adapter." },
  { id: "wechat-official", label: "微信公众号", region: "CN", families: ["news-authority", "web-domain"], access: "licensed-connector", priority: "P0" },
  { id: "toutiao", label: "今日头条", region: "CN", families: ["news-authority", "social-attention"], access: "live-aggregated", livePlatformId: "toutiao", priority: "P0" },
  { id: "hupu", label: "虎扑", region: "CN", families: ["community-discussion"], access: "live-aggregated", livePlatformId: "hupu", priority: "P1" },
  { id: "coolapk", label: "酷安", region: "CN", families: ["community-discussion", "developer-tech"], access: "live-aggregated", livePlatformId: "coolapk", priority: "P1" },

  // ---- China: podcast / audio ----
  { id: "xiaoyuzhou", label: "小宇宙播客", region: "CN", families: ["podcast-audio", "community-discussion"], access: "adapter-planned", priority: "P0", notes: "Prefer public Web/RSS-compatible metadata; do not depend on private mobile APIs for hosted mode." },
  { id: "ximalaya", label: "喜马拉雅", region: "CN", families: ["podcast-audio"], access: "byo-api", priority: "P0", notes: "Prefer official/approved API or public Web metadata; reverse-engineered client APIs are not a production dependency." },
  { id: "netease-cloud-podcast", label: "网易云音乐播客", region: "CN", families: ["podcast-audio", "social-attention"], access: "adapter-planned", priority: "P0" },
  { id: "qqmusic-podcast", label: "QQ音乐播客", region: "CN", families: ["podcast-audio", "social-attention"], access: "adapter-planned", priority: "P1" },
  { id: "lizhi", label: "荔枝", region: "CN", families: ["podcast-audio"], access: "adapter-planned", priority: "P1" },

  // ---- China: search / intent / Web ----
  { id: "baidu-hot", label: "百度热搜", region: "CN", families: ["search-intent", "social-attention"], access: "live-public", livePlatformId: "baidu", priority: "P0" },
  { id: "baidu-index", label: "百度指数", region: "CN", families: ["search-intent"], access: "local-session", priority: "P0", notes: "User-authorized local session only unless an approved API becomes available." },
  { id: "wechat-index", label: "微信指数", region: "CN", families: ["search-intent", "social-attention"], access: "local-session", priority: "P1" },
  { id: "baidu-news", label: "百度资讯/新闻", region: "CN", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P0" },
  { id: "thepaper", label: "澎湃新闻", region: "CN", families: ["news-authority"], access: "live-aggregated", livePlatformId: "thepaper", priority: "P1" },
  { id: "qq-news", label: "腾讯新闻", region: "CN", families: ["news-authority"], access: "live-aggregated", livePlatformId: "qq-news", priority: "P1" },
  { id: "netease-news", label: "网易新闻", region: "CN", families: ["news-authority"], access: "live-aggregated", livePlatformId: "netease-news", priority: "P1" },
  { id: "sina-news", label: "新浪新闻", region: "CN", families: ["news-authority"], access: "live-aggregated", livePlatformId: "sina-news", priority: "P1" },

  // ---- Global: social / video ----
  { id: "youtube", label: "YouTube", region: "GLOBAL", families: ["long-video", "short-video", "social-attention", "podcast-audio"], access: "byo-api", priority: "P0", notes: "YouTube Data API supports most-popular charts by region; BYO key keeps quota ownership with the user." },
  { id: "tiktok", label: "TikTok", region: "GLOBAL", families: ["short-video", "social-attention"], access: "byo-api", priority: "P0" },
  { id: "instagram", label: "Instagram", region: "GLOBAL", families: ["social-attention", "short-video"], access: "byo-api", priority: "P0" },
  { id: "facebook", label: "Facebook", region: "GLOBAL", families: ["social-attention", "community-discussion"], access: "byo-api", priority: "P0" },
  { id: "threads", label: "Threads", region: "GLOBAL", families: ["social-attention", "community-discussion"], access: "byo-api", priority: "P0" },
  { id: "x", label: "X", region: "GLOBAL", families: ["social-attention", "community-discussion", "news-authority"], access: "byo-api", priority: "P0" },
  { id: "reddit", label: "Reddit", region: "GLOBAL", families: ["community-discussion", "social-attention"], access: "live-public", livePlatformId: "reddit-technology", priority: "P0" },
  { id: "linkedin", label: "LinkedIn", region: "GLOBAL", families: ["social-attention", "news-authority"], access: "byo-api", priority: "P1" },
  { id: "pinterest", label: "Pinterest", region: "GLOBAL", families: ["social-attention", "commerce-discovery"], access: "byo-api", priority: "P1" },
  { id: "twitch", label: "Twitch", region: "GLOBAL", families: ["long-video", "social-attention"], access: "byo-api", priority: "P1" },
  { id: "telegram", label: "Telegram public channels", region: "GLOBAL", families: ["community-discussion", "news-authority"], access: "byo-api", priority: "P1" },

  // ---- Global: podcast / audio ----
  { id: "apple-podcasts", label: "Apple Podcasts", region: "GLOBAL", families: ["podcast-audio"], access: "adapter-planned", priority: "P0", notes: "Use public market charts/RSS metadata where available; charts are market-specific and regularly refreshed." },
  { id: "spotify-podcasts", label: "Spotify Podcasts", region: "GLOBAL", families: ["podcast-audio"], access: "byo-api", priority: "P0", notes: "Spotify Web API uses OAuth and platform policy restrictions must be preserved." },

  // ---- Global: search / Web / marketing ----
  { id: "google-trends", label: "Google Trends", region: "GLOBAL", families: ["search-intent"], access: "live-public", priority: "P0" },
  { id: "google-trending-now", label: "Google Trending Now", region: "GLOBAL", families: ["search-intent", "news-authority"], access: "adapter-planned", priority: "P0" },
  { id: "google-news", label: "Google News", region: "GLOBAL", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P0" },
  { id: "bing-news", label: "Bing News/Search", region: "GLOBAL", families: ["search-intent", "news-authority", "web-domain"], access: "byo-api", priority: "P1" },
  { id: "gdelt", label: "GDELT", region: "GLOBAL", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P0" },
  { id: "common-crawl", label: "Common Crawl", region: "GLOBAL", families: ["web-domain"], access: "adapter-planned", priority: "P2", notes: "Long-horizon Web/domain evidence, not a real-time hotlist source." },
  { id: "hackernews", label: "Hacker News", region: "GLOBAL", families: ["developer-tech", "community-discussion"], access: "live-public", livePlatformId: "hackernews", priority: "P0" },
  { id: "github-trending", label: "GitHub Trending", region: "GLOBAL", families: ["developer-tech"], access: "live-public", livePlatformId: "github-trending", priority: "P0" },
  { id: "producthunt", label: "Product Hunt", region: "GLOBAL", families: ["developer-tech", "commerce-discovery"], access: "live-public", livePlatformId: "producthunt", priority: "P1" },
];

export function professionalSourceCatalog(): ProfessionalSourceSpec[] {
  return PROFESSIONAL_SOURCE_CATALOG.map((x) => ({ ...x, families: [...x.families] }));
}

export function sourceSpec(id: string): ProfessionalSourceSpec | null {
  return PROFESSIONAL_SOURCE_CATALOG.find((x) => x.id === id || x.livePlatformId === id) ?? null;
}

export function sourceFamilyCoverage(ids: string[]) {
  const selected = ids.map(sourceSpec).filter((x): x is ProfessionalSourceSpec => x !== null);
  const families = new Map<SignalFamily, { sources: number; regions: Set<SourceRegion> }>();
  for (const source of selected) {
    for (const family of source.families) {
      const row = families.get(family) ?? { sources: 0, regions: new Set<SourceRegion>() };
      row.sources += 1;
      row.regions.add(source.region);
      families.set(family, row);
    }
  }
  return [...families.entries()].map(([family, row]) => ({
    family,
    sources: row.sources,
    regions: [...row.regions].sort(),
  }));
}
