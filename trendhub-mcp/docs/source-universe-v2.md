# TrendHub Professional Source Universe v2

Development-only architecture for `dev/professional-intelligence-v2`. This document is not a release claim. Stable production remains v1.4.4.

## Principle

TrendHub does not flatten every platform into one hot-list bucket. Professional Intelligence separates evidence by **signal family** and preserves access/legal boundaries:

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

Cross-platform diffusion must be calculated across these families and source reliability, not by summing incomparable rank/hot values.

## Access modes

- `live-public`: official/public endpoint or public page that TrendHub can read without user credentials.
- `live-aggregated`: existing permissively licensed aggregation dependency; evidence remains source-labelled.
- `byo-api`: official/approved API with credentials supplied by the user/organization.
- `local-session`: user-authorized browser/cookie/session, local-only; never shared by the hosted public service.
- `licensed-connector`: partner/commercial connector where a platform has no safe unrestricted public interface.
- `adapter-planned`: source is in the professional universe but is **not** claimed as live until a compliant adapter passes Source Reliability and contract tests.

## Priority coverage

### Mainland China P0

Social/video/community: 小红书、抖音、快手、微博、B站、知乎、微信视频号、微信公众号、今日头条。

Podcast/audio: 小宇宙、喜马拉雅、网易云音乐播客；QQ音乐播客 and 荔枝 follow as P1.

Search/Web: 百度热搜、百度指数、百度资讯/新闻、微信指数（P1），plus existing mainstream news/tech/community sources.

### Global P0

Social/video: YouTube、TikTok、Instagram、Facebook、Threads、X、Reddit. LinkedIn/Pinterest/Twitch/Telegram are P1 where policy/API access permits.

Podcast/audio: Apple Podcasts、Spotify Podcasts、YouTube podcast/chart evidence.

Search/Web: Google Trends、Google Trending Now、Google News、GDELT. Bing Search/News is BYO API. Common Crawl is long-horizon Web evidence, not a real-time trend source.

## Professional analysis contract

A topic analysis must not say “cross-platform” merely because the same token appears in multiple feeds. The Professional engine should expose:

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

## External constraints that code cannot manufacture

- licensed firehose access and proprietary historical archives;
- proprietary demographic panels;
- real-user adoption, retention and business-outcome evidence.

These are tracked separately from engineering completeness and must not be disguised as code-level capability.
