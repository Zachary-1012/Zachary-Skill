# TrendHub Professional Source Universe v2

Stable v1.5.0 source-universe architecture. v1.4.4 remains the immutable rollback release; planned adapters are still not live coverage.

## Principle

TrendHub does not flatten every platform into one hot-list bucket. Professional Intelligence separates evidence by **signal family**, **industry vertical**, **region**, **source reliability** and **access boundary**.

Signal families:

1. **Social attention** — public attention and discussion velocity.
2. **Short video** — short-form visual/video momentum.
3. **Long video** — long-form video and creator authority.
4. **Community discussion** — depth, disagreement, persistence and niche diffusion.
5. **Podcast / audio** — long-form narrative, expert and creator signals.
6. **Search intent** — explicit demand/search interest, distinct from social chatter.
7. **News authority** — editorial/news confirmation and agenda-setting.
8. **Web / domain** — broader Web mentions, owned/earned domain evidence and long-horizon discovery.
9. **Developer / tech** — technical adoption and builder attention.
10. **Commerce discovery** — product/consumer discovery signals.

Industry verticals are orthogonal to signal families: general, fashion/luxury, beauty, business/corporate, technology, automotive, finance/markets, marketing/advertising, retail/commerce and culture/entertainment.

Cross-platform diffusion is calculated across source families and source reliability. TrendHub never sums incomparable raw ranks, likes, views, search-index values or chart positions as one global unit.

## User-experience access policy

The source router is deliberately **zero-config first**.

- `live-public`: usable directly from an official/public endpoint or public page.
- `live-aggregated`: usable directly through an existing permissively licensed aggregation dependency.
- `byo-api`: official/approved API; credentials stay with the user or organization.
- `local-session`: user-authorized browser/cookie/session, local-only; private cookies are never uploaded to the hosted public service.
- `licensed-connector`: partner/commercial source where a safe unrestricted public interface does not exist.
- `adapter-planned`: belongs in the professional source universe but is **not** counted as live coverage until a compliant adapter passes source-health and contract tests.

Onboarding behavior is separate from source access. A source can be zero-config for baseline evidence and still offer optional local-session enhancement. Xiaohongshu follows this pattern: guest evidence stays usable, while a user-authorized local session may unlock richer search/hotlist evidence.

The product must not ask for Cookie/API/OAuth merely because the source exists in the catalog. Credentials are requested only when a user deliberately selects a capability that needs them.

## Priority source universe

### Mainland China — P0/P1

**Social / video / community**

- 小红书、抖音、快手、微博、B站、知乎、微信视频号、微信公众号、今日头条；
- 百度贴吧、豆瓣、虎扑、酷安、大众点评 as secondary/community and commerce context.

**Podcast / audio**

- 小宇宙、喜马拉雅、网易云音乐播客 as core;
- QQ音乐播客、荔枝 as secondary.

**Search / intent / commerce**

- 百度热搜、百度指数、微信指数、百度资讯/新闻、搜狗搜索；
- 天猫、京东 as commerce/discovery sources when approved marketplace or merchant data is available.

**Business / corporate / technology media**

- 财新、第一财经、界面新闻、晚点 LatePost、36氪、虎嗅、钛媒体、IT之家；
- 澎湃、腾讯新闻、网易新闻、新浪新闻 as broad news context.

**Fashion / luxury / beauty / brand media**

- VOGUE China、ELLE China、时尚芭莎 / Harper's BAZAAR China、GQ China、嘉人 Marie Claire China；
- Hypebeast 中文；
- SocialBeta、数英 Digitaling、Morketing、广告门 for brand marketing / campaign intelligence.

### Global / APAC — P0/P1

**Social / video / community**

- YouTube、TikTok、Instagram、Facebook、Threads、X、Reddit;
- LinkedIn、Pinterest、Snapchat、Twitch、Telegram、Discord、WhatsApp Channels where official policy/API access permits.

**Podcast / audio**

- Apple Podcasts、Spotify Podcasts、YouTube podcast/video evidence.

**Search / Web / discovery**

- Google Trends、Google Trending Now、Google News、Bing Search/News、GDELT、NAVER Search/DataLab;
- Common Crawl for long-horizon web/domain evidence, not real-time hotlist ranking;
- brand/company official website, newsroom and investor-relations URLs supplied by the user.

**Fashion / luxury / beauty media**

- Vogue、Vogue Business、The Business of Fashion、WWD、Jing Daily;
- Hypebeast、Highsnobiety、FashionNetwork.com、Glossy.

**Business / finance / technology / marketing media**

- Reuters、Bloomberg、Financial Times、The Wall Street Journal;
- CNBC、Forbes、Fortune、Business Insider;
- TechCrunch、The Verge、WIRED;
- Ad Age、Adweek、Campaign、WARC、Marketing-Interactive.

Sources behind subscriptions/licensing are represented as licensed connectors instead of being silently replaced by brittle private-API scraping.

## Brand / company entity universe

TrendHub now has a separate entity-resolution seed catalog. It is **not** a whitelist. Workspaces may add arbitrary brands, companies, products and aliases.

The seed universe covers high-priority entities across:

- luxury/fashion: LVMH, Louis Vuitton, Dior, Fendi, Celine, Bulgari, Tiffany, Kering, Gucci, Saint Laurent, Bottega Veneta, Chanel, Hermès, Richemont, Cartier, Van Cleef & Arpels, Prada, Miu Miu, Burberry, Moncler;
- sports/fashion/retail: Nike, adidas, lululemon, ANTA, Li-Ning, Inditex/Zara, Fast Retailing/UNIQLO, SHEIN;
- beauty: L'Oréal, Estée Lauder Companies, Shiseido, PROYA;
- technology/internet: Apple, Samsung, Huawei, Xiaomi, OPPO, vivo, ByteDance, Tencent, Alibaba, JD.com;
- automotive/EV: Tesla, BYD, Mercedes-Benz, BMW, Porsche, Audi, NIO, Li Auto, XPeng, Geely, Xiaomi Auto;
- broad consumer benchmarking: Coca-Cola, Starbucks, McDonald's.

Alias resolution supports examples such as `LV -> Louis Vuitton`, `YSL -> Saint Laurent`, `小米 -> Xiaomi`, and `Tesla -> Tesla`. Parent/child links are retained so a group and its brand are not silently double-counted.

## Professional analysis contract

A topic analysis must not say “cross-platform” merely because the same token appears in multiple feeds. The Professional engine exposes:

- brand/company entity resolution and alias context;
- lifecycle: emerging / accelerating / mainstream / saturating / declining;
- velocity and rank movement within each source’s own scale;
- persistence and recurrence;
- source-family diffusion and geographic diffusion;
- source reliability and evidence freshness;
- robust anomaly detection;
- 6/24/48/72h directional forecast only when history and holdout validation are sufficient;
- search-vs-social divergence and lead/lag;
- news confirmation / authority lift;
- creator concentration and creator spread using public evidence only;
- podcast/long-form narrative persistence;
- sentiment/stance with explicit sample size and limitations;
- evidence coverage, uncertainty and caveats;
- alert/event state and executive report outputs linked back to evidence.

No global score may silently mix raw platform ranks, likes, views, search-index values or chart positions as if they share one unit.

## Open-source / self-developed decision rule

1. Prefer official/public APIs and feeds.
2. Reuse permissively licensed, actively maintained open-source adapters when their legal and operational boundary is compatible with TrendHub.
3. Wrap third-party adapters behind TrendHub’s canonical evidence schema; never leak their vendor-specific shape into analysis.
4. If no safe mature adapter exists, implement a minimal self-developed adapter using public/authorized interfaces.
5. Do not adopt reverse-engineered client APIs with non-commercial restrictions as a production dependency.
6. Do not claim unavailable sources as negative evidence. Unavailable, auth-required, rate-limited and stale remain explicit states.
7. Do not make users repeat setup: once an approved local/API/OAuth connector is configured, capability discovery should reuse it until it expires or the user disconnects it.

## Front-end product contract

The professional Web UI is responsive across desktop, tablet and phone. The development branch includes:

- fluid content width instead of a fixed desktop-only canvas;
- mobile safe-area support and dynamic viewport height;
- horizontal touch navigation on phones;
- minimum touch targets for coarse-pointer devices;
- tables that scroll horizontally instead of crushing columns;
- responsive professional metrics, source cards, entity cards and Xiaohongshu cards;
- reduced-motion support.

Desktop and mobile must expose the same information architecture and evidence semantics; mobile is not a reduced or separate product.

## External constraints that code cannot manufacture

- licensed firehose access and proprietary historical archives;
- proprietary demographic panels;
- real-user adoption, retention and business-outcome evidence.

These are tracked separately from engineering completeness and must not be disguised as code-level capability.
