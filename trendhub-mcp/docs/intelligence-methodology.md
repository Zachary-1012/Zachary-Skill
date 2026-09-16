# TrendHub Intelligence Methodology v1

TrendHub separates **evidence**, **deterministic metrics**, and **AI interpretation**. The engine never turns a missing source into synthetic data and never presents a heuristic score as a probability forecast.

## 1. Source Reliability

Each final platform request records only:

- timestamp;
- `dataQuality` (`ok` / `degraded` / `missing`);
- latency in milliseconds;
- returned item count;
- coarse failure class (`auth_required`, `rate_limited`, `schema_drift`, `network`, `upstream`, `other`).

It does **not** store query text, cookies, content bodies, hostnames, usernames, IP addresses, account identifiers, or model prompts.

### Windows

For 24h, 7d and 30d TrendHub reports:

- `okRate = ok / attempts`;
- `usableRate = (ok + degraded) / attempts`;
- average quality where `ok=1`, `degraded=0.5`, `missing=0`;
- P50 and P95 latency.

### Reliability score

The 7-day score is:

`100 × (0.55 × okRate + 0.25 × usableRate + 0.20 × averageQuality)`

The score is operational quality, not a guarantee of future source availability.

### Current status

- `UP`: latest observation is `ok`;
- `DEGRADED`: latest observation is `degraded`;
- `DOWN`: latest observation is `missing` without a more specific class;
- `AUTH_REQUIRED`: latest non-ok observation indicates login/Cookie/auth is required;
- `RATE_LIMITED`: latest non-ok observation indicates rate limiting or platform risk control;
- `UNKNOWN`: no local observations yet.

## 2. Evidence history

Usable hotlist results are retained locally in a bounded 30-day history (maximum 1,500 snapshots per platform). Each history item contains only public trend evidence needed for analysis: timestamp, quality, title, rank, URL, and platform-local hot value.

The existing latest/previous snapshot ring remains unchanged for simple new/rising/dropped alerts.

## 3. Trend Intelligence Engine

The engine evaluates a keyword across selected platforms using the local evidence history.

### Metrics

- **Velocity**: rank improvement per hour where comparable ranks exist, combined with platform-spread velocity.
- **Persistence**: fraction of captured snapshots in which the topic was detected.
- **Diffusion**: share of selected platforms where the topic appears in the latest evidence.
- **Source reliability**: average observed reliability score for the selected sources where history exists.
- **History sufficiency**: evidence-depth score based on the number of accumulated snapshots.
- **Confidence**: deterministic evidence-quality score, not a probability.

Confidence weights:

- current evidence coverage: 25%;
- persistence: 20%;
- diffusion: 15%;
- source reliability: 20%;
- history sufficiency: 20%.

Bands: `high >=75`, `medium >=50`, otherwise `low`.

### Lifecycle states

- `insufficient_history`: not enough local observations for a defensible stage claim;
- `emerging`: recent/limited-platform evidence, not yet broadly diffused;
- `accelerating`: positive rank velocity plus increasing cross-platform spread;
- `mainstream`: multi-platform presence with meaningful persistence;
- `saturating`: broad/persistent presence but limited additional acceleration;
- `declining`: strong negative rank movement or material loss of previously observed platform spread.

Lifecycle is a rule-based analytical label. The calling AI may explain it but must not silently overwrite the evidence or represent it as certain future performance.

## 4. 24h / 72h Lead-time Benchmark

`benchmark_trend_lead` requires:

1. a keyword/topic;
2. an external `reference_time` from a documented ground truth;
3. the platform scope.

Ground truth examples include an official announcement time, a documented mainstream breakout timestamp, or a benchmark timestamp agreed in advance by the team.

TrendHub searches only the history captured **before/around that event** and identifies its earliest matching evidence.

`leadHours = reference_time - earliest_TrendHub_detection`

- positive = TrendHub observed it before the reference event;
- `>=24` = detected at least 24 hours ahead;
- `>=72` = detected at least 72 hours ahead;
- negative = first local evidence came after the reference event;
- no evidence = `insufficient_evidence`.

TrendHub never invents the reference timestamp and should never cherry-pick a reference after seeing the result.

## 5. Quality evaluation without telemetry

Normal TrendHub use emits no third-party telemetry.

`npm run quality:diagnostic` is an explicit, voluntary local action. It produces a sanitized JSON report containing product version, Node major, OS family, source-status counts, aggregate reliability/history depth, and source-level operational summaries. It excludes identity and user content. Nothing is uploaded automatically; sharing is manual opt-in only.

## 6. Evidence hierarchy

When interpreting a result, prefer:

1. current source evidence with `dataQuality=ok`;
2. repeated historical observations;
3. multi-platform confirmation;
4. Google Trends/search confirmation where available;
5. RSS/future signals and event-calendar context;
6. deterministic TrendHub metrics;
7. caller-AI narrative interpretation.

AI narrative is the last layer, not the source of truth.
