/**
 * Professional source universe for TrendHub Professional Intelligence v2.
 *
 * This catalog is intentionally separate from PLATFORMS (which means "live fetchable now").
 * A source being listed here never implies that TrendHub can fetch it without the declared
 * access mode. This prevents coverage marketing from silently becoming fabricated evidence.
 */
import { PRIORITY_SOURCE_EXTENSIONS } from "./priority-extensions.js";

export type SourceRegion = "CN" | "APAC" | "GLOBAL";
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

export type SourceVertical =
  | "general"
  | "fashion-luxury"
  | "beauty"
  | "business-corporate"
  | "technology"
  | "automotive"
  | "finance-markets"
  | "marketing-advertising"
  | "retail-commerce"
  | "culture-entertainment";

export type SourceAccessMode =
  | "live-public"          // zero-key official/public endpoint or public page currently implemented
  | "live-aggregated"      // implemented through a permissively licensed aggregation dependency
  | "byo-api"              // official/approved API; user supplies credentials
  | "local-session"        // local-only user-authorized session/cookie/browser context
  | "licensed-connector"   // commercial/partner connector; never emulated by scraping
  | "adapter-planned";     // catalogued and designed, but not claimed as live

export type UserSetupMode =
  | "zero-config"
  | "optional-local-session"
  | "user-api-key"
  | "user-oauth"
  | "required-local-session"
  | "licensed-connector"
  | "planned";

export interface ProfessionalSourceSpec {
  id: string;
  label: string;
  region: SourceRegion;
  families: SignalFamily[];
  verticals?: SourceVertical[];
  access: SourceAccessMode;
  setupOverride?: UserSetupMode;
  livePlatformId?: string;
  priority: "P0" | "P1" | "P2";
  /** Implementation status is separate from access mode: a credentialed or licensed adapter may still be planned. */
  status?: "live" | "planned";
  evidenceProvenance?: "runtime-adapter" | "catalogued-access-contract";
  notes?: string;
}

function src(
  id: string,
  label: string,
  region: SourceRegion,
  families: SignalFamily[],
  access: SourceAccessMode,
  priority: "P0" | "P1" | "P2",
  extra: Partial<ProfessionalSourceSpec> = {},
): ProfessionalSourceSpec {
  return { id, label, region, families, access, priority, verticals: ["general"], ...extra };
}

export const PROFESSIONAL_SOURCE_CATALOG: ProfessionalSourceSpec[] = [
  // ---- China: social / video / communities ----
  src("xiaohongshu", "小红书", "CN", ["social-attention", "community-discussion", "commerce-discovery"], "live-public", "P0", { livePlatformId: "xiaohongshu", setupOverride: "optional-local-session", verticals: ["general", "fashion-luxury", "beauty", "retail-commerce", "culture-entertainment"], notes: "Zero-config guest evidence remains usable. A user-authorized local session is optional and unlocks richer official hotlist/search evidence; it must never be required for basic use." }),
  src("douyin", "抖音", "CN", ["short-video", "social-attention", "commerce-discovery"], "live-aggregated", "P0", { livePlatformId: "douyin", verticals: ["general", "fashion-luxury", "beauty", "retail-commerce", "automotive", "culture-entertainment"] }),
  src("kuaishou", "快手", "CN", ["short-video", "social-attention", "commerce-discovery"], "live-aggregated", "P0", { livePlatformId: "kuaishou", verticals: ["general", "retail-commerce", "automotive", "culture-entertainment"] }),
  src("weibo", "微博", "CN", ["social-attention", "community-discussion", "news-authority"], "live-public", "P0", { livePlatformId: "weibo", verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive", "culture-entertainment"] }),
  src("bilibili", "哔哩哔哩", "CN", ["long-video", "community-discussion", "social-attention"], "live-aggregated", "P0", { livePlatformId: "bilibili", verticals: ["general", "technology", "automotive", "fashion-luxury", "culture-entertainment"] }),
  src("zhihu", "知乎", "CN", ["community-discussion", "search-intent"], "live-public", "P0", { livePlatformId: "zhihu", verticals: ["general", "business-corporate", "technology", "automotive", "finance-markets"] }),
  src("wechat-channels", "微信视频号", "CN", ["short-video", "social-attention"], "licensed-connector", "P0", { verticals: ["general", "business-corporate", "fashion-luxury", "retail-commerce"], notes: "No unrestricted public OpenAPI for this monitoring use case. Prefer approved/partner connector or a user-authorized local adapter; do not emulate a private client on the hosted service." }),
  src("wechat-official", "微信公众号", "CN", ["news-authority", "web-domain", "social-attention"], "licensed-connector", "P0", { verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive", "finance-markets", "marketing-advertising"] }),
  src("tieba", "百度贴吧", "CN", ["community-discussion"], "live-aggregated", "P1", { livePlatformId: "tieba", verticals: ["general", "technology", "automotive", "culture-entertainment"] }),
  src("douban", "豆瓣", "CN", ["community-discussion", "social-attention"], "adapter-planned", "P1", { verticals: ["culture-entertainment", "fashion-luxury", "general"] }),
  src("hupu", "虎扑", "CN", ["community-discussion", "social-attention"], "live-aggregated", "P1", { livePlatformId: "hupu", verticals: ["general", "automotive", "culture-entertainment"] }),
  src("coolapk", "酷安", "CN", ["community-discussion", "developer-tech"], "live-aggregated", "P1", { livePlatformId: "coolapk", verticals: ["technology"] }),
  src("dianping", "大众点评", "CN", ["commerce-discovery", "community-discussion"], "licensed-connector", "P1", { verticals: ["retail-commerce", "general"], notes: "Use approved commerce/location data access where available; do not depend on private app APIs." }),

  // ---- China: podcast / audio ----
  src("xiaoyuzhou", "小宇宙播客", "CN", ["podcast-audio", "community-discussion"], "adapter-planned", "P0", { verticals: ["general", "business-corporate", "technology", "fashion-luxury", "culture-entertainment"], notes: "Prefer public Web/RSS-compatible metadata; do not depend on private mobile APIs for hosted mode." }),
  src("ximalaya", "喜马拉雅", "CN", ["podcast-audio"], "byo-api", "P0", { verticals: ["general", "business-corporate", "finance-markets", "culture-entertainment"], notes: "Prefer official/approved API or public Web metadata; reverse-engineered client APIs are not a production dependency." }),
  src("netease-cloud-podcast", "网易云音乐播客", "CN", ["podcast-audio", "social-attention"], "adapter-planned", "P0", { verticals: ["general", "culture-entertainment"] }),
  src("qqmusic-podcast", "QQ音乐播客", "CN", ["podcast-audio", "social-attention"], "adapter-planned", "P1", { verticals: ["general", "culture-entertainment"] }),
  src("lizhi", "荔枝", "CN", ["podcast-audio"], "adapter-planned", "P1", { verticals: ["general", "culture-entertainment"] }),

  // ---- China: search / Web / commerce intent ----
  src("baidu-hot", "百度热搜", "CN", ["search-intent", "social-attention"], "live-public", "P0", { livePlatformId: "baidu" }),
  src("baidu-index", "百度指数", "CN", ["search-intent"], "local-session", "P0", { verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive", "retail-commerce"], notes: "User-authorized local session only unless an approved API becomes available." }),
  src("wechat-index", "微信指数", "CN", ["search-intent", "social-attention"], "local-session", "P1", { verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive"] }),
  src("baidu-news", "百度资讯/新闻", "CN", ["news-authority", "web-domain"], "adapter-planned", "P0"),
  src("sogou-search", "搜狗搜索", "CN", ["search-intent", "web-domain"], "adapter-planned", "P1"),
  src("tmall", "天猫", "CN", ["commerce-discovery", "search-intent"], "licensed-connector", "P0", { verticals: ["fashion-luxury", "beauty", "retail-commerce", "technology"], notes: "Commerce signals should use approved marketplace/merchant data or user-authorized exports; no hosted private-session scraping." }),
  src("jd", "京东", "CN", ["commerce-discovery", "search-intent"], "licensed-connector", "P0", { verticals: ["technology", "beauty", "retail-commerce", "automotive"] }),

  // ---- China: general / business / technology media ----
  src("toutiao", "今日头条", "CN", ["news-authority", "social-attention"], "live-aggregated", "P0", { livePlatformId: "toutiao" }),
  src("thepaper", "澎湃新闻", "CN", ["news-authority", "web-domain"], "live-aggregated", "P0", { livePlatformId: "thepaper", verticals: ["general", "business-corporate"] }),
  src("qq-news", "腾讯新闻", "CN", ["news-authority", "web-domain"], "live-aggregated", "P0", { livePlatformId: "qq-news" }),
  src("netease-news", "网易新闻", "CN", ["news-authority", "web-domain"], "live-aggregated", "P1", { livePlatformId: "netease-news" }),
  src("sina-news", "新浪新闻", "CN", ["news-authority", "web-domain"], "live-aggregated", "P1", { livePlatformId: "sina-news" }),
  src("36kr", "36氪", "CN", ["news-authority", "developer-tech", "web-domain"], "live-aggregated", "P0", { livePlatformId: "36kr", verticals: ["business-corporate", "technology", "finance-markets"] }),
  src("huxiu", "虎嗅", "CN", ["news-authority", "web-domain"], "live-aggregated", "P0", { livePlatformId: "huxiu", verticals: ["business-corporate", "technology", "marketing-advertising"] }),
  src("ithome", "IT之家", "CN", ["news-authority", "developer-tech"], "live-aggregated", "P0", { livePlatformId: "ithome", verticals: ["technology", "automotive"] }),
  src("caixin", "财新", "CN", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["business-corporate", "finance-markets"] }),
  src("yicai", "第一财经", "CN", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["business-corporate", "finance-markets", "automotive", "technology"] }),
  src("jiemian", "界面新闻", "CN", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["business-corporate", "finance-markets", "fashion-luxury", "beauty", "automotive"] }),
  src("latepost", "晚点 LatePost", "CN", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["business-corporate", "technology", "automotive"] }),
  src("tmtpost", "钛媒体", "CN", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["business-corporate", "technology"] }),

  // ---- China: fashion / luxury / beauty editorial ----
  src("vogue-china", "VOGUE China", "CN", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "culture-entertainment"] }),
  src("elle-china", "ELLE China", "CN", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "culture-entertainment"] }),
  src("harpers-bazaar-china", "时尚芭莎 / Harper's BAZAAR China", "CN", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "culture-entertainment"] }),
  src("gq-china", "GQ China / 智族GQ", "CN", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "automotive", "culture-entertainment"] }),
  src("marie-claire-china", "嘉人 Marie Claire China", "CN", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["fashion-luxury", "beauty"] }),
  src("hypebeast-cn", "Hypebeast 中文", "CN", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P1", { verticals: ["fashion-luxury", "culture-entertainment", "retail-commerce"] }),
  src("socialbeta", "SocialBeta", "CN", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["marketing-advertising", "business-corporate", "fashion-luxury", "beauty"] }),
  src("digitaling", "数英 Digitaling", "CN", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["marketing-advertising", "business-corporate"] }),
  src("morketing", "Morketing", "CN", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["marketing-advertising", "business-corporate", "technology"] }),
  src("adquan", "广告门", "CN", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["marketing-advertising", "business-corporate"] }),

  // ---- Global: social / video / communities ----
  src("youtube", "YouTube", "GLOBAL", ["long-video", "short-video", "social-attention", "podcast-audio"], "byo-api", "P0", { verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive", "culture-entertainment"], notes: "YouTube Data API is the preferred production path; BYO credentials keep quota ownership with the user or organization." }),
  src("tiktok", "TikTok", "GLOBAL", ["short-video", "social-attention", "commerce-discovery"], "byo-api", "P0", { verticals: ["general", "fashion-luxury", "beauty", "retail-commerce", "culture-entertainment"] }),
  src("instagram", "Instagram", "GLOBAL", ["social-attention", "short-video", "commerce-discovery"], "byo-api", "P0", { setupOverride: "user-oauth", verticals: ["general", "fashion-luxury", "beauty", "retail-commerce", "culture-entertainment"] }),
  src("facebook", "Facebook", "GLOBAL", ["social-attention", "community-discussion"], "byo-api", "P0", { setupOverride: "user-oauth" }),
  src("threads", "Threads", "GLOBAL", ["social-attention", "community-discussion"], "byo-api", "P0", { setupOverride: "user-oauth", verticals: ["general", "fashion-luxury", "technology", "culture-entertainment"] }),
  src("x", "X", "GLOBAL", ["social-attention", "community-discussion", "news-authority"], "byo-api", "P0", { verticals: ["general", "business-corporate", "finance-markets", "technology", "automotive", "fashion-luxury"] }),
  src("reddit", "Reddit", "GLOBAL", ["community-discussion", "social-attention"], "live-public", "P0", { livePlatformId: "reddit-technology", verticals: ["general", "technology", "automotive", "finance-markets", "fashion-luxury"] }),
  src("linkedin", "LinkedIn", "GLOBAL", ["social-attention", "news-authority"], "byo-api", "P1", { setupOverride: "user-oauth", verticals: ["business-corporate", "technology", "finance-markets", "marketing-advertising"] }),
  src("pinterest", "Pinterest", "GLOBAL", ["social-attention", "commerce-discovery"], "byo-api", "P1", { setupOverride: "user-oauth", verticals: ["fashion-luxury", "beauty", "retail-commerce"] }),
  src("snapchat", "Snapchat", "GLOBAL", ["short-video", "social-attention"], "byo-api", "P1", { verticals: ["general", "fashion-luxury", "beauty", "culture-entertainment"] }),
  src("twitch", "Twitch", "GLOBAL", ["long-video", "social-attention"], "byo-api", "P1", { setupOverride: "user-oauth", verticals: ["technology", "culture-entertainment"] }),
  src("telegram", "Telegram public channels", "GLOBAL", ["community-discussion", "news-authority"], "byo-api", "P1", { verticals: ["general", "business-corporate", "finance-markets", "technology"] }),
  src("discord", "Discord public/authorized communities", "GLOBAL", ["community-discussion"], "byo-api", "P1", { setupOverride: "user-oauth", verticals: ["technology", "culture-entertainment"] }),
  src("whatsapp-channels", "WhatsApp Channels", "GLOBAL", ["social-attention", "news-authority"], "licensed-connector", "P1", { verticals: ["general", "business-corporate", "fashion-luxury"] }),

  // ---- Global/APAC: podcast / audio ----
  src("apple-podcasts", "Apple Podcasts", "GLOBAL", ["podcast-audio"], "live-public", "P0", { livePlatformId: "apple-podcasts", verticals: ["general", "business-corporate", "technology", "fashion-luxury", "culture-entertainment"], notes: "Public Apple catalog search is live. Search relevance is not a chart rank or listener count." }),
  src("spotify-podcasts", "Spotify Podcasts", "GLOBAL", ["podcast-audio"], "byo-api", "P0", { setupOverride: "user-oauth", verticals: ["general", "business-corporate", "technology", "fashion-luxury", "culture-entertainment"] }),

  // ---- Global/APAC: search / web / discovery ----
  src("google-trends", "Google Trends", "GLOBAL", ["search-intent"], "live-public", "P0", { verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive", "retail-commerce"] }),
  src("google-trending-now", "Google Trending Now", "GLOBAL", ["search-intent", "news-authority"], "adapter-planned", "P0"),
  src("google-news", "Google News", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0"),
  src("bing-news", "Bing News/Search", "GLOBAL", ["search-intent", "news-authority", "web-domain"], "byo-api", "P1"),
  src("naver-search", "NAVER Search/DataLab", "APAC", ["search-intent", "web-domain"], "byo-api", "P1", { verticals: ["fashion-luxury", "beauty", "culture-entertainment", "retail-commerce"] }),
  src("gdelt", "GDELT", "GLOBAL", ["news-authority", "web-domain"], "live-public", "P0", { livePlatformId: "gdelt", verticals: ["general", "business-corporate", "finance-markets", "technology", "automotive"], notes: "GDELT DOC article evidence is live and query-configurable; it is coverage evidence, not a popularity rank." }),
  src("common-crawl", "Common Crawl", "GLOBAL", ["web-domain"], "adapter-planned", "P2", { notes: "Long-horizon Web/domain evidence, not a real-time hotlist source." }),
  src("brand-owned-domain", "Brand / company owned domains", "GLOBAL", ["web-domain", "news-authority"], "adapter-planned", "P0", { verticals: ["general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive", "finance-markets", "retail-commerce"], notes: "User supplies official website/newsroom/IR URLs or RSS. Owned media is evaluated separately from earned media to avoid double-counting brand claims as independent coverage." }),
  src("amazon", "Amazon", "GLOBAL", ["commerce-discovery", "search-intent"], "licensed-connector", "P1", { verticals: ["retail-commerce", "beauty", "fashion-luxury", "technology"] }),

  // ---- Global: fashion / luxury / beauty media ----
  src("vogue", "Vogue", "GLOBAL", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "culture-entertainment"] }),
  src("vogue-business", "Vogue Business", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "business-corporate", "retail-commerce"] }),
  src("business-of-fashion", "The Business of Fashion", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "business-corporate", "retail-commerce"] }),
  src("wwd", "WWD", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "business-corporate", "retail-commerce"] }),
  src("jing-daily", "Jing Daily", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["fashion-luxury", "beauty", "business-corporate", "retail-commerce"], notes: "Useful China-luxury editorial source; keep it separate from consumer social evidence." }),
  src("hypebeast", "Hypebeast", "GLOBAL", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P1", { verticals: ["fashion-luxury", "culture-entertainment", "retail-commerce"] }),
  src("highsnobiety", "Highsnobiety", "GLOBAL", ["news-authority", "web-domain", "social-attention"], "adapter-planned", "P1", { verticals: ["fashion-luxury", "culture-entertainment", "retail-commerce"] }),
  src("fashion-network", "FashionNetwork.com", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["fashion-luxury", "business-corporate", "retail-commerce"] }),
  src("glossy", "Glossy", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["fashion-luxury", "beauty", "marketing-advertising", "retail-commerce"] }),

  // ---- Global: business / finance / tech / marketing media ----
  src("reuters", "Reuters", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["general", "business-corporate", "finance-markets", "technology", "automotive"] }),
  src("bloomberg", "Bloomberg", "GLOBAL", ["news-authority", "web-domain"], "licensed-connector", "P0", { verticals: ["business-corporate", "finance-markets", "technology", "automotive", "fashion-luxury"] }),
  src("financial-times", "Financial Times", "GLOBAL", ["news-authority", "web-domain"], "licensed-connector", "P0", { verticals: ["business-corporate", "finance-markets", "technology", "fashion-luxury"] }),
  src("wsj", "The Wall Street Journal", "GLOBAL", ["news-authority", "web-domain"], "licensed-connector", "P0", { verticals: ["business-corporate", "finance-markets", "technology", "automotive"] }),
  src("cnbc", "CNBC", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["business-corporate", "finance-markets", "technology"] }),
  src("forbes", "Forbes", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["business-corporate", "finance-markets", "technology", "fashion-luxury"] }),
  src("fortune", "Fortune", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["business-corporate", "finance-markets", "technology"] }),
  src("business-insider", "Business Insider", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["business-corporate", "finance-markets", "technology", "retail-commerce"] }),
  src("techcrunch", "TechCrunch", "GLOBAL", ["news-authority", "developer-tech", "web-domain"], "live-public", "P0", { livePlatformId: "techcrunch", verticals: ["technology", "business-corporate", "finance-markets"], notes: "Official public RSS evidence; publication recency, not social popularity." }),
  src("the-verge", "The Verge", "GLOBAL", ["news-authority", "web-domain"], "live-public", "P1", { livePlatformId: "the-verge", verticals: ["technology", "culture-entertainment"], notes: "Official public RSS evidence; publication recency, not social popularity." }),
  src("wired", "WIRED", "GLOBAL", ["news-authority", "web-domain"], "live-public", "P1", { livePlatformId: "wired", verticals: ["technology", "business-corporate", "culture-entertainment"], notes: "Official public RSS evidence; publication recency, not social popularity." }),
  src("adage", "Ad Age", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["marketing-advertising", "business-corporate"] }),
  src("adweek", "Adweek", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["marketing-advertising", "business-corporate", "fashion-luxury"] }),
  src("campaign", "Campaign", "GLOBAL", ["news-authority", "web-domain"], "adapter-planned", "P0", { verticals: ["marketing-advertising", "business-corporate"] }),
  src("warc", "WARC", "GLOBAL", ["news-authority", "web-domain"], "licensed-connector", "P0", { verticals: ["marketing-advertising", "business-corporate"] }),
  src("marketing-interactive", "Marketing-Interactive", "APAC", ["news-authority", "web-domain"], "adapter-planned", "P1", { verticals: ["marketing-advertising", "business-corporate", "fashion-luxury"] }),

  // ---- Global: developer / product discovery ----
  src("hackernews", "Hacker News", "GLOBAL", ["developer-tech", "community-discussion"], "live-public", "P0", { livePlatformId: "hackernews", verticals: ["technology", "business-corporate"] }),
  src("github-trending", "GitHub Trending", "GLOBAL", ["developer-tech"], "live-public", "P0", { livePlatformId: "github-trending", verticals: ["technology"] }),
  src("producthunt", "Product Hunt", "GLOBAL", ["developer-tech", "commerce-discovery"], "live-public", "P1", { livePlatformId: "producthunt", verticals: ["technology", "business-corporate", "retail-commerce"] }),
];

export function professionalSourceCatalog(): ProfessionalSourceSpec[] {
  const seen = new Set<string>();
  return [...PROFESSIONAL_SOURCE_CATALOG, ...PRIORITY_SOURCE_EXTENSIONS]
    .filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    })
    .map((x) => ({
      ...x,
      families: [...x.families],
      verticals: [...(x.verticals ?? ["general"])],
      status: x.status ?? (x.livePlatformId ? "live" : "planned"),
      evidenceProvenance: x.evidenceProvenance ?? (x.livePlatformId ? "runtime-adapter" : "catalogued-access-contract"),
    }));
}

export function sourceSpec(id: string): ProfessionalSourceSpec | null {
  return professionalSourceCatalog().find((x) => x.id === id || x.livePlatformId === id) ?? null;
}

export function sourceUserSetup(source: ProfessionalSourceSpec): {
  mode: UserSetupMode;
  blocksBasicUse: boolean;
  userAction: string | null;
} {
  const mode = source.setupOverride ?? (
    source.access === "live-public" || source.access === "live-aggregated" ? "zero-config" :
    source.access === "byo-api" ? "user-api-key" :
    source.access === "local-session" ? "required-local-session" :
    source.access === "licensed-connector" ? "licensed-connector" :
    "planned"
  );
  if (mode === "zero-config") return { mode, blocksBasicUse: false, userAction: null };
  if (mode === "optional-local-session") return { mode, blocksBasicUse: false, userAction: "可选：仅在本地授权一次登录会话/Cookie，以解锁更深数据；基础能力无需配置。" };
  if (mode === "user-oauth") return { mode, blocksBasicUse: true, userAction: "连接官方 OAuth；TrendHub 不保存第三方账号密码。" };
  if (mode === "user-api-key") return { mode, blocksBasicUse: true, userAction: "添加该平台官方/批准 API 凭据；凭据由用户或组织持有。" };
  if (mode === "required-local-session") return { mode, blocksBasicUse: true, userAction: "仅在本地授权浏览器会话/Cookie；公网托管端不接收私人 Cookie。" };
  if (mode === "licensed-connector") return { mode, blocksBasicUse: true, userAction: "连接已获授权的数据供应商/合作方；未授权时不伪装成可用源。" };
  return { mode, blocksBasicUse: true, userAction: "该适配器仍在开发；在真正可用前只作为覆盖规划，不计入 live coverage。" };
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

export function prioritySourceUniverse(priority: "P0" | "P1" | "P2" = "P0") {
  const order = { P0: 0, P1: 1, P2: 2 } as const;
  const ceiling = order[priority];
  return professionalSourceCatalog()
    .filter((source) => order[source.priority] <= ceiling)
    .map((source) => ({ ...source, onboarding: sourceUserSetup(source) }));
}
