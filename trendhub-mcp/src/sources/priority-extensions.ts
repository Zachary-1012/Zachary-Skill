/**
 * High-priority source-universe extensions.
 *
 * Kept separate from the current adapter-backed catalog so adding an important brand/media
 * ecosystem never implies that it is already live. These specs are merged into the
 * Professional Source Universe UI/planner, but only sources with a real livePlatformId may
 * enter zero-config runtime selection.
 */
import type { ProfessionalSourceSpec } from "./professional-catalog.js";

export const PRIORITY_SOURCE_EXTENSIONS: ProfessionalSourceSpec[] = [
  // China: major communication / community / local-commerce ecosystems
  { id: "qq", label: "QQ", region: "CN", families: ["social-attention", "community-discussion"], access: "licensed-connector", priority: "P1", verticals: ["general", "culture-entertainment"] },
  { id: "qzone", label: "QQ空间 / Qzone", region: "CN", families: ["social-attention", "community-discussion"], access: "licensed-connector", priority: "P1", verticals: ["general", "culture-entertainment"] },
  { id: "wechat-mini-program", label: "微信小程序", region: "CN", families: ["commerce-discovery", "search-intent"], access: "licensed-connector", priority: "P1", verticals: ["general", "retail-commerce", "fashion-luxury", "beauty", "business-corporate"] },
  { id: "wecom", label: "企业微信 / WeCom", region: "CN", families: ["community-discussion", "commerce-discovery"], access: "byo-api", setupOverride: "user-oauth", priority: "P1", verticals: ["business-corporate", "retail-commerce", "marketing-advertising"] },
  { id: "meituan", label: "美团", region: "CN", families: ["commerce-discovery", "search-intent"], access: "licensed-connector", priority: "P1", verticals: ["retail-commerce", "general"] },

  // China: authoritative general / policy / corporate-news context
  { id: "xinhua", label: "新华社 / Xinhua", region: "CN", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P0", verticals: ["general", "business-corporate", "technology", "automotive", "finance-markets"] },
  { id: "people-daily", label: "人民日报 / People's Daily", region: "CN", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P0", verticals: ["general", "business-corporate", "technology", "automotive", "finance-markets"] },
  { id: "cctv-news", label: "央视新闻 / CCTV News", region: "CN", families: ["news-authority", "social-attention", "web-domain"], access: "adapter-planned", priority: "P0", verticals: ["general", "business-corporate", "technology", "automotive"] },
  { id: "china-news", label: "中国新闻网 / China News Service", region: "CN", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P1", verticals: ["general", "business-corporate"] },
  { id: "securities-times", label: "证券时报", region: "CN", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P1", verticals: ["business-corporate", "finance-markets", "technology", "automotive"] },
  { id: "shanghai-securities-news", label: "上海证券报", region: "CN", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P1", verticals: ["business-corporate", "finance-markets", "technology", "automotive"] },

  // Global/APAC: additional high-signal social ecosystems
  { id: "line", label: "LINE", region: "APAC", families: ["social-attention", "community-discussion"], access: "byo-api", setupOverride: "user-oauth", priority: "P1", verticals: ["general", "retail-commerce", "fashion-luxury", "beauty", "culture-entertainment"] },
  { id: "bluesky", label: "Bluesky", region: "GLOBAL", families: ["social-attention", "community-discussion"], access: "byo-api", priority: "P1", verticals: ["general", "technology", "business-corporate", "culture-entertainment"] },
  { id: "lemon8", label: "Lemon8", region: "GLOBAL", families: ["social-attention", "commerce-discovery"], access: "licensed-connector", priority: "P1", verticals: ["fashion-luxury", "beauty", "retail-commerce", "culture-entertainment"] },
  { id: "kakao", label: "Kakao ecosystem", region: "APAC", families: ["social-attention", "community-discussion", "commerce-discovery"], access: "byo-api", setupOverride: "user-oauth", priority: "P1", verticals: ["general", "fashion-luxury", "beauty", "culture-entertainment"] },

  // Global: authoritative editorial/news context
  { id: "associated-press", label: "Associated Press / AP", region: "GLOBAL", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P0", verticals: ["general", "business-corporate", "technology", "automotive"] },
  { id: "bbc", label: "BBC", region: "GLOBAL", families: ["news-authority", "web-domain"], access: "adapter-planned", priority: "P1", verticals: ["general", "business-corporate", "technology", "culture-entertainment"] },
  { id: "new-york-times", label: "The New York Times", region: "GLOBAL", families: ["news-authority", "web-domain"], access: "licensed-connector", priority: "P1", verticals: ["general", "business-corporate", "technology", "fashion-luxury", "culture-entertainment"] },
  { id: "guardian", label: "The Guardian", region: "GLOBAL", families: ["news-authority", "web-domain"], access: "byo-api", priority: "P1", verticals: ["general", "business-corporate", "technology", "fashion-luxury", "culture-entertainment"] },

  // Global: additional consumer fashion / beauty editorial context
  { id: "elle-global", label: "ELLE", region: "GLOBAL", families: ["news-authority", "web-domain", "social-attention"], access: "adapter-planned", priority: "P1", verticals: ["fashion-luxury", "beauty", "culture-entertainment"] },
  { id: "harpers-bazaar-global", label: "Harper's BAZAAR", region: "GLOBAL", families: ["news-authority", "web-domain", "social-attention"], access: "adapter-planned", priority: "P1", verticals: ["fashion-luxury", "beauty", "culture-entertainment"] },
  { id: "gq-global", label: "GQ", region: "GLOBAL", families: ["news-authority", "web-domain", "social-attention"], access: "adapter-planned", priority: "P1", verticals: ["fashion-luxury", "beauty", "automotive", "culture-entertainment"] },
  { id: "allure", label: "Allure", region: "GLOBAL", families: ["news-authority", "web-domain", "social-attention"], access: "adapter-planned", priority: "P1", verticals: ["beauty", "fashion-luxury"] },
];
